import type { OrderStatus } from "@/lib/schemas/order";

/**
 * SINGLE SOURCE OF TRUTH for business rules. Documented here, reused by the
 * seed pipeline and every analytics query. See README + CLAUDE.md §8.
 *
 * Dataset reality: there is NO promised/SLA date column, but each order carries
 * an explicit `status`. So delivery outcomes are read from `status`, not derived
 * from a promised-vs-actual comparison.
 *
 * Decisions (locked):
 *  - Delayed       = status = 'delayed'  (ONLY; 'exception' is not counted as delayed).
 *  - Delivered     = status = 'delivered'.
 *  - On-time rate  = delivered / (delivered + delayed)   — denominator is concluded
 *                    deliveries; in_transit / canceled / exception are excluded.
 *  - Avg delivery  = AVG(delivery_days) over rows that actually have a delivery_date
 *                    (delivered, delayed, and exception all carry one).
 *  - Total orders  = COUNT(*) (every placed order, including canceled).
 *  - Dates are treated as UTC calendar dates (no intraday timezone in the data).
 */

/** Reusable, parameter-free SQL predicates (constants — never built from user input). */
export const RULES = {
  delivered: `status = 'delivered'`,
  delayed: `status = 'delayed'`,
  /** Denominator for on-time delivery rate. */
  concludedDelivery: `status IN ('delivered', 'delayed')`,
  /** Rows with a realized transit time. */
  hasDelivery: `delivery_date IS NOT NULL`,
} as const;

/** Whole days between two ISO (YYYY-MM-DD) dates, computed in UTC to avoid TZ drift. */
export function daysBetween(startIso: string, endIso: string): number {
  const [ys, ms, ds] = startIso.split("-").map(Number);
  const [ye, me, de] = endIso.split("-").map(Number);
  const start = Date.UTC(ys, ms - 1, ds);
  const end = Date.UTC(ye, me - 1, de);
  return Math.round((end - start) / 86_400_000);
}

/** Computes the derived analytics fields for one validated source row. */
export function deriveFields(row: {
  order_date: string;
  delivery_date: string | null;
  status: OrderStatus;
}): { delivery_days: number | null; is_delayed: boolean; is_delivered: boolean } {
  return {
    delivery_days: row.delivery_date
      ? daysBetween(row.order_date, row.delivery_date)
      : null,
    is_delayed: row.status === "delayed",
    is_delivered: row.status === "delivered",
  };
}
