/**
 * forecast_demand — deterministic demand forecasting tool.
 *
 * Aggregates historical monthly quantity from the dataset, applies a basic
 * method (moving average or linear regression), and returns a forecast with
 * an inventory recommendation and methodology explanation.
 *
 * Target: "overall" or any product_category in the dataset.
 * Per-SKU forecasting is unsupported — too sparse (~1 order/SKU).
 * See _plan/04_forecasting_backend.md.
 */
import { getDb } from "@/lib/db/connection";
import { ForecastArgsSchema } from "@/lib/schemas/forecast";
import type { ForecastArgs, ForecastResult, ForecastPoint, CombinedPoint } from "@/lib/schemas/forecast";
import {
  movingAverage,
  lrForecast,
  linearRegression,
  selectMethod,
  inventoryRecommendation,
  mean,
} from "@/lib/forecast/methods";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Advance a YYYY-MM string by one month. */
function nextPeriod(period: string): string {
  const [y, m] = period.split("-").map(Number);
  const nm = m === 12 ? 1 : m + 1;
  const ny = m === 12 ? y + 1 : y;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}

/** Generate all YYYY-MM strings from `from` to `to` (inclusive). */
function monthRange(from: string, to: string): string[] {
  const months: string[] = [];
  let cur = from;
  while (cur <= to) {
    months.push(cur);
    cur = nextPeriod(cur);
  }
  return months;
}

/** Validates a category name against the dataset (case-insensitive). */
let knownCategories: string[] | null = null;
function getKnownCategories(): string[] {
  if (knownCategories) return knownCategories;
  const db = getDb();
  const rows = db
    .prepare("SELECT DISTINCT product_category FROM orders ORDER BY product_category")
    .all() as { product_category: string }[];
  knownCategories = rows.map((r) => r.product_category);
  return knownCategories;
}

// ---------------------------------------------------------------------------
// History query
// ---------------------------------------------------------------------------

function queryHistory(args: ForecastArgs): {
  points: ForecastPoint[];
  sql: string;
} {
  const db = getDb();
  const isOverall = args.target === "overall";

  const sql = isOverall
    ? `SELECT strftime('%Y-%m', order_date) AS period, SUM(quantity) AS value
       FROM orders GROUP BY period ORDER BY period`
    : `SELECT strftime('%Y-%m', order_date) AS period, SUM(quantity) AS value
       FROM orders WHERE product_category = ? GROUP BY period ORDER BY period`;

  const rows: { period: string; value: number }[] = isOverall
    ? (db.prepare(sql).all() as { period: string; value: number }[])
    : (db.prepare(sql).all(args.target) as { period: string; value: number }[]);

  if (rows.length === 0) return { points: [], sql };

  // Fill gaps with 0 (months with no orders for this target)
  const minPeriod = rows[0].period;
  const maxPeriod = rows[rows.length - 1].period;
  const byPeriod = new Map(rows.map((r) => [r.period, r.value]));
  const allMonths = monthRange(minPeriod, maxPeriod);
  const points: ForecastPoint[] = allMonths.map((p) => ({
    period: p,
    value: byPeriod.get(p) ?? 0,
  }));

  return { points, sql };
}

// ---------------------------------------------------------------------------
// Main tool
// ---------------------------------------------------------------------------

export function forecastDemand(rawArgs: unknown): ForecastResult {
  const args: ForecastArgs = ForecastArgsSchema.parse(rawArgs);

  // Validate target
  if (args.target !== "overall") {
    const known = getKnownCategories();
    const upper = args.target.toUpperCase();
    const match = known.find((c) => c.toUpperCase() === upper);
    if (!match) {
      throw new Error(
        `Unknown target "${args.target}". Supported: "overall", ${known.map((c) => `"${c}"`).join(", ")}.`,
      );
    }
    args.target = match; // normalize casing
  }

  const { points: history, sql: historicalSql } = queryHistory(args);

  if (history.length === 0) {
    throw new Error(`No historical data found for target "${args.target}".`);
  }

  const histValues = history.map((p) => p.value);

  // Method selection
  const methodRequested = args.method;
  const methodUsed: "moving_average" | "linear_regression" =
    args.method === "auto" ? selectMethod(histValues) : args.method;

  // Generate forecast values
  let forecastValues: number[];
  if (methodUsed === "linear_regression") {
    forecastValues = lrForecast(histValues, args.horizon);
  } else {
    forecastValues = movingAverage(histValues, args.horizon).values;
  }

  // Build forecast periods (start one month after last history period)
  const lastHistPeriod = history[history.length - 1].period;
  const forecastPeriods: string[] = [];
  let cur = nextPeriod(lastHistPeriod);
  for (let i = 0; i < args.horizon; i++) {
    forecastPeriods.push(cur);
    cur = nextPeriod(cur);
  }

  const forecast: ForecastPoint[] = forecastPeriods.map((period, i) => ({
    period,
    value: forecastValues[i],
  }));

  // Combined series for the chart (history + forecast)
  const combined: CombinedPoint[] = [
    ...history.map((p) => ({ ...p, isForecast: false })),
    ...forecast.map((p) => ({ ...p, isForecast: true })),
  ];

  // Inventory recommendation
  const inventory = inventoryRecommendation(forecastValues, histValues, methodUsed);

  // Methodology explanation
  const model = linearRegression(histValues);
  const histMean = mean(histValues);
  const methodDescription =
    methodUsed === "linear_regression"
      ? `Linear regression (OLS) over ${history.length} months of historical data. ` +
        `Detected slope: ${model.slope > 0 ? "+" : ""}${model.slope} units/month ` +
        `(${Math.abs(model.slope / histMean * 100).toFixed(1)}% trend relative to mean of ${histMean.toFixed(1)}). ` +
        `Forecast extrapolates the fitted trend line.`
      : `Moving average over the last ${Math.min(3, histValues.length)} months ` +
        `of historical data (mean = ${histMean.toFixed(1)} units/month). ` +
        `Trend signal below 10% threshold — flat projection chosen for stability.`;

  const methodology =
    `${methodDescription} ` +
    `Inventory recommendation: ${inventory.rationale}`;

  return {
    target: args.target,
    history,
    forecast,
    combined,
    inventory,
    methodology,
    queryPlan: {
      target: args.target,
      methodRequested,
      methodUsed,
      horizon: args.horizon,
      historicalPeriods: history.length,
      historicalSql,
    },
  };
}
