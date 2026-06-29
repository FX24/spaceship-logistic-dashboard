import { z } from "zod";

/**
 * Canonical schema + types for a logistics order row.
 *
 * The raw dataset (`data/mock_logistics_data.csv`) is all strings; this schema
 * validates and coerces one source row. Derived fields (delivery_days,
 * is_delayed, is_delivered) are computed in `src/lib/db/definitions.ts` and
 * appended to produce an `OrderRecord` (see seed pipeline in `data/seed.ts`).
 */

export const ORDER_STATUSES = [
  "delivered",
  "delayed",
  "in_transit",
  "exception",
  "canceled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "expected an ISO date (YYYY-MM-DD)");

const emptyToNull = (v: unknown) =>
  v === "" || v === null || v === undefined ? null : v;

const truthyFlag = (v: unknown) => v === "1" || v === 1 || v === true || v === "true";

/** Validates + coerces a single raw CSV row (all values arrive as strings). */
export const RawOrderRowSchema = z.object({
  client_id: z.string().min(1),
  order_id: z.string().min(1),
  order_date: dateString,
  delivery_date: z.preprocess(emptyToNull, dateString.nullable()),
  carrier: z.string().min(1),
  origin_city: z.string().min(1),
  destination_city: z.string().min(1),
  status: z.enum(ORDER_STATUSES),
  sku: z.string().min(1),
  product_category: z.string().min(1),
  quantity: z.coerce.number().int().nonnegative(),
  unit_price_usd: z.coerce.number().nonnegative(),
  order_value_usd: z.coerce.number().nonnegative(),
  is_promo: z.preprocess(truthyFlag, z.boolean()),
  promo_discount_pct: z.coerce.number().min(0).max(100),
  region: z.string().min(1),
  warehouse: z.string().min(1),
});

export type RawOrder = z.infer<typeof RawOrderRowSchema>;

/** A fully normalized order: validated source fields + derived analytics fields. */
export type OrderRecord = RawOrder & {
  /** Whole days from order_date to delivery_date; null when not yet delivered. */
  delivery_days: number | null;
  /** status === "delayed" (the dataset carries an explicit outcome). */
  is_delayed: boolean;
  /** status === "delivered". */
  is_delivered: boolean;
};
