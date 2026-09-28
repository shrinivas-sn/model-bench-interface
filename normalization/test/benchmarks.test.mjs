import { test } from "node:test";
import assert from "node:assert/strict";
import {
  extractSweBenchSummary,
  buildOfficialBenchmarkComparison,
} from "../../lib/benchmarks.mjs";

test("extractSweBenchSummary returns highest score and top agent", () => {
  const sweRows = [
    {
      canonical_id: "anthropic/claude-opus-4.5",
      resolved_pct: 76.8,
      agent: "EPAM AI/Run",
      system: "EPAM v1",
      run_date: "2025-08-04",
      url: "https://example.com/1",
    },
    {
      canonical_id: "anthropic/claude-opus-4.5",
      resolved_pct: 79.2,
      agent: "Sonar Foundation Agent",
      system: "Sonar v2",
      run_date: "2025-12-05",
      url: "https://example.com/2",
    },
    {
      canonical_id: "openai/gpt-5",
      resolved_pct: 74.4,
      agent: "live-SWE-agent",
      system: "live-SWE",
      run_date: "2025-12-15",
      url: "https://example.com/3",
    },
  ];

  const summary = extractSweBenchSummary("anthropic/claude-opus-4.5", sweRows);
  assert.ok(summary);
  assert.equal(summary.best, 79.2);
  assert.equal(summary.totalRuns, 2);
  assert.equal(summary.topAgent, "Sonar Foundation Agent");
  assert.equal(summary.url, "https://example.com/2");
});

test("extractSweBenchSummary returns null for unmatched canonical id", () => {
  const summary = extractSweBenchSummary("non-existent-model", []);
  assert.equal(summary, null);
});

test("buildOfficialBenchmarkComparison synthesizes official benchmark cards", () => {
  const modelA = {
    canonical_id: "anthropic/claude-opus-4.5",
    categories: { coding: 80.0, reasoning: 85.0 },
    tasks: {
      code_generation: 88.5,
      code_completion: 82.0,
      python: 90.0,
      typescript: 87.0,
    },
    external_benchmarks: {
      artificial_analysis: {
        coding_index: 81.6,
        agentic_index: 57.9,
        intelligence_index: 53.4,
      },
      design_arena: [
        { arena: "models", category: "website", elo: 1360, win_rate: 60.9, rank: 2 },
      ],
    },
  };

  const modelB = {
    canonical_id: "google/gemini-3.8-flash",
    categories: { coding: 75.0, reasoning: 78.0 },
    tasks: {
      code_generation: 81.0,
      code_completion: 79.0,
      python: 84.0,
      typescript: 82.0,
    },
    external_benchmarks: {
      artificial_analysis: {
        coding_index: 76.3,
        agentic_index: 40.2,
        intelligence_index: 40.9,
      },
    },
  };

  const sweRows = [
    {
      canonical_id: "anthropic/claude-opus-4.5",
      resolved_pct: 79.2,
      agent: "Sonar Foundation Agent",
    },
  ];

  const items = buildOfficialBenchmarkComparison(modelA, modelB, sweRows);
  assert.ok(items.length >= 6);

  const sweItem = items.find((i) => i.id === "swe-bench-verified");
  assert.ok(sweItem);
  assert.equal(sweItem.valA, 79.2);
  assert.equal(sweItem.valB, null);

  const aaCoding = items.find((i) => i.id === "aa-coding-index");
  assert.ok(aaCoding);
  assert.equal(aaCoding.valA, 81.6);
  assert.equal(aaCoding.valB, 76.3);

  const aaAgentic = items.find((i) => i.id === "aa-agentic-index");
  assert.ok(aaAgentic);
  assert.equal(aaAgentic.valA, 57.9);
  assert.equal(aaAgentic.valB, 40.2);

  const websiteDesign = items.find((i) => i.id === "design-arena-website");
  assert.ok(websiteDesign);
  assert.equal(websiteDesign.valA, 1360);
});
