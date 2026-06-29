import { z } from "zod";

export const FORECAST_METHODS = [
  "moving_average",
  "linear_regression",
  "auto",
] as const;

/**
 * Structured args the AI fills for forecast_demand.
 *
 * target: "overall" → aggregate all orders; any product_category name
 *         (BOOK, BRUSH, CRAYON, MARKER, PAINT, PAPER, PENCIL, STICKER) → that
 *         category only. Per-SKU forecasting is not supported — too sparse
 *         (~1 order per SKU in the dataset).
 * horizon: months ahead to forecast (1–12).
 * method:  "auto" lets the tool pick based on trend signal strength.
 */
export const ForecastArgsSchema = z.object({
  target: z.string().default("overall"),
  horizon: z.number().int().min(1).max(12),
  method: z.enum(FORECAST_METHODS).default("auto"),
});

export type ForecastArgs = z.infer<typeof ForecastArgsSchema>;
export type ForecastMethod = (typeof FORECAST_METHODS)[number];

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

export type ForecastPoint = { period: string; value: number };

export type CombinedPoint = ForecastPoint & { isForecast: boolean };

export type InventoryRecommendation = {
  recommendedUnits: number;
  forecastTotal: number;
  safetyStock: number;
  rationale: string;
};

export type ForecastResult = {
  target: string;
  history: ForecastPoint[];
  forecast: ForecastPoint[];
  combined: CombinedPoint[];
  inventory: InventoryRecommendation;
  methodology: string;
  queryPlan: {
    target: string;
    methodRequested: string;
    methodUsed: string;
    horizon: number;
    historicalPeriods: number;
    historicalSql: string;
  };
};
