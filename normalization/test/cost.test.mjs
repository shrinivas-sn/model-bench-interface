import test from "node:test";
import assert from "node:assert/strict";
import {
  formatCostPerQuestion,
  formatTokenCount,
  calculateWorkloadCost,
  formatWorkloadCost,
  calculateCostComparison,
  resolveModelForEffort,
  effortVarianceInsight,
} from "../../lib/cost.mjs";

test("formatCostPerQuestion formats dollars with appropriate precision", () => {
  assert.equal(formatCostPerQuestion(1.0108), "$1.011");
  assert.equal(formatCostPerQuestion(0.6651), "$0.6651");
  assert.equal(formatCostPerQuestion(0.0105), "$0.0105");
  assert.equal(formatCostPerQuestion(0), "free");
  assert.equal(formatCostPerQuestion(null), "—");
  assert.equal(formatCostPerQuestion(undefined), "—");
});

test("formatTokenCount formats counts into readable k and M strings", () => {
  assert.equal(formatTokenCount(25610), "25.6k");
  assert.equal(formatTokenCount(7508), "7.5k");
  assert.equal(formatTokenCount(980), "980");
  assert.equal(formatTokenCount(1500000), "1.5M");
  assert.equal(formatTokenCount(0), "0");
  assert.equal(formatTokenCount(null), "—");
});

test("calculateWorkloadCost multiplies cost per question by query volume", () => {
  assert.equal(calculateWorkloadCost(0.6651, 1000), 665.1);
  assert.equal(calculateWorkloadCost(0.1992, 1000), 199.2);
  assert.equal(calculateWorkloadCost(null, 1000), null);
  assert.equal(calculateWorkloadCost(0.5, 0), null);
});

test("formatWorkloadCost formats currency sums cleanly", () => {
  assert.equal(formatWorkloadCost(665.1), "$665.10");
  assert.equal(formatWorkloadCost(199.2), "$199.20");
  assert.equal(formatWorkloadCost(15420), "$15,420");
  assert.equal(formatWorkloadCost(0), "free");
  assert.equal(formatWorkloadCost(null), "—");
});

test("calculateCostComparison computes cost ratios, savings and token multipliers", () => {
  const modelA = {
    benchmark_name: "claude-opus-5-5-max-effort",
    cost: {
      cost_per_question: 0.6651,
      avg_input_tokens: 1247,
      avg_output_tokens: 25610,
    },
  };
  const modelB = {
    benchmark_name: "claude-opus-5-5-xhigh-effort",
    cost: {
      cost_per_question: 0.1992,
      avg_input_tokens: 1253,
      avg_output_tokens: 7508,
    },
  };

  const comp = calculateCostComparison(modelA, modelB, 1000);
  assert.equal(comp.cheaperSlot, "B");
  assert.equal(comp.costRatio, 3.34);
  assert.equal(Math.round(comp.savings), 466);
  assert.equal(comp.tokenLeader, "A");
  assert.equal(comp.tokenMultiplier, 3.41);
});

test("resolveModelForEffort returns exact variant when one exists in family", () => {
  const maxModel = {
    benchmark_name: "claude-opus-5-5-max-effort",
    family_id: "anthropic/claude-opus-5.5",
    effort: "max",
    cost: { cost_per_question: 0.6651, avg_output_tokens: 25610 },
  };
  const xhighModel = {
    benchmark_name: "claude-opus-5-5-xhigh-effort",
    family_id: "anthropic/claude-opus-5.5",
    effort: "xhigh",
    cost: { cost_per_question: 0.1992, avg_output_tokens: 7508 },
  };

  const resolved = resolveModelForEffort(maxModel, "xhigh", [maxModel, xhighModel]);
  assert.equal(resolved.benchmark_name, "claude-opus-5-5-xhigh-effort");
  assert.equal(resolved.isEvaluated, true);
  assert.equal(resolved.isCalculated, false);
  assert.equal(resolved.cost.cost_per_question, 0.1992);
});

test("resolveModelForEffort dynamically scales token volume, cost, and capability for un-evaluated tiers", () => {
  const geminiHigh = {
    benchmark_name: "gemini-3.8-flash-high",
    family_id: "google/gemini-3.8-flash",
    effort: "high",
    cost: {
      input_price_per_million: 0.75,
      output_price_per_million: 3.75,
      cost_per_question: 0.233,
      avg_input_tokens: 607424,
      avg_output_tokens: 42786,
    },
    categories: { Mathematics: 91.56, Coding: 72.49, Language: 87.79 },
  };

  const resolvedLow = resolveModelForEffort(geminiHigh, "low", [geminiHigh]);
  assert.equal(resolvedLow.isEvaluated, false);
  assert.equal(resolvedLow.isCalculated, true);
  assert.equal(resolvedLow.activeEffort, "low");
  assert.equal(resolvedLow.cost.avg_output_tokens, Math.round(42786 * 0.2));
  assert.ok(resolvedLow.cost.cost_per_question < 0.233);
  assert.ok(resolvedLow.categories.Mathematics < 91.56);
});

test("effortVarianceInsight generates informative context for calculated and evaluated models", () => {
  const modelCalculated = {
    benchmark_name: "gemini-3.8-flash-high",
    effort: "low",
    activeEffort: "low",
    baselineEffort: "high",
    isCalculated: true,
    tokenMultiplier: 0.2,
    cost: { cost_per_question: 0.048, avg_output_tokens: 8557 },
  };

  const insight = effortVarianceInsight(modelCalculated, []);
  assert.equal(insight.type, "calculated");
  assert.equal(insight.currentEffort, "LOW");
  assert.ok(insight.message.includes("LOW reasoning"));
});
