/**
 * Verify every adapter against its fixtures with the package's own
 * verifyAgainstFixtures before any live run is trusted (the 0.8 parse-ratio gate
 * from the adapter-ingestion workflow).
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { validateAdapter, verifyAgainstFixtures } from "@shrinivas-sn/adapter-ingestion/adapter";

const HERE = dirname(fileURLToPath(import.meta.url));
const GATE = 0.8;

const ADAPTERS = [
  "openrouter.adapter.json",
  "swe-bench-verified.adapter.json",
  "livebench-scores.adapter.json",
  "livebench-cost.adapter.json",
  "terminal-bench.adapter.json",
];

let failed = 0;
for (const adapterFile of ADAPTERS) {
  const adapter = JSON.parse(readFileSync(join(HERE, "adapters", adapterFile), "utf8"));
  const name = adapterFile.replace(".adapter.json", "");
  const val = validateAdapter(adapter);
  if (!val.ok) {
    console.error(`${name}: adapter INVALID -> ${val.errors.join("; ")}`);
    failed++;
    continue;
  }
  const fixtureDir = join(HERE, "fixtures", name);
  let items;
  try {
    items = JSON.parse(
      readFileSync(join(fixtureDir, readdirSync(fixtureDir).find((f) => f.endsWith(".json"))), "utf8")
    );
  } catch {
    console.error(`${name}: no fixture found — run capture-fixtures.mjs first`);
    failed++;
    continue;
  }
  const v = verifyAgainstFixtures(adapter, items);
  const pass = v.ratio >= GATE;
  console.log(
    `${pass ? "PASS" : "FAIL"} ${name}: parsed ${v.parsed}/${v.total} (ratio ${v.ratio.toFixed(2)})` +
      (v.fieldFailures?.length ? ` fieldFailures: ${JSON.stringify(v.fieldFailures).slice(0, 300)}` : "")
  );
  if (!pass) failed++;
}
process.exit(failed ? 1 : 0);
