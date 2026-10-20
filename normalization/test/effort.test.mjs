import { test } from "node:test";
import assert from "node:assert/strict";
import { EFFORT_LEVELS, parseEffort, stripEffort, supportedEffortsFrom } from "../effort.mjs";

test("EFFORT_LEVELS exports levels in display order (strongest first)", () => {
  assert.deepEqual(EFFORT_LEVELS, ["max", "xhigh", "high", "medium", "low", "default", "minimal", "none"]);
});

test("claude-opus-5-5-max-effort -> max", () => {
  assert.deepEqual(parseEffort("claude-opus-5-5-max-effort"), {
    effort: "max",
    thinking: false,
  });
});

test("claude-opus-5-5-xhigh-effort -> xhigh", () => {
  assert.deepEqual(parseEffort("claude-opus-5-5-xhigh-effort"), {
    effort: "xhigh",
    thinking: false,
  });
});

test("claude-opus-4-5-20251101-thinking-64k-high-effort -> high, thinking true", () => {
  assert.deepEqual(
    parseEffort("claude-opus-4-5-20251101-thinking-64k-high-effort"),
    {
      effort: "high",
      thinking: true,
    }
  );
});

test("claude-sonnet-4-6-thinking-auto-medium-effort -> medium, thinking true", () => {
  assert.deepEqual(
    parseEffort("claude-sonnet-4-6-thinking-auto-medium-effort"),
    {
      effort: "medium",
      thinking: true,
    }
  );
});

test("gpt-5.4-xhigh -> xhigh", () => {
  assert.deepEqual(parseEffort("gpt-5.4-xhigh"), {
    effort: "xhigh",
    thinking: false,
  });
});

test("gemini-3.5-flash-high -> high", () => {
  assert.deepEqual(parseEffort("gemini-3.5-flash-high"), {
    effort: "high",
    thinking: false,
  });
});

test("qwen3.8-max -> null (bare -max is product tier, not effort)", () => {
  assert.deepEqual(parseEffort("qwen3.8-max"), {
    effort: null,
    thinking: false,
  });
});

test("gpt-6-sol-max -> null (bare -max is product tier, not effort)", () => {
  assert.deepEqual(parseEffort("gpt-6-sol-max"), {
    effort: null,
    thinking: false,
  });
});

test("glm-5.3 -> null, thinking false", () => {
  assert.deepEqual(parseEffort("glm-5.3"), {
    effort: null,
    thinking: false,
  });
});

test("kimi-k2.6-thinking -> null, thinking true", () => {
  assert.deepEqual(parseEffort("kimi-k2.6-thinking"), {
    effort: null,
    thinking: true,
  });
});

test("trailing -medium and -low without -effort suffix parse correctly", () => {
  assert.deepEqual(parseEffort("model-alpha-medium"), {
    effort: "medium",
    thinking: false,
  });
  assert.deepEqual(parseEffort("model-beta-low"), {
    effort: "low",
    thinking: false,
  });
});

test("empty or non-string input returns null effort and false thinking without crash", () => {
  assert.deepEqual(parseEffort(""), { effort: null, thinking: false });
  assert.deepEqual(parseEffort(null), { effort: null, thinking: false });
  assert.deepEqual(parseEffort(undefined), { effort: null, thinking: false });
});

test("stripEffort removes explicit effort suffixes", () => {
  assert.equal(stripEffort("claude-opus-5-5-xhigh-effort"), "claude-opus-5-5");
  assert.equal(stripEffort("qwen3.8-max"), "qwen3-8-max");
  assert.equal(stripEffort("gpt-5.4-xhigh"), "gpt-5-4");
  assert.equal(stripEffort("gemini-3.5-flash-high"), "gemini-3-5-flash");
  assert.equal(stripEffort("model-medium"), "model");
  assert.equal(stripEffort("model-low"), "model");
  assert.equal(stripEffort(""), "");
});

