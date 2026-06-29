# Step 4 — Forecasting Backend (`forecast_demand`)

**Maps to grading:** Forecasting (10%).
**Depends on:** Step 2 (historical series), Step 3 (query patterns).
**Est. effort:** 1.5–2 hr.

## Goal

A deterministic `forecast_demand` function: build a historical demand series from the dataset,
project it forward with a **basic** method, and return a forecast + an inventory recommendation +
a plain-language methodology note. Pure backend math — no AI, no external ML libs.

## The contract (CLAUDE.md §6.B)

```ts
type ForecastArgs = {
  target: { sku?: string; series: 'orders' | 'quantity' };  // what to forecast
  horizon: number;                                          // e.g. 4 (months)
  method?: 'moving_average' | 'linear_regression';          // default: pick per data
};

type ForecastResult = {
  history:  { period: string; value: number }[];   // monthly aggregates from the dataset
  forecast: { period: string; value: number; lower?: number; upper?: number }[];
  inventory: { recommendedUnits: number; rationale: string };
  methodology: string;   // plain-language explanation (required by brief)
  queryPlan: ...;        // explainability: how history was aggregated
};
```

## Steps

1. **Build the history**: aggregate the chosen series by month (reuse the step-3 builder) for the
   target SKU/series → an ordered array of `{period, value}`.
2. **Implement methods** (`src/lib/forecast/methods.ts`), keep them tiny and readable:
   - **Moving average** — average of last *k* periods, carried forward. Robust, dead simple.
   - **Linear regression** — least-squares fit on the time index, extrapolate `horizon` steps.
     Captures trend, which a logistics grader expects to see.
   - Default: linear regression if a clear trend exists, else moving average (document the rule).
3. **Inventory recommendation**: a transparent formula, e.g.
   `recommendedUnits = forecast_total_over_horizon + safety_stock`, where
   `safety_stock = z * historical_std`. State the assumptions (z, lead time) in the rationale — the
   brief wants reasoning, not a sophisticated supply-chain model.
4. **Methodology note**: 2–3 sentences naming the method, the window/fit, and the inventory logic.
   This is graded directly ("explanation of methodology").
5. **Tests**: on a synthetic increasing series, regression slope > 0 and forecast increases.

## Key decisions

- **No ML library.** Moving average + least-squares regression are a few lines each; the brief
  explicitly lists these as acceptable and says don't over-engineer.
- **Forecast on monthly buckets** (matches "next N months" phrasing) unless the data is too sparse,
  then weekly — document whichever you pick.

## Definition of done

- [ ] `forecast_demand` returns history + forecast for a given SKU and horizon.
- [ ] Inventory recommendation present with a stated formula and assumptions.
- [ ] Methodology string reads clearly to a non-technical reviewer.
- [ ] Forecast values come only from historical dataset data (no model-invented numbers).
