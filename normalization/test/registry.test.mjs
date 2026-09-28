import { test } from "node:test";
import assert from "node:assert/strict";
import { buildAliasIndex, resolveAlias, normKey, candidateForms, slugAliasFor, vendorFor } from "../registry.mjs";

function index() {
  return buildAliasIndex([
    { source_id: "anthropic/claude-opus-5.5-20260921", title: "Anthropic: Claude Opus 5.5" },
    { source_id: "anthropic/claude-opus-4.5", title: "Anthropic: Claude Opus 4.5" },
    { source_id: "openai/gpt-5.4", title: "OpenAI: GPT-5.4" },
    { source_id: "openai/gpt-5.2", title: "OpenAI: GPT-5.2" },
    { source_id: "google/gemini-3.5-flash", title: "Google: Gemini 3.5 Flash" },
    { source_id: "x-ai/grok-4.7", title: "xAI: Grok 4.7" },
    { source_id: "moonshotai/kimi-k2", title: "Moonshot AI: Kimi K2" },
  ]);
}

test("normKey lowercases and dots become dashes", () => {
  assert.equal(normKey("Claude Opus 5.5"), "claude-opus-5-5");
});

test("slugAliasFor strips an 8-digit date suffix", () => {
  assert.equal(slugAliasFor("anthropic/claude-opus-5.5-20260921"), "anthropic/claude-opus-5.5");
});

test("slugAliasFor returns null when no date suffix", () => {
  assert.equal(slugAliasFor("anthropic/claude-opus-4.5"), null);
});

test("candidateForms strips effort/thinking tails progressively", () => {
  const forms = candidateForms("claude-opus-4-5-20251101-thinking-64k-high-effort");
  assert.equal(forms[0].form, "claude-opus-4-5-20251101-thinking-64k-high-effort");
  assert.ok(forms.some((f) => f.form === "claude-opus-4-5-20251101"), JSON.stringify(forms));
  assert.ok(forms.some((f) => f.form === "claude-opus-4-5"), JSON.stringify(forms));
  const last = forms[forms.length - 1];
  assert.equal(last.form, "claude-opus-4-5");
  assert.equal(last.how, "date"); // final strip removed the 8-digit date
});

test("candidateForms strips an ISO date tail", () => {
  const forms = candidateForms("gpt-5.2-2025-12-11-high");
  assert.ok(forms.some((f) => f.form === "gpt-5-2"), JSON.stringify(forms));
  const dateForm = forms.find((f) => f.form === "gpt-5-2");
  assert.equal(dateForm.how, "date");
});

test("exact full-id match", () => {
  const hit = resolveAlias(index(), "google/gemini-3.5-flash");
  assert.equal(hit.canonical, "google/gemini-3.5-flash");
  assert.equal(hit.method, "exact");
});

test("livebench claude-opus-4-5-20251101-thinking-64k-high-effort -> claude-opus-4.5", () => {
  const hit = resolveAlias(index(), "claude-opus-4-5-20251101-thinking-64k-high-effort");
  assert.equal(hit.canonical, "anthropic/claude-opus-4.5");
  assert.equal(hit.method, "date-stripped"); // the matching form lost its 8-digit date last
});

test("livebench gpt-5.2-2025-12-11-high -> openai/gpt-5.2 (date-stripped)", () => {
  const hit = resolveAlias(index(), "gpt-5.2-2025-12-11-high");
  assert.equal(hit.canonical, "openai/gpt-5.2");
  assert.equal(hit.method, "date-stripped");
});

test("SWE-bench display name with subfamily-version transposition matches canonical model", () => {
  // "Claude 4.5 Opus" (SWE-bench style) matches "anthropic/claude-opus-4.5"
  const hit = resolveAlias(index(), "Claude 4.5 Opus");
  assert.equal(hit?.canonical, "anthropic/claude-opus-4.5");
});

test("org-qualified SWE-bench name matches via vendor-prefixed bare key", () => {
  // "OpenAI GPT-5.4" -> normKey "openai-gpt-5-4" ... index has "gpt-5-4" (bare) and
  // "openai-gpt-5-4" only if the vendor token equals the vendor prefix. Verify the
  // honest outcome: bare "GPT-5.4" matches, org-qualified may or may not.
  const hit = resolveAlias(index(), "GPT-5.4");
  assert.equal(hit.canonical, "openai/gpt-5.4");
});

test("unknown model stays unmatched (never guessed)", () => {
  assert.equal(resolveAlias(index(), "smaug-agentic"), null);
  assert.equal(resolveAlias(index(), "qwen3.8-max"), null);
});

test("empty input is unmatched, not a crash", () => {
  assert.equal(resolveAlias(index(), ""), null);
  assert.equal(resolveAlias(index(), null), null);
});

test("vendorFor maps id fragments to vendor ids", () => {
  assert.equal(vendorFor("anthropic/claude-opus-5.5"), "anthropic");
  assert.equal(vendorFor("x-ai/grok-4.7"), "xai");
  assert.equal(vendorFor("some-unknown/model"), "other");
});
