/**
 * End-to-end aggregation correctness against the committed dataset.
 *
 * Loads dataset.json into the in-memory SQLite DB (the real runtime path) and
 * checks the KPI reference numbers from CLAUDE.md §8. Run with: npm test
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { getDashboardData } from "@/lib/tools/kpis";

test("dashboard KPIs match the reference numbers (400 / 304 / 55 / 84.7% / 3.83d)", () => {
  const { kpis } = getDashboardData();
  assert.equal(kpis.totalOrders, 400);
  assert.equal(kpis.deliveredOrders, 304);
  assert.equal(kpis.delayedOrders, 55);
  assert.equal(kpis.onTimeRatePct, 84.7);
  assert.equal(kpis.avgDeliveryDays, 3.83);
});

test("dashboard charts are populated with the expected shapes", () => {
  const { charts } = getDashboardData();
  assert.equal(charts.orderVolumeByMonth.length, 12); // Jan–Dec 2025
  assert.equal(charts.deliveryPerformanceByMonth.length, 12);
  assert.ok(charts.onTimeRateByCarrier.length >= 1);

  // On-time rate by carrier is sorted best-first and within 0–100.
  const rates = charts.onTimeRateByCarrier.map((c) => c.on_time_rate);
  for (let i = 1; i < rates.length; i++) {
    assert.ok(rates[i - 1] >= rates[i], "carriers should be sorted by on_time_rate desc");
  }
  for (const r of rates) assert.ok(r >= 0 && r <= 100);
});
