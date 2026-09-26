import { test } from "node:test";
import assert from "node:assert/strict";
import { EFFORT_LEVELS, parseEffort } from "../effort.mjs";

test("EFFORT_LEVELS exports levels in display order (strongest first)", () => {
  assert.deepEqual(EFFORT_LEVELS, ["max", "xhigh", "high", "medium", "low"]);
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
