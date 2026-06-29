/**
 * query_analytics — deterministic analytics tool.
 *
 * Validates structured args (Zod) → builds a whitelisted parameterized SQL
 * query → runs it → returns rows + chartSpec + queryPlan (explainability).
 *
 * The AI layer (step 5) calls this function with args it constructed. This
 * function is also called directly by the dashboard routes (no AI involved).
 * The model never runs SQL; it only fills the QueryArgs.
 */
import { getDb } from "@/lib/db/connection";
import {
  buildQuery,
  buildQueryPlan,
  inferChartSpec,
} from "@/lib/db/queryBuilder";
import { QueryArgsSchema } from "@/lib/schemas/analytics";
import type { QueryArgs, QueryResult } from "@/lib/schemas/analytics";

let cachedMaxDate: string | null = null;

function getMaxDate(): string {
  if (cachedMaxDate) return cachedMaxDate;
  const db = getDb();
  const row = db.prepare("SELECT MAX(order_date) AS d FROM orders").get() as {
    d: string;
  };
  cachedMaxDate = row.d;
  return cachedMaxDate;
}

/** Validates args, runs the query, and returns a full QueryResult. */
export function queryAnalytics(rawArgs: unknown): QueryResult {
  const args: QueryArgs = QueryArgsSchema.parse(rawArgs);
  const maxDate = getMaxDate();
  const built = buildQuery(args, maxDate);
  const queryPlan = buildQueryPlan(args, built);

  const db = getDb();
  const stmt = db.prepare(built.sql);
  const rows = stmt.all(
    ...(built.params as Parameters<typeof stmt.all>),
  ) as Record<string, unknown>[];

  const chartSpec = inferChartSpec(args);

  return { rows, chartSpec, queryPlan };
}
