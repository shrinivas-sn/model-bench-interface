#!/usr/bin/env node
/**
 * Effort coverage: which reasoning-effort levels each model has a published
 * score at, per source. Measured levels only (LiveBench `effort`, Terminal-Bench
 * `reasoning_effort`, Artificial Analysis `effort`); OpenRouter `supported_efforts`
 * is a config flag, not a measurement, so it is not counted.
 *
 * CLI: node normalization/effort-coverage.mjs [data/scores.json] [out.md]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { EFFORT_LEVELS } from "./effort.mjs";

const SOURCES = [
  ["livebench", (r) => r.effort],
  ["terminal_bench", (r) => r.reasoning_effort],
  ["artificial_analysis", (r) => r.effort],
];

const rank = (e) => {
  const i = EFFORT_LEVELS.indexOf(e);
  return i === -1 ? EFFORT_LEVELS.length : i;
};
const sortLevels = (levels) =>
  [...new Set(levels)].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));

const modelKey = (r) => r.model_key ?? r.canonical_id ?? r.family_id ?? r.benchmark_name ?? r.model_label ?? null;

export function effortCoverage(data) {
  const models = {};
  const unknown = new Set();
  let tbNone = 0;
  for (const [source, effortOf] of SOURCES) {
    for (const row of data[source] || []) {
      const key = modelKey(row);
      if (!key) continue;
      models[key] ??= { livebench: [], terminal_bench: [], artificial_analysis: [], levels: [] };
      const effort = effortOf(row);
      if (!effort) continue;
      models[key][source].push(effort);
      if (!EFFORT_LEVELS.includes(effort)) unknown.add(effort);
      if (source === "terminal_bench" && effort === "none") tbNone++;
    }
  }
  for (const m of Object.values(models)) {
    for (const [source] of SOURCES) m[source] = sortLevels(m[source]);
    m.levels = sortLevels(SOURCES.flatMap(([source]) => m[source]));
  }
  const counts = Object.values(models).map((m) => m.levels.length);
  return {
    models: Object.fromEntries(Object.entries(models).sort(([a], [b]) => a.localeCompare(b))),
    totals: {
      models: counts.length,
      multi_level: counts.filter((n) => n >= 2).length,
      single_level: counts.filter((n) => n === 1).length,
      no_level: counts.filter((n) => n === 0).length,
      tb_none_runs: tbNone,
      unknown_efforts: [...unknown].sort(),
    },
  };
}

export function coverageMarkdown({ models, totals }, meta = {}) {
  const list = (a) => (a.length ? a.join(", ") : "—");
  const lines = [
    "# Effort coverage",
    "",
    `Generated ${meta.generated_at ?? new Date().toISOString()} from \`data/scores.json\`` +
      (meta.release ? ` (${meta.release})` : "") +
      ". Measured levels only.",
    "",
    "| Total | Count |",
    "|---|---|",
    `| Models | ${totals.models} |`,
    `| ≥ 2 measured levels | ${totals.multi_level} |`,
    `| Exactly 1 level | ${totals.single_level} |`,
    `| No stated level | ${totals.no_level} |`,
    `| Terminal-Bench \`none\` runs | ${totals.tb_none_runs} |`,
    `| Effort strings not in EFFORT_LEVELS | ${list(totals.unknown_efforts.map((e) => `\`${e}\``))} |`,
    "",
    "## Models with a measured level",
    "",
    "| Model | Levels | LiveBench | Terminal-Bench | Artificial Analysis |",
    "|---|---|---|---|---|",
  ];
  for (const [id, m] of Object.entries(models)) {
    if (!m.levels.length) continue;
    lines.push(
      `| \`${id}\` | ${list(m.levels)} | ${list(m.livebench)} | ${list(m.terminal_bench)} | ${list(m.artificial_analysis)} |`
    );
  }
  return lines.join("\n") + "\n";
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [inPath = "data/scores.json", outPath] = process.argv.slice(2);
  const data = JSON.parse(readFileSync(inPath, "utf8"));
  const cov = effortCoverage(data);
  const md = coverageMarkdown(cov, { generated_at: data.generated_at, release: data.release });
  if (outPath) writeFileSync(outPath, md);
  console.log(JSON.stringify(cov.totals));
}
