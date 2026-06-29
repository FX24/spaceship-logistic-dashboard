import { z } from "zod";

// ---------------------------------------------------------------------------
// Shared param types
// ---------------------------------------------------------------------------

export const METRIC = [
  "order_count",
  "delayed_count",
  "delivered_count",
  "delay_rate",
  "on_time_rate",
  "avg_delivery_days",
  "order_value_total",
  "quantity_total",
] as const;

export const DIMENSION = [
  "carrier",
  "destination_city",
  "product_category",
  "region",
  "status",
  "warehouse",
] as const;

export const GRANULARITY = ["day", "week", "month"] as const;

const FILTER_FIELD = [
  "carrier",
  "destination_city",
  "product_category",
  "region",
  "status",
  "warehouse",
  "order_date",
  "delivery_date",
] as const;

const FILTER_OP = ["=", "!=", ">=", "<=", "in"] as const;

const TIME_PRESET = ["last_month", "last_3_months", "last_6_months", "all"] as const;

// ---------------------------------------------------------------------------
// QueryArgs — the structured input the AI fills; validated with Zod before use
// ---------------------------------------------------------------------------

export const FilterSchema = z.object({
  field: z.enum(FILTER_FIELD),
  op: z.enum(FILTER_OP),
  value: z.union([z.string(), z.number(), z.array(z.string())]),
});

export const TimeRangeSchema = z.union([
  z.object({ from: z.string(), to: z.string() }),
  z.object({ lastMonths: z.number().int().min(1).max(24) }),
  z.object({ preset: z.enum(TIME_PRESET) }),
]);

export const QueryArgsSchema = z.object({
  metric: z.enum(METRIC),
  dimensions: z.array(z.enum(DIMENSION)).max(3),
  filters: z.array(FilterSchema).max(5),
  timeRange: TimeRangeSchema.optional(),
  granularity: z.enum(GRANULARITY).optional(),
});

export type QueryArgs = z.infer<typeof QueryArgsSchema>;
export type Filter = z.infer<typeof FilterSchema>;
export type TimeRange = z.infer<typeof TimeRangeSchema>;

// ---------------------------------------------------------------------------
// QueryResult — what query_analytics returns (AI reads this to compose answer)
// ---------------------------------------------------------------------------

export type ChartSpec = {
  type: "line" | "bar" | "pie";
  xKey: string;
  yKey: string;
  label: string;
};

export type ResolvedTimeRange = { from: string; to: string };

export type QueryPlan = {
  metric: string;
  dimensions: string[];
  granularity?: string;
  filters: Filter[];
  resolvedTimeRange: ResolvedTimeRange | null;
  sql: string;
  params: (string | number | null)[];
};

export type QueryResult = {
  rows: Record<string, unknown>[];
  chartSpec: ChartSpec;
  queryPlan: QueryPlan;
};

// ---------------------------------------------------------------------------
// KPI / dashboard types (fixed queries — no AI needed)
// ---------------------------------------------------------------------------

export type KpiData = {
  totalOrders: number;
  deliveredOrders: number;
  delayedOrders: number;
  onTimeRatePct: number;
  avgDeliveryDays: number;
};

export type DashboardData = {
  kpis: KpiData;
  charts: {
    orderVolumeByMonth: { period: string; value: number }[];
    deliveryPerformanceByMonth: { period: string; delivered: number; delayed: number }[];
    delayRateByCarrier: { carrier: string; delay_rate: number; total: number }[];
  };
};
