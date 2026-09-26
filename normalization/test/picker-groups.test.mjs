import { test } from "node:test";
import assert from "node:assert/strict";
import { groupModels } from "../../lib/picker.mjs";

test("groupModels groups models by display_vendor with families and ordered effort variants", () => {
  const models = [
    {
      benchmark_name: "claude-opus-5-5-xhigh-effort",
      canonical_id: "anthropic/claude-opus-5.5",
      display_vendor: "anthropic",
      family_id: "anthropic/claude-opus-5.5",
      effort: "xhigh",
      thinking: false,
      categories: { coding: 80, math: 70 },
      pricing: { prompt: 15, completion: 75, source: "openrouter" },
    },
    {
      benchmark_name: "claude-opus-5-5-max-effort",
      canonical_id: "anthropic/claude-opus-5.5",
      display_vendor: "anthropic",
      family_id: "anthropic/claude-opus-5.5",
      effort: "max",
      thinking: false,
      categories: { coding: 85, math: 75 },
      pricing: { prompt: 15, completion: 75, source: "openrouter" },
    },
    {
      benchmark_name: "claude-sonnet-4-6",
      canonical_id: "anthropic/claude-sonnet-4.6",
      display_vendor: "anthropic",
      family_id: "anthropic/claude-sonnet-4.6",
      effort: null,
      thinking: false,
      categories: { coding: 78, math: 68 },
      pricing: { prompt: 3, completion: 15, source: "openrouter" },
    },
    {
      benchmark_name: "gpt-5.4-xhigh",
      canonical_id: "openai/gpt-5.4",
      display_vendor: "openai",
      family_id: "openai/gpt-5.4",
      effort: "xhigh",
      thinking: false,
      categories: { coding: 82, math: 80 },
      pricing: { prompt: 10, completion: 40, source: "openrouter" },
    },
    {
      benchmark_name: "inkling-xhigh",
      canonical_id: null,
      display_vendor: "other",
      family_id: "inkling",
      effort: "xhigh",
      thinking: false,
      categories: { coding: 60, math: 50 },
      pricing: null,
    },
  ];

  const vendorDisplay = {
    anthropic: "Anthropic",
    openai: "OpenAI",
    other: "Other",
  };

  const groups = groupModels(models, vendorDisplay);

  // Vendors ordered by model count descending, with "other" last
  assert.equal(groups.length, 3);
  assert.equal(groups[0].vendor, "anthropic");
  assert.equal(groups[0].vendor_name, "Anthropic");
  assert.equal(groups[0].model_count, 3);

  assert.equal(groups[1].vendor, "openai");
  assert.equal(groups[1].vendor_name, "OpenAI");
  assert.equal(groups[1].model_count, 1);

  assert.equal(groups[2].vendor, "other");
  assert.equal(groups[2].vendor_name, "Other");
  assert.equal(groups[2].model_count, 1);

  // Anthropic families: Opus 5.5 and Sonnet 4.6
  const opusFamily = groups[0].families.find((f) => f.family_id === "anthropic/claude-opus-5.5");
  assert.ok(opusFamily, "Opus 5.5 family should exist");
  assert.equal(opusFamily.variants.length, 2);
  // Variants ordered in EFFORT_LEVELS order: max first, then xhigh
  assert.equal(opusFamily.variants[0].effort, "max");
  assert.equal(opusFamily.variants[1].effort, "xhigh");

  // Unmatched row exists under its display_vendor ("other")
  const otherFamily = groups[2].families.find((f) => f.family_id === "inkling");
  assert.ok(otherFamily, "Unmatched model inkling should exist in other group");
  assert.equal(otherFamily.variants[0].benchmark_name, "inkling-xhigh");
});
