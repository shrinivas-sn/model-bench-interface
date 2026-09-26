#!/usr/bin/env node
/**
 * Run all four ingests sequentially (each has its own store file — no shared lock,
 * so no concurrency exclusion is needed locally; the cron workflow still serializes
 * per-host with concurrency groups).
 *
 * A stale canary is reported and included in data/freshness.json but is not fatal;
 * a thrown ingest failure is collected and exits 1 at the end.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runIngest } from "@shrinivas-sn/adapter-ingestion";
import { readLatestRecords } from "@shrinivas-sn/adapter-ingestion/store";
import { makeFetchImpl as openrouterFetch } from "./sources/openrouter.mjs";
import { makeFetchImpl as sweBenchFetch } from "./sources/swe-bench.mjs";
import { makeScoresFetchImpl, makeCostFetchImpl } from "./sources/livebench.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const JOBS = [
  { name: "openrouter", adapterFile: "openrouter.adapter.json", fetchImpl: openrouterFetch() },
  { name: "swe-bench-verified", adapterFile: "swe-bench-verified.adapter.json", fetchImpl: sweBenchFetch() },
  { name: "livebench-scores", adapterFile: "livebench-scores.adapter.json", fetchImpl: makeScoresFetchImpl() },
  { name: "livebench-cost", adapterFile: "livebench-cost.adapter.json", fetchImpl: makeCostFetchImpl() },
];

const freshness = { generated_at: new Date().toISOString(), sources: {} };
const failures = [];

mkdirSync(join(ROOT, "store"), { recursive: true });
mkdirSync(join(ROOT, "runs"), { recursive: true });
mkdirSync(join(ROOT, "data"), { recursive: true });

for (const job of JOBS) {
  const adapter = JSON.parse(
    (await import(`node:fs`)).readFileSync(join(ROOT, "ingestion", "adapters", job.adapterFile), "utf8")
  );
  const paths = {
    storeFile: join(ROOT, "store", `${job.name}.jsonl`),
    runsDir: join(ROOT, "runs", job.name),
  };
  try {
    const { report, canary } = await runIngest({
      adapter,
      paths,
      fetchImpl: job.fetchImpl,
      now: new Date(),
    });
    const outcome = canary.status === "stale" ? "stale" : report.outcome;
    freshness.sources[job.name] = {
      outcome,
      canary: canary.status,
      breaches: canary.breaches || [],
      stages: report.stages,
      fetched_at: new Date().toISOString(),
    };
    console.log(
      `${outcome === "ok" ? "OK  " : "WARN"} ${job.name}: ${outcome} ` +
        `stages=${JSON.stringify(report.stages)}` +
        (canary.status === "stale" ? ` breaches=${canary.breaches.join(",")}` : "")
    );
    const latest = await readLatestRecords(paths.storeFile);
    console.log(`     store: ${latest.length} latest records`);
  } catch (err) {
    failures.push({ job: job.name, code: err.code, message: err.message });
    freshness.sources[job.name] = { outcome: "error", error: { code: err.code, message: err.message } };
    console.error(`ERR  ${job.name}: ${err.code || ""} ${err.message}`);
  }
}

writeFileSync(join(ROOT, "data", "freshness.json"), JSON.stringify(freshness, null, 2) + "\n");
console.log(`freshness -> data/freshness.json`);

if (failures.length) {
  console.error(`${failures.length} ingest(s) failed`);
  process.exit(1);
}
