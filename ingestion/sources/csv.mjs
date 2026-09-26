/**
 * Minimal RFC-4180-ish CSV parser (handles quoted values, escaped quotes, CRLF).
 * Returns an array of row objects keyed by the header row.
 */
export function parseCsv(text) {
  const rows = [];
  let cur = [];
  let val = "";
  let inQ = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          val += '"';
          i++;
        } else {
          inQ = false;
        }
      } else {
        val += c;
      }
    } else if (c === '"') {
      inQ = true;
    } else if (c === ",") {
      cur.push(val);
      val = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      cur.push(val);
      val = "";
      if (cur.length > 1 || cur[0] !== "") rows.push(cur);
      cur = [];
    } else {
      val += c;
    }
  }
  if (val !== "" || cur.length) {
    cur.push(val);
    rows.push(cur);
  }

  const header = rows.shift();
  if (!header) return [];
  return rows.map((r) => Object.fromEntries(header.map((h, idx) => [h, r[idx] ?? ""])));
}
