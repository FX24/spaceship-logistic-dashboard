/**
 * Forecasting correctness — pure deterministic functions in src/lib/forecast/methods.ts.
 * Run with: npm test
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  mean,
  stdDev,
  movingAverage,
  linearRegression,
  lrForecast,
  selectMethod,
  inventoryRecommendation,
} from "@/lib/forecast/methods";

test("mean: average of values, 0 for empty", () => {
  assert.equal(mean([1, 2, 3]), 2);
  assert.equal(mean([]), 0);
});

test("stdDev: sample standard deviation (n-1), 0 for <2 values", () => {
  assert.equal(stdDev([1, 2, 3]), 1); // variance = (1+0+1)/2 = 1
  assert.equal(stdDev([5]), 0);
});

test("movingAverage: window = min(3, n), flat projection of the tail mean", () => {
  const { values, window } = movingAverage([10, 20, 30, 40], 2);
  assert.equal(window, 3);
  assert.deepEqual(values, [30, 30]); // mean of last 3 = (20+30+40)/3 = 30
});

test("linearRegression: recovers slope/intercept of a perfect line", () => {
  const m = linearRegression([1, 2, 3, 4]); // y = 1 + 1*x
  assert.equal(m.slope, 1);
  assert.equal(m.intercept, 1);
  assert.equal(m.predict(4), 5);
});

test("linearRegression: predictions are clamped to >= 0", () => {
  const m = linearRegression([10, 7, 4, 1]); // downward slope
  assert.ok(m.predict(100) >= 0);
});

test("lrForecast: extrapolates the fitted line for the horizon", () => {
  assert.deepEqual(lrForecast([1, 2, 3, 4], 2), [5, 6]);
});

test("selectMethod: linear_regression when trend > 10% of mean, else moving_average", () => {
  assert.equal(selectMethod([1, 2, 3, 4]), "linear_regression"); // slope 1 / mean 2.5 = 40%
  assert.equal(selectMethod([50, 50, 50]), "moving_average"); // flat
  assert.equal(selectMethod([10, 20]), "moving_average"); // < 3 points
});

test("inventoryRecommendation: recommended = ceil(avg + z*sigma)", () => {
  // history [80,120,100] -> mean 100, sample sigma 20; z95 = 1.645
  const inv = inventoryRecommendation([100, 100, 100], [80, 120, 100], "moving_average");
  assert.equal(inv.forecastTotal, 300);
  assert.equal(inv.safetyStock, 33); // ceil(1.645 * 20) = ceil(32.9)
  assert.equal(inv.recommendedUnits, 133); // ceil(100 + 33)
  assert.match(inv.rationale, /Safety stock/);
});
