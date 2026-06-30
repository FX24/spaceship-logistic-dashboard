/**
 * Business-rule helpers — UTC date math and derived-field logic in
 * src/lib/db/definitions.ts. Run with: npm test
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { daysBetween, deriveFields } from "@/lib/db/definitions";

test("daysBetween: whole UTC days, no timezone drift", () => {
  assert.equal(daysBetween("2025-01-01", "2025-01-04"), 3);
  assert.equal(daysBetween("2025-01-01", "2025-01-01"), 0);
  assert.equal(daysBetween("2025-02-28", "2025-03-01"), 1); // 2025 not a leap year
});

test("deriveFields: delayed only when status='delayed' (exception is NOT delayed)", () => {
  assert.equal(deriveFields({ order_date: "2025-01-01", delivery_date: "2025-01-05", status: "delayed" }).is_delayed, true);
  assert.equal(deriveFields({ order_date: "2025-01-01", delivery_date: "2025-01-05", status: "exception" }).is_delayed, false);
  assert.equal(deriveFields({ order_date: "2025-01-01", delivery_date: "2025-01-05", status: "delivered" }).is_delivered, true);
});

test("deriveFields: delivery_days is null when there is no delivery_date", () => {
  const r = deriveFields({ order_date: "2025-01-01", delivery_date: null, status: "in_transit" });
  assert.equal(r.delivery_days, null);
  assert.equal(r.is_delivered, false);
});

test("deriveFields: delivery_days counts days from order to delivery", () => {
  const r = deriveFields({ order_date: "2025-06-10", delivery_date: "2025-06-14", status: "delivered" });
  assert.equal(r.delivery_days, 4);
});
