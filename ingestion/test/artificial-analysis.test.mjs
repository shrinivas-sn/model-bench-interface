import { test } from "node:test";
import assert from "node:assert/strict";
import {
  toItem,
  splitEffort,
  makeFetchImpl,
} from "../sources/artificial-analysis.mjs";

test("toItem extracts indices, prices and speed from documented API model object", () => {
  const model = {
    id: "36f73aaf-d38a-4b56-a2b3-d04d17186910",
    name: "gpt-oss-20B (high)",
    slug: "gpt-oss-20b",
    model_creator: { name: "OpenAI" },
    release_date: "2025-08-05",
    evaluations: {
      artificial_analysis_intelligence_index: 24.5,
      artificial_analysis_coding_index: 18.5,
      artificial_analysis_agentic_index: 27.6,
    },
    pricing: {
      price_1m_input_tokens: 0.06,
      price_1m_output_tokens: 0.2,
    },
    performance: {
      median_output_tokens_per_second: 296.47,
      median_time_to_first_token_seconds: 0.65,
    },
  };

  const item = toItem(model);
  assert.equal(item.intelligence_index, 24.5);
  assert.equal(item.coding_index, 18.5);
  assert.equal(item.agentic_index, 27.6);
  assert.equal(item.price_in, 0.06);
  assert.equal(item.output_tps, 296.47);
  assert.equal(item.creator, "OpenAI");
});

test("toItem returns null for numeric fields when missing", () => {
  const item = toItem({ id: "x", name: "M" });
  assert.equal(item.source_id, "x");
  assert.equal(item.name, "M");
  assert.equal(item.intelligence_index, null);
  assert.equal(item.coding_index, null);
  assert.equal(item.agentic_index, null);
  assert.equal(item.price_in, null);
  assert.equal(item.price_out, null);
  assert.equal(item.output_tps, null);
  assert.equal(item.ttft_s, null);
});

test("splitEffort extracts valid reasoning efforts from model names", () => {
  assert.deepEqual(splitEffort("Claude Opus 5.5 (max)"), {
    base: "Claude Opus 5.5",
    effort: "max",
  });
  assert.deepEqual(splitEffort("GPT-6 Astra"), {
    base: "GPT-6 Astra",
    effort: null,
  });
  assert.deepEqual(splitEffort("Model (Reasoning)"), {
    base: "Model (Reasoning)",
    effort: null,
  });
});

test("makeFetchImpl paginates and passes API key header", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  const modelA = {
    id: "a",
    name: "Model A",
    evaluations: { artificial_analysis_intelligence_index: 50 },
  };
  const modelB = {
    id: "b",
    name: "Model B",
    evaluations: { artificial_analysis_intelligence_index: 60 },
  };

  globalThis.fetch = async (url, opts) => {
    calls.push({ url: String(url), headers: opts?.headers });
    const u = new URL(url);
    const page = u.searchParams.get("page");
    if (page === "1") {
      return new Response(
        JSON.stringify({
          pagination: { has_more: true },
          data: [modelA],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({
        pagination: { has_more: false },
        data: [modelB],
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  };

  try {
    const fetchImpl = makeFetchImpl("test-key-123");
    const res = await fetchImpl("https://artificialanalysis.ai/api/v2/language/models/free");
    assert.equal(res.status, 200);
    const items = await res.json();
    assert.equal(items.length, 2);
    assert.equal(items[0].source_id, "a");
    assert.equal(items[1].source_id, "b");
    assert.equal(calls.length, 2);
    assert.equal(calls[0].headers["x-api-key"], "test-key-123");
    assert.equal(calls[1].headers["x-api-key"], "test-key-123");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
