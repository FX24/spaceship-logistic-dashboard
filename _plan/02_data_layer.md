# Step 2 — Data Layer (schema, seed, definitions) — ✅ DONE

**Maps to grading:** **Data correctness (20%)** — the single biggest category. Get this right.
**Depends on:** Step 1, and the dataset file (`data/mock_logistics_data.csv`, 400 rows — present).
**Est. effort:** 1–1.5 hr.

> **Resolved against the real dataset (differs from the original assumptions below):**
> - The CSV has **no `promised_date`**, but carries an explicit `status`. So "delayed" is read from
>   `status`, NOT computed as `delivered_at > promised_at`.
> - **Delayed = `status='delayed'` only**; on-time rate = delivered / (delivered+delayed); avg
>   delivery time over rows with a non-null `delivery_date`. (See `src/lib/db/definitions.ts`.)
> - Driver = **`node:sqlite`** (built-in, Node ≥ 24), in-memory, built from a committed JSON artifact
>   — not a persistent `.db` file. `npm run seed` does CSV → Zod-validate → `src/lib/db/dataset.json`.
> - CSV has quoted commas (`"London, UK"`) → a real parser (`data/csv.ts`), not naive split.
> - Verified numbers: 400 orders, delivered 304, delayed 55, on-time 84.7%, avg 3.83 days.
>
> Original plan text retained below for context.

## Goal

The provided dataset loaded once into a SQLite table via a seed script, with the **business rules**
("delayed", "on-time", "delivery time") defined in exactly one place and documented.

## Steps

1. **Inspect the real dataset** (CSV/JSON in `data/`). Identify columns. Expected logistics shape:
   `order_id, sku, carrier, origin, destination, order_date, ship_date, promised_date, delivered_date, status, quantity`.
   Adjust everything below to the true columns.
2. **Define the table** in `data/schema.sql` — typed columns, store dates as ISO `TEXT`
   (`YYYY-MM-DD`) so SQLite date functions work, plus a couple of indexes on `order_date`, `carrier`.
3. **Write `data/seed.ts`** (`npm run seed`): read the file, parse, validate each row, `INSERT`
   inside a single transaction. Idempotent: `DROP TABLE IF EXISTS` then recreate, so re-running is safe.
4. **Derive computed fields once** during seed (or as SQL expressions): `is_delayed`,
   `delivery_days`. Doing this at seed time keeps query SQL simple and the definition centralized.
5. **Write `src/lib/db/connection.ts`** — opens the SQLite file read-only at runtime, exports a
   singleton `db`.

## The definitions that decide correctness (document these in README)

Put these in one module/comment block and reuse everywhere:

- **Delivered:** `delivered_date IS NOT NULL` (or `status = 'delivered'`).
- **Delayed:** `delivered_date > promised_date`. An order not yet delivered but already past
  `promised_date` — decide explicitly: count as delayed, or only judge delivered orders? **Document
  the choice.** Simplest defensible rule: delayed = delivered late OR (undelivered AND now > promised).
- **On-time delivery rate:** `on_time_delivered / delivered_total` (rate is over *delivered* orders,
  not all orders — state this).
- **Average delivery time:** `AVG(delivered_date - order_date)` in days, over delivered orders only.
- **Date boundaries:** "last month" = the previous full calendar month. Pick a timezone (UTC is
  fine for a take-home) and apply it consistently. Watch off-by-one at month/week edges.

> These edge cases (null deliveries, late-but-undelivered, month boundaries, timezone) are exactly
> where data-correctness points are won or lost. Encode each as a tested SQL expression, not ad-hoc.

## Key decisions

- **Compute `is_delayed`/`delivery_days` at seed time** → queries stay trivial and the rule lives once.
- **Read-only at runtime** — open the DB connection read-only; the app never writes. (Brief §4.5.)

## Definition of done

- [ ] `npm run seed` loads the dataset into SQLite, idempotently.
- [ ] Row count and a few spot-checked records match the source file.
- [ ] "Delayed", "on-time rate", "avg delivery time", "last month" each defined in one place + documented.
- [ ] A throwaway script can `SELECT COUNT(*)` and a sample aggregate successfully.
