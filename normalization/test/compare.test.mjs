import test from "node:test";
import assert from "node:assert/strict";
import { runsForVariant, scoreDelta } from "../../lib/compare.mjs";

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
