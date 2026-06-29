/**
 * Safe, whitelisted query builder.
 *
 * The AI emits structured args (metric, dimensions, filters, timeRange,
 * granularity). This module maps those to pre-approved SQL fragments and
 * bound parameters. The AI's strings NEVER get concatenated into SQL — they
 * only select from fixed allow-lists. Values always go in as bound params.
 *
 * See CLAUDE.md §2 and _plan/03_analytics_backend.md.
 */
import type {
  QueryArgs,
  Filter,
  TimeRange,
  ChartSpec,
  ResolvedTimeRange,
  QueryPlan,
} from "@/lib/schemas/analytics";

// ---------------------------------------------------------------------------
// Allow-lists (the only SQL fragments that will ever reach the database)
// ---------------------------------------------------------------------------

const METRIC_EXPR: Record<string, string> = {
  order_count: "COUNT(*)",
  delayed_count: "SUM(is_delayed)",
  delivered_count: "SUM(is_delivered)",
  delay_rate:
    "ROUND(100.0 * SUM(is_delayed) / NULLIF(COUNT(*), 0), 1)",
  on_time_rate:
    "ROUND(100.0 * SUM(is_delivered) / NULLIF(SUM(is_delivered) + SUM(is_delayed), 0), 1)",
  avg_delivery_days: "ROUND(AVG(delivery_days), 2)",
  order_value_total: "ROUND(SUM(order_value_usd), 2)",
  quantity_total: "SUM(quantity)",
};

const METRIC_LABEL: Record<string, string> = {
  order_count: "Order Count",
  delayed_count: "Delayed Orders",
  delivered_count: "Delivered Orders",
  delay_rate: "Delay Rate (%)",
  on_time_rate: "On-Time Rate (%)",
  avg_delivery_days: "Avg Delivery Days",
  order_value_total: "Order Value (USD)",
  quantity_total: "Quantity",
};

const DIMENSION_COL: Record<string, string> = {
  carrier: "carrier",
  destination_city: "destination_city",
  product_category: "product_category",
  region: "region",
  status: "status",
  warehouse: "warehouse",
};

const GRANULARITY_EXPR: Record<string, string> = {
  day: "order_date",
  week: "strftime('%Y-W%W', order_date)",
  month: "strftime('%Y-%m', order_date)",
};

const FILTER_COL: Record<string, string> = {
  carrier: "carrier",
  destination_city: "destination_city",
  product_category: "product_category",
  region: "region",
  status: "status",
  warehouse: "warehouse",
  order_date: "order_date",
  delivery_date: "delivery_date",
};

const SAFE_OPS = new Set(["=", "!=", ">=", "<="]);

// ---------------------------------------------------------------------------
// Date helpers (UTC calendar arithmetic, no library dependencies)
// ---------------------------------------------------------------------------

function startOfMonth(dateStr: string): string {
  return dateStr.slice(0, 7) + "-01";
}

function addCalendarMonths(dateStr: string, months: number): string {
  const [y, m] = dateStr.split("-").map(Number);
  let newM = m + months;
  let newY = y;
  while (newM > 12) {
    newM -= 12;
    newY++;
  }
  while (newM < 1) {
    newM += 12;
    newY--;
  }
  return `${newY}-${String(newM).padStart(2, "0")}-01`;
}

function lastDayOfMonth(yearMonthDayStr: string): string {
  const [y, m] = yearMonthDayStr.split("-").map(Number);
  const d = new Date(Date.UTC(y, m, 0)); // day 0 = last day of prev month
  return d.toISOString().slice(0, 10);
}

