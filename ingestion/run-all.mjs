#!/usr/bin/env node
/**
 * Run all four ingests sequentially (each has its own store file — no shared lock,
 * so no concurrency exclusion is needed locally; the cron workflow still serializes
 * per-host with concurrency groups).
 *
 * A stale canary is reported and included in data/freshness.json but is not fatal;
 * a thrown ingest failure is collected and exits 1 at the end.
 */
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runIngest } from "@shrinivas-sn/adapter-ingestion";
import { readLatestRecords } from "@shrinivas-sn/adapter-ingestion/store";
import { makeFetchImpl as openrouterFetch } from "./sources/openrouter.mjs";
import {
  makeScoresFetchImpl,
  makeCostFetchImpl,
  discoverLatestRelease,
  scoresUrl,
  costUrl,
  RELEASE,
} from "./sources/livebench.mjs";
import { makeFetchImpl as terminalBenchFetch } from "./sources/terminal-bench.mjs";
import { makeFetchImpl as aaFetch, KEY_ENV } from "./sources/artificial-analysis.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const lbRelease = (await discoverLatestRelease()) ?? RELEASE;
console.log(`LiveBench release: ${lbRelease}`);

const aaKey = process.env[KEY_ENV];
const JOBS = [
  { name: "openrouter", adapterFile: "openrouter.adapter.json", fetchImpl: openrouterFetch() },
  {
    name: "livebench-scores",
    adapterFile: "livebench-scores.adapter.json",
    fetchImpl: makeScoresFetchImpl(lbRelease),
    urlOverride: scoresUrl(lbRelease),
    release: lbRelease,
  },
  {
    name: "livebench-cost",
    adapterFile: "livebench-cost.adapter.json",
    fetchImpl: makeCostFetchImpl(lbRelease),
    urlOverride: costUrl(lbRelease),
    release: lbRelease,
  },
  { name: "terminal-bench", adapterFile: "terminal-bench.adapter.json", fetchImpl: terminalBenchFetch() },
];

if (aaKey) {
  JOBS.push({
    name: "artificial-analysis",
    adapterFile: "artificial-analysis.adapter.json",
    fetchImpl: aaFetch(aaKey),
  });
} else {
  console.log(`SKIP artificial-analysis: ${KEY_ENV} not set`);
}

const freshness = { generated_at: new Date().toISOString(), sources: {} };
const failures = [];

mkdirSync(join(ROOT, "store"), { recursive: true });
mkdirSync(join(ROOT, "runs"), { recursive: true });
mkdirSync(join(ROOT, "data"), { recursive: true });

for (const job of JOBS) {
  const adapter = JSON.parse(
    readFileSync(join(ROOT, "ingestion", "adapters", job.adapterFile), "utf8")
  );
  if (job.urlOverride && adapter.access) {
    adapter.access.url = job.urlOverride;
  }
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
      ...(job.release ? { release: job.release } : {}),
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
    freshness.sources[job.name] = {
      outcome: "error",
      error: { code: err.code, message: err.message },
      ...(job.release ? { release: job.release } : {}),
    };
    console.error(`ERR  ${job.name}: ${err.code || ""} ${err.message}`);
  }
}

writeFileSync(join(ROOT, "data", "freshness.json"), JSON.stringify(freshness, null, 2) + "\n");
console.log(`freshness -> data/freshness.json`);

if (failures.length) {
  console.error(`${failures.length} ingest(s) failed`);
  process.exit(1);
}
