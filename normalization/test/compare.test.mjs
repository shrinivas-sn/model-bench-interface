import test from "node:test";
import assert from "node:assert/strict";
import { runsForVariant, scoreDelta, scoreAtEffort } from "../../lib/compare.mjs";

test("runsForVariant filters by canonicalId, sorts descending, and finds exact match", () => {
  const rows = [
    { canonical_id: "x", reasoning_effort: "high", accuracy: 50 },
    { canonical_id: "x", reasoning_effort: "max", accuracy: 58 },
    { canonical_id: "y", reasoning_effort: "max", accuracy: 40 },
  ];

  // (1) exact match on max effort
  const r1 = runsForVariant(rows, "x", "max", "reasoning_effort");
  assert.equal(r1.exact?.accuracy, 58);
  assert.equal(r1.all.length, 2);
  assert.equal(r1.all[0].accuracy, 58);
  assert.equal(r1.all[1].accuracy, 50);

  // (2) effort null -> exact null, all still returns matching canonical rows
  const r2 = runsForVariant(rows, "x", null, "reasoning_effort");
  assert.equal(r2.exact, null);
  assert.equal(r2.all.length, 2);

  // (3) effort low -> exact null (not present)
  const r3 = runsForVariant(rows, "x", "low", "reasoning_effort");
  assert.equal(r3.exact, null);
  assert.equal(r3.all.length, 2);

  // (4) canonical null -> all empty, exact null
  const r4 = runsForVariant(rows, null, "max", "reasoning_effort");
  assert.equal(r4.exact, null);
  assert.deepEqual(r4.all, []);
});

test("runsForVariant sorts by intelligence_index when accuracy is absent", () => {
  const rows = [
    { canonical_id: "a", effort: "high", intelligence_index: 30 },
    { canonical_id: "a", effort: "max", intelligence_index: 45 },
  ];
  const r = runsForVariant(rows, "a", "max", "effort");
  assert.equal(r.exact?.intelligence_index, 45);
  assert.equal(r.all[0].intelligence_index, 45);
  assert.equal(r.all[1].intelligence_index, 30);
});

test("scoreDelta computes rounded difference or null", () => {
  assert.equal(scoreDelta(58.18, 50.3), 7.88);
  assert.equal(scoreDelta(null, 1), null);
  assert.equal(scoreDelta(1, null), null);
  assert.equal(scoreDelta(null, null), null);
  assert.equal(scoreDelta(50, 50), 0);
});

const AT_EFFORT_DATA = {
  livebench: [
    { benchmark_name: "claude-opus-5", canonical_id: "anthropic/claude-opus-5", family_id: "anthropic/claude-opus-5", effort: null, overall: 82.09 },
    { benchmark_name: "fam-high", canonical_id: null, family_id: "fam", effort: "high", overall: 70 },
    { benchmark_name: "fam-low", canonical_id: null, family_id: "fam", effort: "low", overall: 60 },
  ],
  terminal_bench: [
    { canonical_id: "anthropic/claude-opus-5", reasoning_effort: "max", accuracy: 61.2 },
    { canonical_id: "anthropic/claude-opus-5", reasoning_effort: "low", accuracy: 48.4 },
    { canonical_id: "anthropic/claude-opus-5.5", reasoning_effort: "max", accuracy: 64.85 },
  ],
  artificial_analysis: [],
};
const opus5 = AT_EFFORT_DATA.livebench[0];

test("scoreAtEffort: Terminal-Bench run at exactly that effort is measured", () => {
  const r = scoreAtEffort(opus5, "terminal_bench", "low", AT_EFFORT_DATA);
  assert.equal(r.status, "measured");
  assert.equal(r.value, 48.4);
  assert.equal(r.measuredEffort, "low");
});

test("scoreAtEffort: single-max model at low is not measured, never borrowed", () => {
  const model = { benchmark_name: "claude-opus-5-5", canonical_id: "anthropic/claude-opus-5.5", family_id: "x" };
  const r = scoreAtEffort(model, "terminal_bench", "low", AT_EFFORT_DATA);
  assert.deepEqual(r, { status: "not-measured", value: null, row: null, measuredEffort: null, measuredLevels: ["max"] });
});

test("scoreAtEffort: LiveBench bare row is effort-not-stated with its published value", () => {
  const r = scoreAtEffort(opus5, "livebench", "high", AT_EFFORT_DATA);
  assert.equal(r.status, "effort-not-stated");
  assert.equal(r.value, 82.09);
  assert.equal(r.measuredEffort, null);
});

test("scoreAtEffort: LiveBench sibling at that effort is measured; other level lists the measured ones", () => {
  const fam = AT_EFFORT_DATA.livebench[1];
  assert.equal(scoreAtEffort(fam, "livebench", "low", AT_EFFORT_DATA).value, 60);
  const r = scoreAtEffort(fam, "livebench", "max", AT_EFFORT_DATA);
  assert.equal(r.status, "not-measured");
  assert.deepEqual(r.measuredLevels, ["high", "low"]);
});

test("scoreAtEffort: unknown model is not measured with no levels", () => {
  const r = scoreAtEffort({ benchmark_name: "nope", canonical_id: "x/nope" }, "terminal_bench", "high", AT_EFFORT_DATA);
  assert.equal(r.status, "not-measured");
  assert.deepEqual(r.measuredLevels, []);
  assert.equal(scoreAtEffort(null, "livebench", "high", AT_EFFORT_DATA).status, "not-measured");
});

test("scoreAtEffort: no effort picked returns the top row labelled with its own effort", () => {
  const r = scoreAtEffort(opus5, "terminal_bench", null, AT_EFFORT_DATA);
  assert.equal(r.status, "measured");
  assert.equal(r.measuredEffort, "max");
  assert.equal(r.value, 61.2);
});

test("scoreAtEffort joins on model_key when a source has no canonical id", () => {
  const model = { benchmark_name: "qwen3.8-max", canonical_id: null, family_id: "qwen3-8-max", model_key: "name:qwen38max" };
  const data = {
    livebench: [model],
    terminal_bench: [],
    artificial_analysis: [
      { model_key: "name:qwen38max", canonical_id: null, effort: "high", intelligence_index: 50 },
    ],
  };
  const r = scoreAtEffort(model, "artificial_analysis", "high", data);
  assert.equal(r.status, "measured");
  assert.equal(r.value, 50);
});
