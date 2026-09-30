/**
 * LiveBench source (scores + cost).
 *
 * livebench.ai is a CRA site that loads, per release:
 *   table_<YYYY_MM_DD>.csv     one row per model, one column per task  (scores)
 *   categories_<YYYY_MM_DD>.json  task -> category mapping
 *   cost_<YYYY_MM_DD>.csv      one row per model with price/token columns
 * (Verified live 26/09/2026; release list read from the site bundle.)
 *
 * adapter-ingestion is JSON-only by design, so the fetchImpl transforms are
 * deterministic CSV -> JSON:
 *  - scores: UNPIVOT to long format, one item per (model, task) — new tasks in
 *    future releases are picked up without editing the adapter map.
 *  - cost: one item per model with the price columns.
 * Fixtures mirror the TRANSFORMED shapes.
 */
import { parseCsv } from "./csv.mjs";

export const RELEASE = "2026-06-25";

export function scoresUrl(release) {
  return `https://livebench.ai/table_${release.replaceAll("-", "_")}.csv`;
}

export function costUrl(release) {
  return `https://livebench.ai/cost_${release.replaceAll("-", "_")}.csv`;
}

export const SCORES_URL = scoresUrl(RELEASE);
export const COST_URL = costUrl(RELEASE);

const num = (v) => {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export function makeScoresFetchImpl(release = RELEASE) {
  return async (url, opts = {}) => {
    const res = await fetch(url, { ...opts, headers: { "User-Agent": "model-bench-ingest" } });
    if (!res.ok) return res;
    const rows = parseCsv(await res.text());
    const items = [];
    for (const row of rows) {
      const model = String(row.model || "").trim();
      if (!model) continue;
      for (const [task, raw] of Object.entries(row)) {
        if (task === "model") continue;
        const score = num(raw);
        if (score == null) continue;
        items.push({
          source_id: `${model}::${task}`,
          record_url: `https://livebench.ai/#${release}`,
          model,
          task,
          score,
          release,
        });
      }
    }
    return new Response(JSON.stringify(items), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
}

export function makeCostFetchImpl(release = RELEASE) {
  return async (url, opts = {}) => {
    const res = await fetch(url, { ...opts, headers: { "User-Agent": "model-bench-ingest" } });
    if (!res.ok) return res;
    const rows = parseCsv(await res.text());
    const items = [];
    for (const row of rows) {
      const model = String(row.model || "").trim();
      if (!model) continue;
      items.push({
        source_id: model,
        record_url: `https://livebench.ai/#cost-${release}`,
        model,
        input_price_per_million: num(row.input_price_per_million),
        output_price_per_million: num(row.output_price_per_million),
        cost_per_question: num(row.cost_per_question),
        avg_input_tokens: num(row.avg_input_tokens),
        avg_output_tokens: num(row.avg_output_tokens),
        release,
      });
    }
    return new Response(JSON.stringify(items), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
}

export async function discoverLatestRelease(fetchImpl = fetch) {
  try {
    const homeRes = await fetchImpl("https://livebench.ai/", {
      headers: { "User-Agent": "model-bench-ingest" },
    });
    if (!homeRes.ok) return null;
    const html = await homeRes.text();
    const match = html.match(/\/static\/js\/main\.[a-zA-Z0-9._-]+\.js/);
    if (!match) return null;
    const jsUrl = new URL(match[0], "https://livebench.ai/").href;
    const jsRes = await fetchImpl(jsUrl, {
      headers: { "User-Agent": "model-bench-ingest" },
    });
    if (!jsRes.ok) return null;
    const jsText = await jsRes.text();
    const dateMatches = jsText.match(/20\d\d[-_]\d\d[-_]\d\d/g) || [];
    const dates = Array.from(new Set(dateMatches.map((d) => d.replaceAll("_", "-"))));
    dates.sort((a, b) => b.localeCompare(a));
    for (const d of dates.slice(0, 10)) {
      try {
        const tableRes = await fetchImpl(scoresUrl(d), {
          headers: { "User-Agent": "model-bench-ingest" },
        });
        if (tableRes.ok) {
          const body = await tableRes.text();
          if (body.startsWith("model")) {
            return d;
          }
        }
      } catch {
        // continue trying
      }
    }
    return null;
  } catch {
    return null;
  }
}

/** Transforms used for fixture capture from the downloaded CSV text. */
export function transformScoresCsv(text, release = RELEASE) {
  return parseCsv(text).flatMap((row) => {
    const model = String(row.model || "").trim();
    if (!model) return [];
    return Object.entries(row)
      .filter(([task, raw]) => task !== "model" && num(raw) != null)
      .map(([task, raw]) => ({
        source_id: `${model}::${task}`,
        record_url: `https://livebench.ai/#${release}`,
        model,
        task,
        score: num(raw),
        release,
      }));
  });
}

export function transformCostCsv(text, release = RELEASE) {
  return parseCsv(text)
    .map((row) => {
      const model = String(row.model || "").trim();
      if (!model) return null;
      return {
        source_id: model,
        record_url: `https://livebench.ai/#cost-${release}`,
        model,
        input_price_per_million: num(row.input_price_per_million),
        output_price_per_million: num(row.output_price_per_million),
        cost_per_question: num(row.cost_per_question),
        avg_input_tokens: num(row.avg_input_tokens),
        avg_output_tokens: num(row.avg_output_tokens),
        release,
      };
    })
    .filter(Boolean);
}
