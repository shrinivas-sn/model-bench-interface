import { test } from "node:test";
import assert from "node:assert/strict";
import { effortCoverage } from "../effort-coverage.mjs";

test("effortCoverage lists measured efforts per model and source", () => {
  const data = {
    livebench: [
      { benchmark_name: "m1-high", canonical_id: "a/m1", family_id: "m1", effort: "high" },
      { benchmark_name: "m1-low", canonical_id: "a/m1", family_id: "m1", effort: "low" },
      { benchmark_name: "m3", canonical_id: "c/m3", family_id: "m3", effort: null },
    ],
    terminal_bench: [{ canonical_id: "b/m2", reasoning_effort: "max" }],
    artificial_analysis: [],
  };
  assert.deepEqual(effortCoverage(data), {
    models: {
      "a/m1": { livebench: ["high", "low"], terminal_bench: [], artificial_analysis: [], levels: ["high", "low"] },
      "b/m2": { livebench: [], terminal_bench: ["max"], artificial_analysis: [], levels: ["max"] },
      "c/m3": { livebench: [], terminal_bench: [], artificial_analysis: [], levels: [] },
    },
    totals: { models: 3, multi_level: 1, single_level: 1, no_level: 1, tb_none_runs: 0, unknown_efforts: [] },
  });
});

test("effortCoverage counts Terminal-Bench none runs and unknown effort strings", () => {
  const data = {
    livebench: [{ benchmark_name: "x", canonical_id: null, family_id: "x-fam", effort: null }],
    terminal_bench: [
      { canonical_id: "b/m2", reasoning_effort: "none" },
      { canonical_id: "b/m2", reasoning_effort: "turbo" },
      { canonical_id: "b/m2", reasoning_effort: null },
    ],
    artificial_analysis: [{ canonical_id: "b/m2", effort: "high" }],
  };
  const { models, totals } = effortCoverage(data);
  assert.deepEqual(models["x-fam"].levels, []);
  assert.deepEqual(models["b/m2"].artificial_analysis, ["high"]);
  assert.equal(models["b/m2"].levels[0], "high");
  assert.equal(totals.tb_none_runs, 1);
  assert.ok(totals.unknown_efforts.includes("turbo"));
});
