#!/usr/bin/env node
/**
 * Read all JSONL stores (adapter-ingestion, append-only) and emit the compact
 * data/scores.json the Next.js app imports at build time.
 *
 * Contract decisions (see DOCS/CONTEXT/DECISIONS.md):
 *  - OpenRouter model ids are canonical; benchmark names alias into them.
 *  - Per-benchmark comparison only — NO cross-benchmark averaging.
 *  - Every alias match records its method; unmatched names are REPORTED, never guessed.
 */
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readLatestRecords } from "@shrinivas-sn/adapter-ingestion/store";
import { buildAliasIndex, resolveAlias, vendorFor, VENDORS } from "./registry.mjs";
import { LIVEBENCH_CATEGORIES, capabilityForLivebenchCategory } from "./categories.mjs";
import { parseEffort, stripEffort } from "./effort.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function storePath(name) {
  return join(ROOT, "store", `${name}.jsonl`);
}

function fieldsOf(rec) {
  return rec.fields ?? rec;
}

// ---------- OpenRouter: the canonical registry ----------
async function buildCatalog() {
  const recs = existsSync(storePath("openrouter"))
    ? await readLatestRecords(storePath("openrouter"))
    : [];
  const models = new Map();
  for (const rec of recs) {
    const f = fieldsOf(rec);
    const id = f.source_id || rec.source_id;
    if (!id) continue;
    // OpenRouter's "-1" pricing = unknown -> null.
    // Its `pricing.prompt` is dollars per TOKEN; normalise to per-million here
    // so every price in `scores.json` shares one unit (see the pricing join below).
    const perMillion = (v) =>
      v == null || v < 0 ? null : Number((v * 1e6).toFixed(4));
    const supported_efforts =
      Array.isArray(f.reasoning?.supported_efforts) && f.reasoning.supported_efforts.length > 0
        ? f.reasoning.supported_efforts
        : Array.isArray(f.supported_parameters) && f.supported_parameters.includes("reasoning_effort")
        ? ["max", "high", "medium", "low"]
        : null;
    models.set(id, {
      id,
      title: f.title || id,
      vendor: vendorFor(id),
      context_length: f.context_length ?? null,
      input_per_million: perMillion(f.prompt_price),
      output_per_million: perMillion(f.completion_price),
      supported_efforts,
      default_effort: f.reasoning?.default_effort ?? null,
      benchmarks: f.benchmarks || null,
    });
  }
  return models;
}

// ---------- LiveBench: scores + cost ----------
async function livebenchModels(aliasIndex) {
  const recs = existsSync(storePath("livebench-scores"))
    ? await readLatestRecords(storePath("livebench-scores"))
    : [];
  const costRecs = existsSync(storePath("livebench-cost"))
    ? await readLatestRecords(storePath("livebench-cost"))
    : [];

  const costByModel = new Map();
  for (const rec of costRecs) {
    const f = fieldsOf(rec);
    const raw = rec.raw || {};
    if (!f.model) continue;
    costByModel.set(f.model, {
      input_price_per_million: f.input_price_per_million ?? null,
      output_price_per_million: f.output_price_per_million ?? null,
      cost_per_question: f.cost_per_question ?? null,
      avg_input_tokens: raw.avg_input_tokens ?? null,
      avg_output_tokens: raw.avg_output_tokens ?? null,
    });
  }

  const byModel = new Map(); // benchmark model -> Map(task -> score)
  for (const rec of recs) {
    const f = fieldsOf(rec);
    const model = f.model;
    const task = f.task;
    const score = f.score;
    if (!model || !task || score == null) continue;
    if (!byModel.has(model)) byModel.set(model, new Map());
    byModel.get(model).set(task, score);
  }

  const unmatched = [];
  const models = [];
  for (const [benchModel, tasks] of byModel) {
    const hit = resolveAlias(aliasIndex, benchModel);
    if (!hit) unmatched.push(benchModel);

    const taskObj = {};
    const catScores = {};
    for (const [task, score] of tasks) {
      taskObj[task] = score;
      const cat = Object.entries(LIVEBENCH_CATEGORIES).find(([, ts]) => ts.includes(task))?.[0];
      if (!cat) continue;
      catScores[cat] = catScores[cat] || { sum: 0, count: 0 };
      catScores[cat].sum += score;
      catScores[cat].count += 1;
    }
    const categories = {};
    for (const [cat, agg] of Object.entries(catScores)) {
      categories[capabilityForLivebenchCategory(cat) || cat] = Number((agg.sum / agg.count).toFixed(2));
    }

    const { effort, thinking } = parseEffort(benchModel);
    const family_id = hit?.canonical ?? stripEffort(benchModel);
    const display_vendor = vendorFor(hit?.canonical ?? benchModel);

    models.push({
      benchmark_name: benchModel,
      canonical_id: hit?.canonical ?? null,
      alias_method: hit?.method ?? null,
      vendor: hit?.canonical ? vendorFor(hit.canonical) : "unmatched",
      display_vendor,
      family_id,
      effort,
      thinking,
      tasks: taskObj,
      categories,
      cost: costByModel.get(benchModel) || null,
    });
  }
  return { models, unmatched };
}

