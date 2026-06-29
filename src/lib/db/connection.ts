import { DatabaseSync } from "node:sqlite";

import type { OrderRecord } from "@/lib/schemas/order";
import dataset from "./dataset.json";

/**
 * Read-only analytics database.
 *
 * The seed artifact (`dataset.json`) is loaded into an in-memory SQLite
 * database the first time the DB is needed, then cached for the lifetime of the
 * server process. We use SQLite (via the built-in `node:sqlite`, zero external
 * deps) so that aggregations run as real, parameterized SQL — the app never
 * mutates the data.
 */

const COLUMNS = [
  "client_id",
  "order_id",
  "order_date",
  "delivery_date",
  "carrier",
  "origin_city",
  "destination_city",
  "status",
  "sku",
  "product_category",
  "quantity",
  "unit_price_usd",
  "order_value_usd",
  "is_promo",
  "promo_discount_pct",
  "region",
  "warehouse",
  "delivery_days",
  "is_delayed",
  "is_delivered",
] as const;

let cached: DatabaseSync | null = null;

function build(): DatabaseSync {
  const db = new DatabaseSync(":memory:");

  db.exec(`
    CREATE TABLE orders (
      client_id          TEXT,
      order_id           TEXT PRIMARY KEY,
      order_date         TEXT NOT NULL,
      delivery_date      TEXT,
      carrier            TEXT,
      origin_city        TEXT,
      destination_city   TEXT,
      status             TEXT NOT NULL,
      sku                TEXT,
      product_category   TEXT,
      quantity           INTEGER,
      unit_price_usd     REAL,
      order_value_usd    REAL,
      is_promo           INTEGER,
      promo_discount_pct REAL,
      region             TEXT,
      warehouse          TEXT,
      delivery_days      INTEGER,
      is_delayed         INTEGER,
      is_delivered       INTEGER
    );
  `);

  const placeholders = COLUMNS.map(() => "?").join(", ");
  const insert = db.prepare(
    `INSERT INTO orders (${COLUMNS.join(", ")}) VALUES (${placeholders})`,
  );

  const rows = dataset as unknown as OrderRecord[];
  db.exec("BEGIN");
  for (const r of rows) {
    insert.run(
      r.client_id,
      r.order_id,
      r.order_date,
      r.delivery_date,
      r.carrier,
      r.origin_city,
      r.destination_city,
      r.status,
      r.sku,
      r.product_category,
      r.quantity,
      r.unit_price_usd,
      r.order_value_usd,
      r.is_promo ? 1 : 0,
      r.promo_discount_pct,
      r.region,
      r.warehouse,
      r.delivery_days,
      r.is_delayed ? 1 : 0,
      r.is_delivered ? 1 : 0,
    );
  }
  db.exec("COMMIT");

  db.exec(`
    CREATE INDEX idx_orders_order_date ON orders(order_date);
    CREATE INDEX idx_orders_carrier ON orders(carrier);
    CREATE INDEX idx_orders_category ON orders(product_category);
  `);

  return db;
}

/** Returns the cached, read-only in-memory analytics database. */
export function getDb(): DatabaseSync {
  if (!cached) cached = build();
  return cached;
}
