/**
 * Dashboard KPI + chart dataset computations.
 *
 * Fixed deterministic queries — no AI involved. Business rules from
 * definitions.ts are applied here via the same RULES constants the query
 * builder uses (single source of truth).
 */
import { getDb } from "@/lib/db/connection";
import { RULES } from "@/lib/db/definitions";
import type { DashboardData } from "@/lib/schemas/analytics";

function one<T>(sql: string, ...params: (string | number | null)[]): T {
  const db = getDb();
  return db.prepare(sql).get(...(params as Parameters<ReturnType<typeof db.prepare>["get"]>)) as T;
}

function all<T>(sql: string, ...params: (string | number | null)[]): T[] {
  const db = getDb();
  return db.prepare(sql).all(...(params as Parameters<ReturnType<typeof db.prepare>["all"]>)) as T[];
}

function computeKpis() {
  const { total } = one<{ total: number }>("SELECT COUNT(*) AS total FROM orders");

  const { delivered } = one<{ delivered: number }>(
    `SELECT COUNT(*) AS delivered FROM orders WHERE ${RULES.delivered}`,
  );

  const { delayed } = one<{ delayed: number }>(
    `SELECT COUNT(*) AS delayed FROM orders WHERE ${RULES.delayed}`,
  );

  const { pct } = one<{ pct: number }>(
    `SELECT ROUND(100.0 * AVG(is_delivered), 1) AS pct
     FROM orders WHERE ${RULES.concludedDelivery}`,
  );

  const { avg_days } = one<{ avg_days: number }>(
    `SELECT ROUND(AVG(delivery_days), 2) AS avg_days
     FROM orders WHERE ${RULES.hasDelivery}`,
  );

  return {
    totalOrders: total,
    deliveredOrders: delivered,
    delayedOrders: delayed,
    onTimeRatePct: pct,
    avgDeliveryDays: avg_days,
  };
}

function computeCharts() {
  // 1. Order volume by month (line chart)
  const orderVolumeByMonth = all<{ period: string; value: number }>(
    `SELECT strftime('%Y-%m', order_date) AS period, COUNT(*) AS value
     FROM orders GROUP BY period ORDER BY period`,
  );

  // 2. Delivery performance by month — delivered vs delayed (bar chart)
  const deliveryPerformanceByMonth = all<{
    period: string;
    delivered: number;
    delayed: number;
  }>(
    `SELECT strftime('%Y-%m', order_date) AS period,
            SUM(is_delivered) AS delivered,
            SUM(is_delayed)   AS delayed
     FROM orders WHERE ${RULES.concludedDelivery}
     GROUP BY period ORDER BY period`,
  );

  // 3. On-time rate by carrier — best (highest) first.
  // Denominator = concluded deliveries only (delivered + delayed), matching KPI rule.
  const onTimeRateByCarrier = all<{
    carrier: string;
    on_time_rate: number;
    total: number;
  }>(
    `SELECT carrier,
            COUNT(*) AS total,
            COALESCE(ROUND(100.0 * SUM(is_delivered) / NULLIF(SUM(is_delivered) + SUM(is_delayed), 0), 1), 0) AS on_time_rate
     FROM orders GROUP BY carrier ORDER BY on_time_rate DESC`,
  );

  return { orderVolumeByMonth, deliveryPerformanceByMonth, onTimeRateByCarrier };
}

/** Returns all data needed to render the dashboard in one call. */
export function getDashboardData(): DashboardData {
  return {
    kpis: computeKpis(),
    charts: computeCharts(),
  };
}
