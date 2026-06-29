# Step 3 — Analytics Backend (`query_analytics`)

**Maps to grading:** Data correctness (20%) + Backend & Architecture (20%).
**Depends on:** Step 2.
**Est. effort:** 2 hr.

## Goal

A deterministic `query_analytics` function that turns **structured args** into a **parameterized SQL
query**, plus a fixed set of KPI calculations for the dashboard. This is the workhorse both the
dashboard and the AI call. No AI in this step — it's plain backend you can unit-test.

## The contract (CLAUDE.md §6.A)

```ts
// input (validated by Zod — see step 5 for where the AI fills this)
type QueryArgs = {
  metric: 'order_count' | 'delayed_count' | 'on_time_rate' | 'avg_delivery_days';
  dimensions: ('carrier' | 'destination' | 'sku' | 'status')[];   // group-by
  filters: { field: string; op: '='|'!='|'in'|'>='|'<='; value: unknown }[];
  timeRange?: { from: string; to: string } | { lastMonths: number } | { preset: 'last_month' };
  granularity?: 'day' | 'week' | 'month';                          // time bucketing
};

// output
type QueryResult = {
  rows: Record<string, unknown>[];   // the computed data
  chartSpec: { type: 'line'|'bar'|'pie'; x: string; y: string };  // step 7 renders this
  queryPlan: { sql: string; params: unknown[]; resolvedFilters: ... }; // explainability (§7)
};
```

## Steps

1. **Build a safe query builder** (`src/lib/db/queryBuilder.ts`): map each allowed `metric`,
   `dimension`, `granularity`, and `filter.field` to **whitelisted SQL fragments**. The AI's strings
   never get concatenated into SQL — they only *select* from a fixed allow-list; values go in as
   bound `?` params. This is how we satisfy "no raw AI SQL" (brief §9) while staying dynamic.
2. **Implement `query_analytics`** (`src/lib/tools/queryAnalytics.ts`): validate args → build SQL →
   run → shape rows → attach `chartSpec` (rule: has time granularity → `line`; categorical dim →
   `bar`; single-dim proportion → `pie`) → attach `queryPlan` for explainability.
3. **Implement the dashboard KPIs** (`src/lib/tools/kpis.ts`): total orders, delivered, delayed,
   on-time rate, avg delivery time — each a small parameterized query reusing the step-2 definitions.
4. **Expose `GET /api/kpis`** returning all KPIs + the 2–3 dashboard chart datasets in one payload.
5. **Unit tests** (bonus but cheap here): feed known args, assert known numbers against the seed data.
   This is where forecasting/aggregation correctness points are cheaply locked in.

## Why a whitelisted builder (not string SQL, not an ORM)

The brief's #1 rule is *the model must not run raw SQL*. The builder is the enforcement boundary:
**structured args in → only pre-approved SQL fragments + bound params out.** An invalid metric/field
is rejected by Zod (step 5) before it ever reaches SQL. This is the architectural centerpiece graders
look for under "AI is not the source of truth."

## Definition of done

- [ ] `query_analytics(args)` returns correct rows for: delayed-by-week, delay-rate-by-carrier, count-last-month.
- [ ] `chartSpec` auto-selected correctly for time-series vs categorical vs proportion.
- [ ] `queryPlan` includes the exact SQL + params + resolved filters.
- [ ] `GET /api/kpis` returns all 5 KPIs + chart datasets.
- [ ] A few unit tests pass against the seeded data.
