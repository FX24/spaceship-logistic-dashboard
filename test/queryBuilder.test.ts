/**
 * Query builder correctness — date-range resolution, parameterized SQL, and
 * chart inference in src/lib/db/queryBuilder.ts. No AI, no DB; pure functions.
 * Run with: npm test
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  resolveTimeRange,
  buildQuery,
  inferChartSpec,
} from "@/lib/db/queryBuilder";
import type { QueryArgs } from "@/lib/schemas/analytics";

const MAX_DATE = "2025-12-31";

test("resolveTimeRange: last_month = previous full calendar month", () => {
  assert.deepEqual(resolveTimeRange({ preset: "last_month" }, MAX_DATE), {
    from: "2025-11-01",
    to: "2025-11-30",
  });
});

test("resolveTimeRange: last_3_months spans from start-of-month to maxDate", () => {
  assert.deepEqual(resolveTimeRange({ preset: "last_3_months" }, MAX_DATE), {
    from: "2025-09-01",
    to: "2025-12-31",
  });
});

test("resolveTimeRange: lastMonths uses calendar arithmetic", () => {
  assert.deepEqual(resolveTimeRange({ lastMonths: 2 }, MAX_DATE), {
    from: "2025-10-01",
    to: "2025-12-31",
  });
});

test("resolveTimeRange: explicit from/to passes through; 'all' and undefined are null", () => {
  assert.deepEqual(
    resolveTimeRange({ from: "2025-01-01", to: "2025-06-30" }, MAX_DATE),
    { from: "2025-01-01", to: "2025-06-30" },
  );
  assert.equal(resolveTimeRange({ preset: "all" }, MAX_DATE), null);
  assert.equal(resolveTimeRange(undefined, MAX_DATE), null);
});

test("buildQuery: groups by dimension, orders by value desc, no params when unfiltered", () => {
  const args: QueryArgs = {
    metric: "delay_rate",
    dimensions: ["carrier"],
    filters: [],
  };
  const built = buildQuery(args, MAX_DATE);
  assert.match(built.sql, /SUM\(is_delayed\)/);
  assert.match(built.sql, /GROUP BY carrier/);
  assert.match(built.sql, /ORDER BY value DESC/);
  assert.deepEqual(built.params, []);
});

test("buildQuery: filters and time range bind as ordered parameters (no string interpolation)", () => {
  const args: QueryArgs = {
    metric: "order_count",
    dimensions: [],
    filters: [{ field: "carrier", op: "=", value: "DHL" }],
    timeRange: { preset: "last_month" },
  };
  const built = buildQuery(args, MAX_DATE);
  assert.match(built.sql, /order_date >= \?/);
  assert.match(built.sql, /order_date <= \?/);
  assert.match(built.sql, /carrier = \?/);
  // time-range params first, then filter value — all bound, never inlined
  assert.deepEqual(built.params, ["2025-11-01", "2025-11-30", "DHL"]);
  assert.ok(!built.sql.includes("DHL"));
});

test("buildQuery: 'in' filter expands to one placeholder per value", () => {
  const args: QueryArgs = {
    metric: "order_count",
    dimensions: [],
    filters: [{ field: "status", op: "in", value: ["delivered", "delayed"] }],
  };
  const built = buildQuery(args, MAX_DATE);
  assert.match(built.sql, /status IN \(\?, \?\)/);
  assert.deepEqual(built.params, ["delivered", "delayed"]);
});

test("buildQuery: throws on an unknown metric (allow-list enforcement)", () => {
  const bad = { metric: "drop_table", dimensions: [], filters: [] } as unknown as QueryArgs;
  assert.throws(() => buildQuery(bad, MAX_DATE), /Unknown metric/);
});

test("inferChartSpec: granularity -> line; single dimension -> bar", () => {
  assert.equal(
    inferChartSpec({ metric: "order_count", dimensions: [], filters: [], granularity: "month" }).type,
    "line",
  );
  assert.equal(
    inferChartSpec({ metric: "delay_rate", dimensions: ["carrier"], filters: [] }).type,
    "bar",
  );
});