test("supportedEffortsFrom returns array only when reasoning.supported_efforts is non-empty", () => {
  assert.deepEqual(
    supportedEffortsFrom({ reasoning: { supported_efforts: ["high", "low"] } }),
    ["high", "low"]
  );
  assert.equal(
    supportedEffortsFrom({ supported_parameters: ["reasoning_effort"] }),
    null
  );
  assert.equal(supportedEffortsFrom({}), null);
});


// Every effort-word model name in LiveBench /v1/table_2026_06_25.csv (checked 20/10/2026).
// The 2026-10-14 release has none; bare -max stays null (product tier).
const LIVEBENCH_2026_06_25_VECTORS = [
  ["claude-opus-4-5-20251101-thinking-64k-high-effort", "high", true],
  ["claude-opus-4-6-thinking-auto-high-effort", "high", true],
  ["claude-opus-4-7-xhigh-effort", "xhigh", false],
  ["claude-sonnet-4-6-thinking-auto-medium-effort", "medium", true],
  ["claude-sonnet-5-xhigh-effort", "xhigh", false],
  ["gemini-3.1-pro-preview-high", "high", false],
  ["gemini-3.5-flash-high", "high", false],
  ["gpt-5.2-2025-12-11-high", "high", false],
  ["gpt-5.4-mini-xhigh", "xhigh", false],
  ["gpt-5.4-nano-xhigh", "xhigh", false],
  ["gpt-5.4-xhigh", "xhigh", false],
  ["gpt-5.5-xhigh", "xhigh", false],
  ["kimi-k2.6-thinking", null, true],
  ["minimax-m3", null, false],
  ["qwen3.7-max", null, false],
  ["gpt-5.6-sol-max", null, false],
  ["gpt-5.6-terra-max", null, false],
  ["gpt-5.6-luna-max", null, false],
  ["claude-fable-5-max-effort", "max", false],
  ["muse-spark-1.1-xhigh", "xhigh", false],
  ["inkling-xhigh", "xhigh", false],
  ["gemini-3.5-flash-lite-high", "high", false],
  ["gemini-3.6-flash-high", "high", false],
  ["claude-opus-5-max-effort", "max", false],
  ["claude-opus-4-8-max-effort", "max", false],
  ["qwen3.8-max", null, false],
  ["muse-spark-1.2-xhigh", "xhigh", false],
  ["gemini-3.7-flash-high", "high", false],
  ["ox-alpha-max", null, false],
  ["claude-fable-5-1-max-effort", "max", false],
  ["gemini-3.8-flash-high", "high", false],
  ["muse-spark-1.3-xhigh", "xhigh", false],
  ["gpt-6-astra-max", null, false],
  ["deepseek-v4.1-flash-max", null, false],
  ["grok-4.7-xhigh", "xhigh", false],
  ["claude-opus-5-5-max-effort", "max", false],
  ["claude-opus-5-5-xhigh-effort", "xhigh", false],
  ["gpt-6-sol-max", null, false],
  ["gpt-6-luna-max", null, false],
  ["claude-sonnet-5-5-max-effort", "max", false],
  ["claude-sonnet-5-5-xhigh-effort", "xhigh", false],
  ["gpt-6.1-sol-max", null, false],
  ["gpt-6.1-sol-xhigh", "xhigh", false],
  ["mistral-large-4-high", "high", false],
  ["claude-haiku-5-5-xhigh-effort", "xhigh", false],
  ["claude-haiku-5-5-max-effort", "max", false],
  ["muse-wonder-1.0-max", null, false],
];

test("every LiveBench 2026-06-25 effort-word name parses to its stated effort", () => {
  for (const [name, effort, thinking] of LIVEBENCH_2026_06_25_VECTORS) {
    assert.deepEqual(parseEffort(name), { effort, thinking }, name);
  }
});

test("Terminal-Bench none ranks below low", () => {
  assert.equal(EFFORT_LEVELS.at(-1), "none");
  assert.ok(EFFORT_LEVELS.indexOf("none") > EFFORT_LEVELS.indexOf("low"));
});
