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
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readLatestRecords } from "@shrinivas-sn/adapter-ingestion/store";
import { buildAliasIndex, resolveAlias, vendorFor, VENDORS } from "./registry.mjs";
import { LIVEBENCH_CATEGORIES, capabilityForLivebenchCategory } from "./categories.mjs";
import { parseEffort, stripEffort, supportedEffortsFrom } from "./effort.mjs";
import {
  categoryAverages,
  overallScore,
  round2,
  assertTasksCategorised,
} from "./livebench-scores.mjs";
import { resolveSourceModel } from "./manual-aliases.mjs";
import { splitEffort } from "../ingestion/sources/artificial-analysis.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const manualAliases = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "manual-aliases.json"), "utf8")
);

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
    const supported_efforts = supportedEffortsFrom(f);
    models.set(id, {
      id,
      title: f.title || id,
      vendor: vendorFor(id),
      context_length: f.context_length ?? null,
      input_per_million: perMillion(f.prompt_price),
      output_per_million: perMillion(f.completion_price),
      supported_efforts,
      default_effort: f.reasoning?.default_effort ?? null,
    });
  }
  return models;
}

// ---------- LiveBench: scores + cost ----------
async function livebenchModels(aliasIndex) {
  const allScoreRecs = existsSync(storePath("livebench-scores"))
    ? await readLatestRecords(storePath("livebench-scores"))
    : [];
  const allCostRecs = existsSync(storePath("livebench-cost"))
    ? await readLatestRecords(storePath("livebench-cost"))
    : [];

  const releases = Array.from(
    new Set(allScoreRecs.map((r) => fieldsOf(r).release).filter(Boolean))
  ).sort((a, b) => b.localeCompare(a));
  const latestRelease = releases[0] || "2026-06-25";

  const recs = allScoreRecs.filter((r) => (fieldsOf(r).release || "2026-06-25") === latestRelease);
  const costRecs = allCostRecs.filter((r) => (fieldsOf(r).release || "2026-06-25") === latestRelease);

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
  const allTasksSeen = new Set();
  for (const rec of recs) {
    const f = fieldsOf(rec);
    const model = f.model;
    const task = f.task;
    const score = f.score;
    if (!model || !task || score == null) continue;
    allTasksSeen.add(task);
    if (!byModel.has(model)) byModel.set(model, new Map());
    byModel.get(model).set(task, score);
  }
  assertTasksCategorised([...allTasksSeen], LIVEBENCH_CATEGORIES);

  const unmatched = [];
  const models = [];
  for (const [benchModel, tasks] of byModel) {
    const hit = resolveAlias(aliasIndex, benchModel);
    if (!hit) unmatched.push(benchModel);

    const taskObj = {};
    for (const [task, score] of tasks) {
      taskObj[task] = score;
    }
    const avg = categoryAverages(taskObj, LIVEBENCH_CATEGORIES);
    const categories = {};
    for (const [cat, val] of Object.entries(avg)) {
      categories[capabilityForLivebenchCategory(cat) || cat] = round2(val);
    }
    const overall = round2(overallScore(avg, Object.keys(LIVEBENCH_CATEGORIES)));

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
      overall,
      tasks: taskObj,
      categories,
      cost: costByModel.get(benchModel) || null,
    });
  }
  return { models, unmatched, release: latestRelease };
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

// ---------- Terminal-Bench ----------
async function terminalBenchRows(aliasIndex) {
  const recs = existsSync(storePath("terminal-bench"))
    ? await readLatestRecords(storePath("terminal-bench"))
    : [];
  if (!recs.length) return { rows: [], leaderboard_title: null, unmatched: [] };

  const titles = recs.map((r) => fieldsOf(r).leaderboard_title).filter(Boolean);
  const newestTitle = titles[0] || "Terminal-Bench 4.0";

  const rows = [];
  const unmatched = [];
  for (const rec of recs) {
    const f = fieldsOf(rec);
    if (f.leaderboard_title && f.leaderboard_title !== newestTitle) {
      continue;
    }
    const hit = resolveSourceModel({
      aliasIndex,
      manual: manualAliases,
      source: "terminal-bench",
      org: f.model_org,
      label: f.model_label || f.title,
    });
    const modelLabel = f.model_label || f.title || "";
    if (!hit) {
      unmatched.push(modelLabel);
    }
    rows.push({
      run_id: f.source_id || rec.source_id,
      canonical_id: hit?.canonical ?? null,
      alias_method: hit?.method ?? null,
      model_label: modelLabel,
      model_org: f.model_org ?? null,
      agent_label: f.agent_label ?? null,
      reasoning_effort: f.reasoning_effort ?? null,
      accuracy: Number(f.accuracy),
      ci95_half_width: f.ci95_half_width != null ? Number(f.ci95_half_width) : null,
      n_trials: f.n_trials != null ? Number(f.n_trials) : null,
      total_cost_usd: f.total_cost_usd != null ? Number(f.total_cost_usd) : null,
      run_date: f.run_date || f.date || null,
      leaderboard_title: f.leaderboard_title || newestTitle,
    });
  }
  rows.sort((a, b) => (b.accuracy ?? 0) - (a.accuracy ?? 0));
  return { rows, leaderboard_title: newestTitle, unmatched };
}

