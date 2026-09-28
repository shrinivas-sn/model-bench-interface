import test from "node:test";
import assert from "node:assert/strict";
import {
  formatCostPerQuestion,
  formatTokenCount,
  calculateWorkloadCost,
  formatWorkloadCost,
  calculateCostComparison,
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

test("calculateCostComparison handles models with identical costs", () => {
  const modelA = { cost: { cost_per_question: 0.25, avg_output_tokens: 5000 } };
  const modelB = { cost: { cost_per_question: 0.25, avg_output_tokens: 5000 } };

  const comp = calculateCostComparison(modelA, modelB, 100);
  assert.equal(comp.cheaperSlot, "equal");
  assert.equal(comp.costRatio, 1);
  assert.equal(comp.savings, 0);
  assert.equal(comp.tokenLeader, "equal");
  assert.equal(comp.tokenMultiplier, 1);
});

test("effortVarianceInsight extracts sibling reasoning effort variance", () => {
  const modelMax = {
    benchmark_name: "claude-opus-5-5-max-effort",
    family_id: "anthropic/claude-opus-5.5",
    effort: "max",
    cost: { cost_per_question: 0.6651, avg_output_tokens: 25610 },
  };
  const modelXHigh = {
    benchmark_name: "claude-opus-5-5-xhigh-effort",
    family_id: "anthropic/claude-opus-5.5",
    effort: "xhigh",
    cost: { cost_per_question: 0.1992, avg_output_tokens: 7508 },
  };

  const insight = effortVarianceInsight(modelMax, [modelMax, modelXHigh]);
  assert.ok(insight);
  assert.equal(insight.currentEffort, "MAX");
  assert.equal(insight.otherEffort, "XHIGH");
  assert.equal(insight.costRatio, 3.34);
  assert.equal(insight.tokenRatio, 3.41);
});
