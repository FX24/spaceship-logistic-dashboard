/**
 * Minimal RFC 4180-style CSV parser. Handles quoted fields, embedded commas
 * (e.g. "London, UK"), escaped quotes ("") and CRLF/LF line endings. Sufficient
 * and dependency-free for the provided dataset; not a general-purpose library.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++; // skip the escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") {
      field += c;
    }
  }

  // flush trailing field/row when the file has no final newline
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // drop blank trailing lines
  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ""));
}
