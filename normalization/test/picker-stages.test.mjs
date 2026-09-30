import { test } from "node:test";
import assert from "node:assert/strict";

import {
  defaultPair,
  effortOptions,
  formatPerMillion,
  formatPricePair,
  groupModels,
  readRecents,
  searchFamilies,
  writeRecents,
} from "../../lib/picker.mjs";

/** Minimal LivebenchModel-shaped fixture. */
function mk(name, { vendor = "other", family, effort = null, canonical = null, score = 50 } = {}) {
  return {
    benchmark_name: name,
    canonical_id: canonical,
    alias_method: canonical ? "exact" : null,
    vendor: canonical ? vendor : "unmatched",
    display_vendor: vendor,
    family_id: family ?? name,
    effort,
    thinking: false,
    tasks: {},
    categories: { coding: score, reasoning: score },
    cost: null,
    pricing: null,
    context_length: null,
  };
}

const MODELS = [
  mk("anthropic/claude-opus-5.5-max-effort", {
    vendor: "anthropic",
    family: "anthropic/claude-opus-5.5",
    effort: "max",
    canonical: "anthropic/claude-opus-5.5",
    score: 80,
  }),
  mk("anthropic/claude-opus-5.5-xhigh-effort", {
    vendor: "anthropic",
    family: "anthropic/claude-opus-5.5",
    effort: "xhigh",
    canonical: "anthropic/claude-opus-5.5",
    score: 70,
  }),
  mk("anthropic/claude-sonnet-4.6", {
    vendor: "anthropic",
    family: "anthropic/claude-sonnet-4.6",
    canonical: "anthropic/claude-sonnet-4.6",
    score: 60,
  }),
  mk("openai/gpt-5.5-xhigh", {
    vendor: "openai",
    family: "openai/gpt-5.5",
    effort: "xhigh",
    canonical: "openai/gpt-5.5",
    score: 75,
  }),
  mk("unlisted/inkling-xhigh", {
    vendor: "other",
    family: "inkling",
    effort: "xhigh",
    canonical: null,
    score: 40,
  }),
];

const VENDORS = { anthropic: "Anthropic", openai: "OpenAI", other: "Other" };
const GROUPS = groupModels(MODELS, VENDORS);

/** Total benchmark rows in a vendor group, for tests about families vs rows. */
function modelsIn(groups, vendor) {
  const g = groups.find((x) => x.vendor === vendor);
  return g ? g.families.reduce((n, f) => n + f.variants.length, 0) : 0;
}

// ---------------------------------------------------------------- search ----

test("searchFamilies returns nothing for an empty or whitespace query", () => {
  assert.deepEqual(searchFamilies(GROUPS, ""), []);
  assert.deepEqual(searchFamilies(GROUPS, "   "), []);
  assert.deepEqual(searchFamilies(GROUPS, null), []);
});

test("searchFamilies matches a company name and returns only that company", () => {
  const hits = searchFamilies(GROUPS, "openai");
  assert.equal(hits.length, 1);
  assert.equal(hits[0].family.family_id, "openai/gpt-5.5");
  assert.equal(hits[0].vendor_name, "OpenAI");
});

test("searchFamilies ranks a label match above an incidental keyword match", () => {
  // "opus" appears in the Anthropic family label; it must come first.
  const hits = searchFamilies(GROUPS, "opus");
  assert.equal(hits[0].family.family_id, "anthropic/claude-opus-5.5");
});

test("searchFamilies requires every token to match (AND, not OR)", () => {
  // "opus" alone matches one family; "opus gpt" matches nothing, because no
  // single family is both. An OR implementation would wrongly return both.
  assert.equal(searchFamilies(GROUPS, "opus").length, 1);
  assert.equal(searchFamilies(GROUPS, "opus gpt").length, 0);
});

