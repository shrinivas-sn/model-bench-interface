/**
 * One key per model across every source, and the list of models the picker offers.
 *
 * Sources name models differently, and OpenRouter (the canonical registry) does not
 * list every model. `model_key` is the canonical id when there is one; otherwise
 * `name:<key>` from the model's own name, so two sources that spell a model the
 * same way still join. A name that points at two different canonical models is
 * ambiguous and never joined (never guessed).
 */
import { stripEffort } from "./effort.mjs";
import { vendorFor } from "./registry.mjs";
import { splitEffort } from "../ingestion/sources/artificial-analysis.mjs";

/** Lowercase letters and digits only, without an `org/` prefix. */
export function nameKey(name) {
  const s = String(name || "").toLowerCase();
  const bare = s.includes("/") ? s.slice(s.lastIndexOf("/") + 1) : s;
  return bare.replace(/[^a-z0-9]/g, "");
}

const SOURCES = [
  ["livebench", (r) => stripEffort(r.benchmark_name)],
  ["terminal_bench", (r) => r.model_label],
  ["artificial_analysis", (r) => splitEffort(r.name).base],
];

/** Sets `model_key` on every LiveBench, Terminal-Bench and AA row, in place. */
export function linkModelKeys(data) {
  const byName = new Map(); // nameKey -> Set(canonical)
  const remember = (key, canonical) => {
    if (!key || !canonical) return;
    if (!byName.has(key)) byName.set(key, new Set());
    byName.get(key).add(canonical);
  };
  for (const [source, nameOf] of SOURCES) {
    for (const r of data[source] || []) {
      remember(nameKey(nameOf(r)), r.canonical_id);
      remember(nameKey(r.canonical_id), r.canonical_id);
    }
  }
  for (const [source, nameOf] of SOURCES) {
    for (const r of data[source] || []) {
      if (r.canonical_id) {
        r.model_key = r.canonical_id;
        continue;
      }
      const key = nameKey(nameOf(r));
      const hits = byName.get(key);
      r.model_key = hits && hits.size === 1 ? [...hits][0] : key ? `name:${key}` : null;
    }
  }
  return data;
}

const DAY_MS = 86_400_000;
const lab = (canonicalId) => (canonicalId && canonicalId.includes("/") ? canonicalId.split("/")[0] : null);

/**
 * Models the picker lists: every LiveBench model, plus models no LiveBench release
 * has scored yet that are important by the data's own signals (no model names):
 *  - on the Terminal-Bench leaderboard, or
 *  - scored by Artificial Analysis, priced on OpenRouter, from a lab LiveBench
 *    tracks, and released within `recentDays`.
 * Added models carry no LiveBench scores (`on_livebench: false`).
 *
 * @param {{ livebench: object[], terminal_bench: object[], artificial_analysis: object[], catalog: object[] }} data
 * @param {{ now?: string|Date, recentDays?: number }} [opts]
 */
export function pickerModels(data, { now = new Date(), recentDays = 180 } = {}) {
  const livebench = data.livebench || [];
  const catalog = new Map((data.catalog || []).map((c) => [c.id, c]));
  const onLivebench = new Set(livebench.map((m) => m.model_key).filter(Boolean));
  const labs = new Set(livebench.map((m) => lab(m.canonical_id)).filter(Boolean));
  const nowMs = new Date(now).getTime();

  const candidates = new Map(); // model_key -> { tb: row[], aa: row[] }
  const add = (row, kind) => {
    const key = row.model_key;
    if (!key || !row.canonical_id || onLivebench.has(key)) return;
    if (!candidates.has(key)) candidates.set(key, { tb: [], aa: [] });
    candidates.get(key)[kind].push(row);
  };
  for (const r of data.terminal_bench || []) add(r, "tb");
  for (const r of data.artificial_analysis || []) add(r, "aa");

  const taken = new Set(livebench.map((m) => m.benchmark_name));
  const added = [];
  for (const [key, { tb, aa }] of candidates) {
    const c = catalog.get(key);
    const newest = Math.max(...aa.map((r) => (r.release_date ? Date.parse(r.release_date) : 0)), 0);
    const recentAa =
      aa.length > 0 && c && labs.has(lab(key)) && newest > 0 && nowMs - newest <= recentDays * DAY_MS;
    if (!tb.length && !recentAa) continue;

    let slug = key.split("/").pop();
    if (taken.has(slug)) slug = key.replace("/", "-");
    taken.add(slug);
    const newestAa = [...aa].sort((a, b) => String(b.release_date).localeCompare(String(a.release_date)))[0];
    const display_name =
      (newestAa && splitEffort(newestAa.name).base) ||
      tb[0]?.model_label ||
      (c?.title || key).replace(/^[^:]+:\s*/, "");

    added.push({
      benchmark_name: slug,
      display_name,
      canonical_id: key,
      model_key: key,
      alias_method: null,
      vendor: vendorFor(key),
      display_vendor: vendorFor(key),
      family_id: key,
      effort: null,
      thinking: false,
      overall: null,
      tasks: {},
      categories: {},
      cost: null,
      pricing:
        c && c.input_per_million != null
          ? { input_per_million: c.input_per_million, output_per_million: c.output_per_million, source: "openrouter" }
          : null,
      context_length: c?.context_length ?? null,
      supported_efforts: c?.supported_efforts ?? null,
      default_effort: c?.default_effort ?? null,
      on_livebench: false,
    });
  }
  added.sort((a, b) => a.benchmark_name.localeCompare(b.benchmark_name));
  return [...livebench.map((m) => ({ ...m, on_livebench: true })), ...added];
}