export function resolveTimeRange(
  tr: TimeRange | undefined,
  maxDate: string,
): ResolvedTimeRange | null {
  if (!tr) return null;

  if ("from" in tr) {
    return { from: tr.from, to: tr.to };
  }

  if ("lastMonths" in tr) {
    const from = startOfMonth(addCalendarMonths(maxDate, -tr.lastMonths));
    return { from, to: maxDate };
  }

  // preset
  switch (tr.preset) {
    case "last_month": {
      const prevMonthStart = addCalendarMonths(maxDate, -1);
      return {
        from: prevMonthStart,
        to: lastDayOfMonth(prevMonthStart),
      };
    }
    case "last_3_months": {
      return {
        from: startOfMonth(addCalendarMonths(maxDate, -3)),
        to: maxDate,
      };
    }
    case "last_6_months": {
      return {
        from: startOfMonth(addCalendarMonths(maxDate, -6)),
        to: maxDate,
      };
    }
    case "all":
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// ChartSpec inference
// ---------------------------------------------------------------------------

export function inferChartSpec(args: QueryArgs): ChartSpec {
  const label = METRIC_LABEL[args.metric] ?? args.metric;

  if (args.granularity) {
    return { type: "line", xKey: "period", yKey: "value", label };
  }
  if (args.dimensions.length === 1) {
    if (
      args.metric === "on_time_rate" ||
      args.metric === "delay_rate"
    ) {
      return { type: "bar", xKey: args.dimensions[0], yKey: "value", label };
    }
    return { type: "bar", xKey: args.dimensions[0], yKey: "value", label };
  }
  return { type: "bar", xKey: args.dimensions[0] ?? "value", yKey: "value", label };
}

// ---------------------------------------------------------------------------
// Core builder
// ---------------------------------------------------------------------------

type BuiltQuery = {
  sql: string;
  params: (string | number | null)[];
};

function buildFilterClause(
  filters: Filter[],
  resolvedTr: ResolvedTimeRange | null,
): { clauses: string[]; params: (string | number | null)[] } {
  const clauses: string[] = [];
  const params: (string | number | null)[] = [];

  if (resolvedTr) {
    clauses.push("order_date >= ?", "order_date <= ?");
    params.push(resolvedTr.from, resolvedTr.to);
  }

  for (const f of filters) {
    const col = FILTER_COL[f.field];
    if (!col) continue; // Zod already validated the field

    if (f.op === "in") {
      const vals = Array.isArray(f.value)
        ? f.value
        : [String(f.value)];
      const placeholders = vals.map(() => "?").join(", ");
      clauses.push(`${col} IN (${placeholders})`);
      params.push(...vals);
    } else if (SAFE_OPS.has(f.op)) {
      clauses.push(`${col} ${f.op} ?`);
      params.push(typeof f.value === "number" ? f.value : String(f.value));
    }
  }

  return { clauses, params };
}

export function buildQuery(
  args: QueryArgs,
  maxDate: string,
): BuiltQuery & { resolvedTimeRange: ResolvedTimeRange | null } {
  const metricExpr = METRIC_EXPR[args.metric];
  if (!metricExpr) throw new Error(`Unknown metric: ${args.metric}`);

  const resolvedTr = resolveTimeRange(args.timeRange, maxDate);
  const { clauses: filterClauses, params } = buildFilterClause(
    args.filters,
    resolvedTr,
  );

  const selectParts: string[] = [`${metricExpr} AS value`];
  const groupByParts: string[] = [];

  // Dimensions
  for (const dim of args.dimensions) {
    const col = DIMENSION_COL[dim];
    if (!col) throw new Error(`Unknown dimension: ${dim}`);
    selectParts.push(col);
    groupByParts.push(col);
  }

  // Granularity (time bucketing)
  if (args.granularity) {
    const expr = GRANULARITY_EXPR[args.granularity];
    if (!expr) throw new Error(`Unknown granularity: ${args.granularity}`);
    selectParts.push(`${expr} AS period`);
    groupByParts.push(expr);
  }

  const where = filterClauses.length
    ? `WHERE ${filterClauses.join(" AND ")}`
    : "";
  const groupBy = groupByParts.length
    ? `GROUP BY ${groupByParts.join(", ")}`
    : "";
  const orderBy = args.granularity
    ? "ORDER BY period"
    : args.dimensions.length
      ? "ORDER BY value DESC"
      : "";

  const sql = [
    `SELECT ${selectParts.join(", ")}`,
    "FROM orders",
    where,
    groupBy,
    orderBy,
  ]
    .filter(Boolean)
    .join(" ");

  return { sql, params, resolvedTimeRange: resolvedTr };
}

export function buildQueryPlan(
  args: QueryArgs,
  built: BuiltQuery & { resolvedTimeRange: ResolvedTimeRange | null },
): QueryPlan {
  return {
    metric: args.metric,
    dimensions: args.dimensions,
    granularity: args.granularity,
    filters: args.filters,
    resolvedTimeRange: built.resolvedTimeRange,
    sql: built.sql,
    params: built.params,
  };
}