// ---------- SWE-bench Verified ----------
async function sweBenchRows(aliasIndex) {
  const recs = existsSync(storePath("swe-bench-verified"))
    ? await readLatestRecords(storePath("swe-bench-verified"))
    : [];
  const rows = [];
  const missingModelDisplay = [];
  for (const rec of recs) {
    const f = fieldsOf(rec);
    const systemName = f.title || f.source_id;
    const sourceName = [f.model_org, f.model_display].filter(Boolean).join(" ");
    const hit = sourceName
      ? resolveAlias(aliasIndex, sourceName) || resolveAlias(aliasIndex, f.model_display || "")
      : null;
    if (!f.model_display) missingModelDisplay.push(systemName);
    rows.push({
      source_id: f.source_id || rec.source_id,
      system: systemName,
      model_alias: f.model_display || null,
      org: f.model_org || null,
      resolved_pct: f.resolved_pct ?? null,
      run_date: f.run_date || null,
      agent: f.agent || null,
      reasoning_effort: f.reasoning_effort || null,
      is_open_model: f.is_open_model ?? null,
      checked: f.checked ?? null,
      canonical_id: hit?.canonical ?? null,
      alias_method: hit?.method ?? null,
      url: f.url || rec.url || null,
    });
  }
  return { rows, missingModelDisplay };
}

// ---------- Assemble ----------
async function main() {
  const catalog = await buildCatalog();
  const aliasIndex = buildAliasIndex(
    [...catalog.values()].map((m) => ({ source_id: m.id, title: m.title }))
  );

  const lb = await livebenchModels(aliasIndex);
  const swe = await sweBenchRows(aliasIndex);

  // Join price from OpenRouter into matched models (single price source);
  // fallback to LiveBench's own cost CSV for unmatched models.
  //
  // UNIT CONTRACT: the two sources do not share a unit. OpenRouter's
  // `prompt_price` is dollars per TOKEN (e.g. 0.00001), while LiveBench's
  // `input_price_per_million` is dollars per MILLION. Emitting either raw into
  // one field is what made every price in the UI read $0.00/M — so every price
  // is normalised to per-million before it leaves this file. The app only ever
  // reads `input_per_million` / `output_per_million`.
  for (const m of lb.models) {
    const c = m.canonical_id ? catalog.get(m.canonical_id) : null;
    if (c && c.input_per_million != null) {
      m.pricing = {
        input_per_million: c.input_per_million,
        output_per_million: c.output_per_million,
        source: "openrouter",
      };
      m.context_length = c.context_length;
    } else if (m.cost && m.cost.input_price_per_million != null) {
      m.pricing = {
        input_per_million: m.cost.input_price_per_million,
        output_per_million: m.cost.output_price_per_million,
        source: "livebench",
      };
    } else {
      m.pricing = null;
    }
    m.supported_efforts = c?.supported_efforts || (m.effort ? [m.effort] : null);
    m.default_effort = c?.default_effort || m.effort || null;
    if (c?.benchmarks) {
      m.external_benchmarks = c.benchmarks;
    }
  }

  const matchedSwe = swe.rows.filter((r) => r.canonical_id).length;
  const matchedLb = lb.models.filter((m) => m.canonical_id).length;

  const vendor_display = Object.fromEntries(VENDORS.map((v) => [v.id, v.display]));
  vendor_display.other = "Other";

  const data = {
    generated_at: new Date().toISOString(),
    release: "livebench-2026-06-25 + swe-bench-verified + openrouter",
    vendor_display,
    capabilities: [...new Set(Object.keys(LIVEBENCH_CATEGORIES).map(capabilityForLivebenchCategory))],
    catalog: [...catalog.values()].sort((a, b) => a.id.localeCompare(b.id)),
    livebench: lb.models.sort((a, b) => a.benchmark_name.localeCompare(b.benchmark_name)),
    swe_bench: swe.rows.sort((a, b) => (b.resolved_pct ?? 0) - (a.resolved_pct ?? 0)),
    data_quality: {
      counts: {
        catalog_models: catalog.size,
        livebench_models: lb.models.length,
        livebench_matched: matchedLb,
        swe_bench_systems: swe.rows.length,
        swe_bench_matched: matchedSwe,
      },
      unmatched: {
        livebench: lb.unmatched,
        swe_bench_model_display: swe.missingModelDisplay,
      },
    },
  };

  mkdirSync(join(ROOT, "data"), { recursive: true });
  writeFileSync(join(ROOT, "data", "scores.json"), JSON.stringify(data, null, 2) + "\n");

  console.log(
    `data/scores.json: catalog=${data.data_quality.counts.catalog_models} ` +
      `livebench=${lb.models.length} (matched ${matchedLb}) ` +
      `swe=${swe.rows.length} (matched ${matchedSwe})`
  );
  if (lb.unmatched.length) console.log("unmatched livebench:", lb.unmatched.join(", "));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
