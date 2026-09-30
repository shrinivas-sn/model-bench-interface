import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildAliasIndex } from "../registry.mjs";
import { resolveSourceModel } from "../manual-aliases.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const manual = JSON.parse(readFileSync(join(__dirname, "..", "manual-aliases.json"), "utf8"));

test("resolveSourceModel matches reviewed manual alias with method: manual", () => {
  const aliasIndex = buildAliasIndex([
    { source_id: "anthropic/claude-fable-5.1", title: "Anthropic: Claude Fable 5.1" },
    { source_id: "openai/gpt-6-astra", title: "OpenAI: GPT-6 Astra" },
  ]);

  const hit = resolveSourceModel({
    aliasIndex,
    manual,
    source: "terminal-bench",
    org: "Anthropic",
    label: "Fable 5.1",
  });

  assert.deepEqual(hit, {
    canonical: "anthropic/claude-fable-5.1",
    method: "manual",
  });
});

test("resolveSourceModel falls back to standard alias resolution when no manual override", () => {
  const aliasIndex = buildAliasIndex([
    { source_id: "anthropic/claude-fable-5.1", title: "Anthropic: Claude Fable 5.1" },
    { source_id: "openai/gpt-6-astra", title: "OpenAI: GPT-6 Astra" },
  ]);

  const hit = resolveSourceModel({
    aliasIndex,
    manual,
    source: "terminal-bench",
    org: "OpenAI",
    label: "GPT-6 Astra",
  });

  assert(hit !== null);
  assert.equal(hit.canonical, "openai/gpt-6-astra");
  assert.notEqual(hit.method, "manual");
});

test("resolveSourceModel returns null for unknown models", () => {
  const aliasIndex = buildAliasIndex([
    { source_id: "anthropic/claude-fable-5.1", title: "Anthropic: Claude Fable 5.1" },
    { source_id: "openai/gpt-6-astra", title: "OpenAI: GPT-6 Astra" },
  ]);

  const hit = resolveSourceModel({
    aliasIndex,
    manual,
    source: "terminal-bench",
    org: "Anthropic",
    label: "Haiku 9",
  });

  assert.equal(hit, null);
});