test("searchFamilies can find a family by its effort level", () => {
  const hits = searchFamilies(GROUPS, "xhigh");
  const ids = hits.map((h) => h.family.family_id).sort();
  assert.deepEqual(ids, ["anthropic/claude-opus-5.5", "inkling", "openai/gpt-5.5"]);
});

test("searchFamilies finds unmatched names so they are never silently unreachable", () => {
  const hits = searchFamilies(GROUPS, "inkling");
  assert.equal(hits.length, 1);
  assert.equal(hits[0].family.family_id, "inkling");
  assert.equal(hits[0].vendor, "other");
});

test("searchFamilies is case-insensitive and returns families, not rows", () => {
  // Anthropic has three LiveBench rows but only two families (Opus 5.5 carries
  // two effort variants) — search must group to the family the picker lists.
  assert.equal(modelsIn(GROUPS, "anthropic"), 3);
  assert.equal(searchFamilies(GROUPS, "ANTHROPIC").length, 2);
  assert.equal(searchFamilies(GROUPS, "anthropic").length, 2);
});

test("searchFamilies breaks score ties on the family's overall mean", () => {
  // Both Anthropic families contain the token "claude"; the higher-scoring one wins.
  const hits = searchFamilies(GROUPS, "claude");
  assert.equal(hits.length, 2);
  assert.equal(hits[0].family.family_id, "anthropic/claude-opus-5.5");
});

// --------------------------------------------------------- effort options --

test("effortOptions exposes every variant when a family has a real choice", () => {
  const opus = GROUPS[0].families.find((f) => f.family_id === "anthropic/claude-opus-5.5");
  const opts = effortOptions(opus);
  assert.equal(opts.hasChoice, true);
  assert.equal(opts.defaultName, "anthropic/claude-opus-5.5-max-effort");
  assert.deepEqual(
    opts.variants.map((v) => v.effort),
    ["max", "xhigh"]
  );
});

test("effortOptions skips the effort step for a single-variant family", () => {
  const sonnet = GROUPS[0].families.find((f) => f.family_id === "anthropic/claude-sonnet-4.6");
  const opts = effortOptions(sonnet);
  assert.equal(opts.hasChoice, false);
  assert.equal(opts.defaultName, "anthropic/claude-sonnet-4.6");
});

test("effortOptions still offers a choice when one variant has no stated effort", () => {
  // Regression guard: counting only variants *with* an effort would report
  // hasChoice=false here and make the second variant unreachable.
  const family = {
    variants: [mk("m-max", { effort: "max" }), mk("m-plain", { effort: null })],
  };
  const opts = effortOptions(family);
  assert.equal(opts.hasChoice, true);
  assert.equal(opts.variants.length, 2);
});

test("effortOptions tolerates a missing family", () => {
  const opts = effortOptions(undefined);
  assert.equal(opts.hasChoice, false);
  assert.equal(opts.defaultName, "");
  assert.deepEqual(opts.variants, []);
});

// ---------------------------------------------------------------- price -----

test("formatPerMillion never renders an unknown price as zero", () => {
  assert.equal(formatPerMillion(null), "—");
  assert.equal(formatPerMillion(undefined), "—");
  assert.equal(formatPerMillion(Number.NaN), "—");
  assert.equal(formatPerMillion(0), "free");
});

test("formatPerMillion drops trailing zeros instead of padding to two decimals", () => {
  assert.equal(formatPerMillion(10), "$10");
  assert.equal(formatPerMillion(2.5), "$2.5");
  assert.equal(formatPerMillion(0.15), "$0.15");
  assert.equal(formatPerMillion(0.021), "$0.02");
  assert.equal(formatPerMillion(150), "$150");
});

test("formatPricePair shows both directions and degrades to a dash", () => {
  assert.equal(formatPricePair(10, 50), "$10 / $50");
  assert.equal(formatPricePair(null, null), "—");
  assert.equal(formatPricePair(0, 0), "free / free");
});

