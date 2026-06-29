/**
 * Seed pipeline (run once via `npm run seed`).
 *
 * Reads the provided dataset, validates + normalizes every row with Zod,
 * computes derived analytics fields, and writes a committed JSON artifact at
 * `src/lib/db/dataset.json`. The app imports that artifact as a module and
 * loads it into an in-memory SQLite database at runtime (see connection.ts).
 *
 * Why a JSON artifact instead of reading the CSV at runtime: a module import is
 * guaranteed to be bundled by Next.js (no file-tracing surprises on Vercel),
 * keeps the runtime free of CSV-parsing code, and makes the seed step explicit.
 *
 * The raw CSV remains the read-only source of truth; we never mutate it.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { RawOrderRowSchema, type OrderRecord } from "../src/lib/schemas/order";
import { deriveFields } from "../src/lib/db/definitions";
import { parseCsv } from "./csv";

const ROOT = process.cwd();
const CSV_PATH = join(ROOT, "data", "mock_logistics_data.csv");
const OUT_PATH = join(ROOT, "src", "lib", "db", "dataset.json");

function main() {
  const text = readFileSync(CSV_PATH, "utf8");
  const matrix = parseCsv(text);
  if (matrix.length < 2) {
    console.error("Dataset appears empty.");
    process.exit(1);
  }

  const header = matrix[0].map((h) => h.trim());
  const dataRows = matrix.slice(1);

  const records: OrderRecord[] = [];
  const errors: string[] = [];

  dataRows.forEach((cells, idx) => {
    const lineNo = idx + 2; // +1 for header, +1 for 1-based lines
    const obj = Object.fromEntries(header.map((h, j) => [h, cells[j]]));
    const parsed = RawOrderRowSchema.safeParse(obj);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      errors.push(`  line ${lineNo}: ${issue.path.join(".")} — ${issue.message}`);
      return;
    }
    records.push({ ...parsed.data, ...deriveFields(parsed.data) });
  });

  if (errors.length > 0) {
    console.error(`Validation failed for ${errors.length} row(s):`);
    console.error(errors.slice(0, 20).join("\n"));
    process.exit(1);
  }

  writeFileSync(OUT_PATH, JSON.stringify(records));

  // Summary so the seed is self-verifying at a glance.
  const byStatus = records.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});
  const delivered = byStatus["delivered"] ?? 0;
  const delayed = byStatus["delayed"] ?? 0;
  const onTimeRate = delivered + delayed > 0 ? delivered / (delivered + delayed) : 0;

  console.log(`Seeded ${records.length} orders -> ${OUT_PATH}`);
  console.log("By status:", byStatus);
  console.log(`On-time delivery rate: ${(onTimeRate * 100).toFixed(1)}%`);
}

main();
