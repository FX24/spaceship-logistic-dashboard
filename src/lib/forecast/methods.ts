/**
 * Stateless, deterministic forecasting methods.
 *
 * All inputs and outputs are plain numbers. No ML library; the brief explicitly
 * accepts moving average and linear regression.
 */
import type { InventoryRecommendation, ForecastMethod } from "@/lib/schemas/forecast";

// ---------------------------------------------------------------------------
// Descriptive stats
// ---------------------------------------------------------------------------

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

export function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((s, v) => s + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

// ---------------------------------------------------------------------------
// Moving average — window = min(k, n) periods, constant projection
// ---------------------------------------------------------------------------

const MA_WINDOW = 3;

export function movingAverage(
  history: number[],
  horizon: number,
): { values: number[]; window: number } {
  const window = Math.min(MA_WINDOW, history.length);
  const tail = history.slice(-window);
  const avg = mean(tail);
  return {
    values: Array(horizon).fill(Math.round(avg * 10) / 10),
    window,
  };
}

// ---------------------------------------------------------------------------
// Linear regression — ordinary least squares
// ---------------------------------------------------------------------------

type RegressionModel = {
  slope: number;
  intercept: number;
  predict: (x: number) => number;
};

export function linearRegression(history: number[]): RegressionModel {
  const n = history.length;
  if (n < 2) {
    // degenerate: no trend, flat at the single value
    const v = history[0] ?? 0;
    return { slope: 0, intercept: v, predict: () => v };
  }

  // xs = 0, 1, ..., n-1
  const sumX = (n * (n - 1)) / 2; // Σ 0..n-1
  const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6; // Σ x²
  const sumY = history.reduce((s, v) => s + v, 0);
  const sumXY = history.reduce((s, v, i) => s + i * v, 0);

  const denom = n * sumX2 - sumX ** 2;
  const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  return {
    slope: Math.round(slope * 100) / 100,
    intercept: Math.round(intercept * 100) / 100,
    predict: (x: number) => Math.max(0, intercept + slope * x),
  };
}

/** Project `horizon` future steps, starting at x = n (next after last history index). */
export function lrForecast(history: number[], horizon: number): number[] {
  const model = linearRegression(history);
  const n = history.length;
  return Array.from({ length: horizon }, (_, i) =>
    Math.round(model.predict(n + i) * 10) / 10,
  );
}

// ---------------------------------------------------------------------------
// Auto-select: detect trend signal strength
// ---------------------------------------------------------------------------

const TREND_THRESHOLD = 0.10; // |slope| / mean > 10% → linear_regression

export function selectMethod(history: number[]): "moving_average" | "linear_regression" {
  if (history.length < 3) return "moving_average";
  const model = linearRegression(history);
  const m = mean(history);
  if (m === 0) return "moving_average";
  return Math.abs(model.slope) / m > TREND_THRESHOLD
    ? "linear_regression"
    : "moving_average";
}

// ---------------------------------------------------------------------------
// Inventory recommendation (transparent formula, stated assumptions)
// ---------------------------------------------------------------------------

const LEAD_TIME_MONTHS = 1;
const Z_95 = 1.645; // 95% service level

export function inventoryRecommendation(
  forecastValues: number[],
  historyValues: number[],
  methodUsed: ForecastMethod,
): InventoryRecommendation {
  const forecastTotal = Math.round(forecastValues.reduce((s, v) => s + v, 0));
  const avgMonthly = mean(forecastValues);
  const sigma = stdDev(historyValues);
  const safetyStock = Math.ceil(Z_95 * sigma);
  const recommended = Math.ceil(avgMonthly * LEAD_TIME_MONTHS + safetyStock);

  const rationale =
    `Method: ${methodUsed === "auto" ? "auto-selected" : methodUsed}. ` +
    `Avg monthly forecast: ${avgMonthly.toFixed(1)} units. ` +
    `Safety stock = z × σ = ${Z_95} × ${sigma.toFixed(1)} = ${safetyStock} units ` +
    `(95% service level, ${LEAD_TIME_MONTHS}-month lead time). ` +
    `Recommended = ⌈avg × lead_time + safety_stock⌉ = ${recommended} units/month.`;

  return { recommendedUnits: recommended, forecastTotal, safetyStock, rationale };
}