// -------------------------------------------------------------- recents -----

function fakeStorage(seed) {
  const map = new Map(seed ? [["mb.recentModels", seed]] : []);
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => void map.set(k, v),
  };
}

test("readRecents returns [] for missing, malformed or non-array storage", () => {
  assert.deepEqual(readRecents(null), []);
  assert.deepEqual(readRecents(fakeStorage()), []);
  assert.deepEqual(readRecents(fakeStorage("not json")), []);
  assert.deepEqual(readRecents(fakeStorage('{"a":1}')), []);
  assert.deepEqual(readRecents(fakeStorage('["ok", 5, null]')), ["ok"]);
});

test("readRecents survives a storage that throws on read", () => {
  const throwing = {
    getItem() {
      throw new Error("blocked");
    },
  };
  assert.deepEqual(readRecents(throwing), []);
});

test("writeRecents puts the newest pick first and de-duplicates", () => {
  const s = fakeStorage();
  writeRecents(s, "a");
  writeRecents(s, "b");
  writeRecents(s, "a");
  assert.deepEqual(readRecents(s), ["a", "b"]);
});

test("writeRecents caps the list and ignores empty names", () => {
  const s = fakeStorage();
  for (const n of ["a", "b", "c", "d", "e", "f"]) writeRecents(s, n);
  assert.deepEqual(readRecents(s), ["f", "e", "d", "c", "b"]);
  writeRecents(s, "");
  assert.equal(readRecents(s).length, 5);
});

test("writeRecents returns [] instead of throwing on a blocked storage", () => {
  const throwing = {
    getItem: () => null,
    setItem() {
      throw new Error("quota");
    },
  };
  assert.deepEqual(writeRecents(throwing, "a"), []);
});

// ------------------------------------------------------------ defaultPair ---

test("defaultPair leads with the two most recent picks when both still exist", () => {
  const [a, b] = defaultPair(MODELS, ["openai/gpt-5.5-xhigh", "anthropic/claude-sonnet-4.6"]);
  assert.equal(a, "openai/gpt-5.5-xhigh");
  assert.equal(b, "anthropic/claude-sonnet-4.6");
});

test("defaultPair ignores stored names that no longer exist in the data", () => {
  const [a, b] = defaultPair(MODELS, ["ghost/model-9", "openai/gpt-5.5-xhigh"]);
  assert.equal(a, "openai/gpt-5.5-xhigh");
  assert.notEqual(b, a);
});

test("defaultPair never returns the same model twice", () => {
  const [a, b] = defaultPair(MODELS, ["openai/gpt-5.5-xhigh"]);
  assert.notEqual(a, b);
  assert.ok(MODELS.some((m) => m.benchmark_name === a));
  assert.ok(MODELS.some((m) => m.benchmark_name === b));
});

test("defaultPair falls back to two distinct models with no recents at all", () => {
  const [a, b] = defaultPair(MODELS, []);
  assert.notEqual(a, b);
  assert.ok(a.length > 0 && b.length > 0);
});

test("defaultPair prefers claude-fable-5-1-max-effort and gpt-6-astra-max when present", () => {
  const modelsWithNewDefaults = [
    ...MODELS,
    mk("claude-fable-5-1-max-effort", { vendor: "anthropic", family: "claude-fable-5.1", effort: "max" }),
    mk("gpt-6-astra-max", { vendor: "openai", family: "gpt-6-astra", effort: "max" }),
  ];
  const [a, b] = defaultPair(modelsWithNewDefaults, []);
  assert.equal(a, "claude-fable-5-1-max-effort");
  assert.equal(b, "gpt-6-astra-max");
});

test("defaultPair copes with a single-model dataset without looping", () => {
  const only = [mk("solo/model", { vendor: "other", family: "solo" })];
  const [a, b] = defaultPair(only, []);
  assert.equal(a, "solo/model");
  assert.equal(b, "solo/model");
});
