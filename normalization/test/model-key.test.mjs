import { test } from "node:test";
import assert from "node:assert/strict";
import { nameKey, linkModelKeys, pickerModels } from "../model-key.mjs";

test("nameKey ignores case, punctuation and a vendor prefix", () => {
  assert.equal(nameKey("Qwen3.8 Max"), "qwen38max");
  assert.equal(nameKey("qwen3-8-max"), "qwen38max");
  assert.equal(nameKey("deepseek/deepseek-v4-flash-vision"), "deepseekv4flashvision");
  assert.equal(nameKey(""), "");
});

test("linkModelKeys joins sources on canonical id, then on identical names", () => {
  const data = {
    livebench: [
      { benchmark_name: "claude-opus-5.5", canonical_id: "anthropic/claude-opus-5.5" },
      { benchmark_name: "qwen3.8-max", canonical_id: null },
      { benchmark_name: "deepseek-v4-flash-vision", canonical_id: null },
    ],
    terminal_bench: [{ model_label: "Opus 5.5", canonical_id: "anthropic/claude-opus-5.5" }],
    artificial_analysis: [
      { name: "Claude Opus 5.5 (Low, Default Fallback)", canonical_id: "anthropic/claude-opus-5.5" },
      { name: "Qwen3.8 Max", canonical_id: null },
      { name: "DeepSeek V4 Flash Vision (Max)", canonical_id: null },
      { name: "Qwen3.8 Max (0902)", canonical_id: "qwen/qwen3.8-max-0902" },
    ],
  };
  linkModelKeys(data);
  assert.equal(data.livebench[0].model_key, "anthropic/claude-opus-5.5");
  assert.equal(data.terminal_bench[0].model_key, "anthropic/claude-opus-5.5");
  assert.equal(data.artificial_analysis[0].model_key, "anthropic/claude-opus-5.5");
  // Unmatched on OpenRouter, same name in both sources: one key.
  assert.equal(data.livebench[1].model_key, "name:qwen38max");
  assert.equal(data.artificial_analysis[1].model_key, "name:qwen38max");
  assert.equal(data.livebench[2].model_key, data.artificial_analysis[2].model_key);
  // A dated version stays its own model.
  assert.equal(data.artificial_analysis[3].model_key, "qwen/qwen3.8-max-0902");
});

test("linkModelKeys adopts a canonical id when an unmatched name equals a matched one", () => {
  const data = {
    livebench: [{ benchmark_name: "gemma-4-31b", canonical_id: "google/gemma-4-31b" }],
    terminal_bench: [],
    artificial_analysis: [{ name: "Gemma 4 31B (Reasoning)", canonical_id: null }],
  };
  linkModelKeys(data);
  assert.equal(data.artificial_analysis[0].model_key, "google/gemma-4-31b");
});

test("linkModelKeys never joins a name that points at two different models", () => {
  const data = {
    livebench: [],
    terminal_bench: [
      { model_label: "Flash", canonical_id: "a/flash" },
      { model_label: "Flash", canonical_id: "b/flash" },
    ],
    artificial_analysis: [{ name: "Flash", canonical_id: null }],
  };
  linkModelKeys(data);
  assert.equal(data.artificial_analysis[0].model_key, "name:flash");
});

const NOW = "2026-10-20T00:00:00Z";
const CATALOG = [
  { id: "anthropic/claude-opus-5.5", title: "Anthropic: Claude Opus 5.5", input_per_million: 4, output_per_million: 20, context_length: 1000000 },
  { id: "google/gemini-3.5-flash", title: "Google: Gemini 3.5 Flash", input_per_million: 0.3, output_per_million: 2.5, context_length: 1000000 },
  { id: "google/gemini-1.5-pro", title: "Google: Gemini 1.5 Pro", input_per_million: 1, output_per_million: 5, context_length: 2000000 },
  { id: "tinylab/tiny-1", title: "TinyLab: Tiny 1", input_per_million: 0.1, output_per_million: 0.1, context_length: 8000 },
];

test("pickerModels keeps LiveBench models and adds recent, priced models from labs LiveBench tracks", () => {
  const data = {
    livebench: [
      { benchmark_name: "claude-opus-5.5", canonical_id: "anthropic/claude-opus-5.5", model_key: "anthropic/claude-opus-5.5", family_id: "anthropic/claude-opus-5.5" },
      { benchmark_name: "gemini-4-argon", canonical_id: "google/gemini-4-argon", model_key: "google/gemini-4-argon", family_id: "google/gemini-4-argon" },
    ],
    terminal_bench: [{ model_label: "Qwen3.8 Max 0902", canonical_id: "qwen/qwen3.8-max-0902", model_key: "qwen/qwen3.8-max-0902", model_org: "Qwen" }],
    artificial_analysis: [
      { name: "Gemini 3.5 Flash (High)", canonical_id: "google/gemini-3.5-flash", model_key: "google/gemini-3.5-flash", effort: "high", release_date: "2026-08-01" },
      { name: "Gemini 3.5 Flash (Low)", canonical_id: "google/gemini-3.5-flash", model_key: "google/gemini-3.5-flash", effort: "low", release_date: "2026-08-01" },
      { name: "Gemini 1.5 Pro", canonical_id: "google/gemini-1.5-pro", model_key: "google/gemini-1.5-pro", effort: null, release_date: "2024-05-14" },
      { name: "Tiny 1", canonical_id: "tinylab/tiny-1", model_key: "tinylab/tiny-1", effort: null, release_date: "2026-10-01" },
      { name: "Unpriced Thing", canonical_id: null, model_key: "name:unpricedthing", effort: null, release_date: "2026-10-01" },
    ],
    catalog: CATALOG,
  };
  const models = pickerModels(data, { now: NOW, recentDays: 180 });
  const names = models.map((m) => m.benchmark_name);
  assert.deepEqual(names, ["claude-opus-5.5", "gemini-4-argon", "gemini-3.5-flash", "qwen3.8-max-0902"]);

  const flash = models.find((m) => m.benchmark_name === "gemini-3.5-flash");
  assert.equal(flash.on_livebench, false);
  assert.equal(flash.display_name, "Gemini 3.5 Flash");
  assert.equal(flash.model_key, "google/gemini-3.5-flash");
  assert.equal(flash.family_id, "google/gemini-3.5-flash");
  assert.equal(flash.overall, null);
  assert.deepEqual(flash.pricing, { input_per_million: 0.3, output_per_million: 2.5, source: "openrouter" });
  assert.equal(models[0].on_livebench, true);
});