// ---------- Artificial Analysis ----------
async function artificialAnalysisRows(aliasIndex) {
  const p = storePath("artificial-analysis");
  if (!existsSync(p)) {
    return { rows: [], connected: false, fetched_at: null, unmatched: [] };
  }
  const recs = await readLatestRecords(p);
  const rows = [];
  const unmatched = [];
  for (const rec of recs) {
    const f = fieldsOf(rec);
    const name = f.title || f.name || "";
    const { base, effort } = splitEffort(name);
    const creator = f.creator || null;
    const hit = resolveSourceModel({
      aliasIndex,
      manual: manualAliases,
      source: "artificial-analysis",
      org: creator,
      label: base,
    });
    if (!hit) {
      unmatched.push(name);
    }
    rows.push({
      aa_id: f.source_id || rec.source_id,
      canonical_id: hit?.canonical ?? null,
      alias_method: hit?.method ?? null,
      name,
      effort,
      creator,
      intelligence_index: f.intelligence_index != null ? Number(f.intelligence_index) : null,
      coding_index: f.coding_index != null ? Number(f.coding_index) : null,
      agentic_index: f.agentic_index != null ? Number(f.agentic_index) : null,
      output_tps: f.output_tps != null ? Number(f.output_tps) : null,
      ttft_s: f.ttft_s != null ? Number(f.ttft_s) : null,
      release_date: f.release_date || null,
    });
  }

  let fetched_at = null;
  const freshnessPath = join(ROOT, "data", "freshness.json");
  if (existsSync(freshnessPath)) {
    try {
      const fData = JSON.parse(readFileSync(freshnessPath, "utf8"));
      fetched_at = fData?.sources?.["artificial-analysis"]?.fetched_at || null;
    } catch {
      // ignore read error
    }
  }

  return { rows, connected: true, fetched_at, unmatched };
}

// ---------- Assemble ----------
async function main() {
  const catalog = await buildCatalog();
  const aliasIndex = buildAliasIndex(
    [...catalog.values()].map((m) => ({ source_id: m.id, title: m.title }))
  );

  const lb = await livebenchModels(aliasIndex);
  const swe = await sweBenchRows(aliasIndex);
  const terminalBench = await terminalBenchRows(aliasIndex);
  const aa = await artificialAnalysisRows(aliasIndex);

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
    m.supported_efforts = c?.supported_efforts ?? null;
    m.default_effort = c?.default_effort ?? null;
  }

  const matchedSwe = swe.rows.filter((r) => r.canonical_id).length;
  const matchedLb = lb.models.filter((m) => m.canonical_id).length;
  const matchedTb = terminalBench.rows.filter((r) => r.canonical_id).length;

  const vendor_display = Object.fromEntries(VENDORS.map((v) => [v.id, v.display]));
  vendor_display.other = "Other";

  const lbRelease = lb.release;
  const terminalBenchTitle = terminalBench.rows.length
    ? terminalBench.leaderboard_title
    : null;
  let releaseText = `LiveBench ${lbRelease} + ${terminalBenchTitle ?? "Terminal-Bench not available"} + OpenRouter prices`;
  if (aa.connected) {
    releaseText += " + Artificial Analysis";
  }

  const data = {
    generated_at: new Date().toISOString(),
    release: releaseText,
    vendor_display,
    capabilities: [...new Set(Object.keys(LIVEBENCH_CATEGORIES).map(capabilityForLivebenchCategory))],
    sources: {
      livebench: { release: lbRelease, url: "https://livebench.ai/" },
      terminal_bench: terminalBench.rows.length
        ? { title: terminalBench.leaderboard_title, url: "https://www.tbench.ai/" }
        : null,
      artificial_analysis: {
        connected: aa.connected,
        url: "https://artificialanalysis.ai/",
        ...(aa.fetched_at ? { fetched_at: aa.fetched_at } : {}),
      },
    },
    catalog: [...catalog.values()].sort((a, b) => a.id.localeCompare(b.id)),
    livebench: lb.models.sort((a, b) => a.benchmark_name.localeCompare(b.benchmark_name)),
    swe_bench: swe.rows.sort((a, b) => (b.resolved_pct ?? 0) - (a.resolved_pct ?? 0)),
    terminal_bench: terminalBench.rows,
    artificial_analysis: aa.rows,
    data_quality: {
      counts: {
        catalog_models: catalog.size,
        livebench_models: lb.models.length,
        livebench_matched: matchedLb,
        swe_bench_systems: swe.rows.length,
        swe_bench_matched: matchedSwe,
        terminal_bench_runs: terminalBench.rows.length,
        terminal_bench_matched: matchedTb,
        ...(aa.connected
          ? {
              artificial_analysis_models: aa.rows.length,
              artificial_analysis_matched: aa.rows.filter((r) => r.canonical_id).length,
            }
          : {}),
      },
      unmatched: {
        livebench: lb.unmatched,
        swe_bench_model_display: swe.missingModelDisplay,
        terminal_bench: terminalBench.unmatched,
        ...(aa.connected ? { artificial_analysis: aa.unmatched } : {}),
      },
    },
  };

  mkdirSync(join(ROOT, "data"), { recursive: true });
  writeFileSync(join(ROOT, "data", "scores.json"), JSON.stringify(data, null, 2) + "\n");

  console.log(
    `data/scores.json: catalog=${data.data_quality.counts.catalog_models} ` +
      `livebench=${lb.models.length} (matched ${matchedLb}) ` +
      `swe=${swe.rows.length} (matched ${matchedSwe}) ` +
      `terminal_bench=${terminalBench.rows.length} (matched ${matchedTb})`
  );
  if (lb.unmatched.length) console.log("unmatched livebench:", lb.unmatched.join(", "));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
