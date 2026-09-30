/**
 * Capture fixtures from the live sources (run once, re-run when a source's shape
 * changes). Writes trimmed samples to ingestion/fixtures/<name>/sample-*.json in
 * the TRANSFORMED shape — the same shape each source's makeFetchImpl() produces —
 * so verifyAgainstFixtures proves the adapter maps exactly what ingestion sees.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ADAPTER_URL, transformEnvelope } from "./sources/openrouter.mjs";
import { ADAPTER_URL as SWE_URL, transformLeaderboards } from "./sources/swe-bench.mjs";
import { SCORES_URL, COST_URL, transformScoresCsv, transformCostCsv } from "./sources/livebench.mjs";
import {
  ADAPTER_URL as TBENCH_URL,
  decodeFlight,
  extractLeaderboard,
  toItems as tbenchToItems,
} from "./sources/terminal-bench.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const H = { "User-Agent": "model-bench-ingest" };

const LIMITS = {
  openrouter: 6,
  "swe-bench-verified": 4,
  "livebench-scores": 60,
  "livebench-cost": 6,
  "terminal-bench": 6,
};

function writeFixture(name, items) {
  const dir = join(HERE, "fixtures", name);
  mkdirSync(dir, { recursive: true });
  const file = join(dir, "sample-1.json");
  writeFileSync(file, JSON.stringify(items, null, 2) + "\n");
  console.log(`wrote ${items.length} items -> ${file}`);
}

const jobs = [
  {
    name: "openrouter",
    run: async () => {
      const res = await fetch(ADAPTER_URL, { headers: H });
      if (!res.ok) throw new Error(`openrouter ${res.status}`);
      return transformEnvelope(await res.json()).slice(0, LIMITS.openrouter);
    },
  },
  {
    name: "swe-bench-verified",
    run: async () => {
      const res = await fetch(SWE_URL, { headers: H });
      if (!res.ok) throw new Error(`swe-bench ${res.status}`);
      return transformLeaderboards(await res.json()).slice(0, LIMITS["swe-bench-verified"]);
    },
  },
  {
    name: "livebench-scores",
    run: async () => {
      const res = await fetch(SCORES_URL, { headers: H });
      if (!res.ok) throw new Error(`livebench-scores ${res.status}`);
      return transformScoresCsv(await res.text()).slice(0, LIMITS["livebench-scores"]);
    },
  },
  {
    name: "livebench-cost",
    run: async () => {
      const res = await fetch(COST_URL, { headers: H });
      if (!res.ok) throw new Error(`livebench-cost ${res.status}`);
      return transformCostCsv(await res.text()).slice(0, LIMITS["livebench-cost"]);
    },
  },
  {
    name: "terminal-bench",
    run: async () => {
      const res = await fetch(TBENCH_URL, { headers: H });
      if (!res.ok) throw new Error(`terminal-bench ${res.status}`);
      const text = await res.text();
      const board = extractLeaderboard(decodeFlight(text));
      if (!board) throw new Error("terminal-bench leaderboard not found in page");
      return tbenchToItems(board).slice(0, LIMITS["terminal-bench"]);
    },
  },
];

let failed = 0;
for (const job of jobs) {
  try {
    writeFixture(job.name, await job.run());
  } catch (err) {
    failed++;
    console.error(`capture FAILED for ${job.name}: ${err.message}`);
  }
}
process.exit(failed ? 1 : 0);
