/**
 * Cost & Workload Estimation for LLM Benchmarking
 *
 * Provides pure functions for formatting benchmark costs, calculating workload
 * projections, reasoning token multipliers, and cost efficiency comparisons.
 */

/**
 * Format benchmark cost per question / task.
 * e.g. 0.6651 -> "$0.6651", 0.0105 -> "$0.0105", null -> "—"
 */
export function formatCostPerQuestion(cost) {
  if (cost == null || !Number.isFinite(cost)) return "—";
  if (cost === 0) return "free";
  if (cost >= 1) return `$${cost.toFixed(3)}`;
  if (cost >= 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(4)}`;
}

/**
 * Format token counts with metric suffixes (k, M).
 * e.g. 25610 -> "25.6k", 980 -> "980", null -> "—"
 */
export function formatTokenCount(tokens) {
  if (tokens == null || !Number.isFinite(tokens)) return "—";
  if (tokens === 0) return "0";
  if (tokens >= 1_000_000) {
    const val = tokens / 1_000_000;
    return `${Number(val.toFixed(2))}M`;
  }
  if (tokens >= 1_000) {
    const val = tokens / 1_000;
    return `${Number(val.toFixed(1))}k`;
  }
  return String(Math.round(tokens));
}

/**
 * Calculate total workload cost for a given number of benchmark queries.
 */
export function calculateWorkloadCost(costPerQuestion, queryCount) {
  if (costPerQuestion == null || !Number.isFinite(costPerQuestion) || queryCount <= 0) {
    return null;
  }
  return costPerQuestion * queryCount;
}

/**
 * Format total workload cost nicely.
 * e.g. 665.1 -> "$665.10", 12500 -> "$12,500"
 */
export function formatWorkloadCost(cost) {
  if (cost == null || !Number.isFinite(cost)) return "—";
  if (cost === 0) return "free";
  if (cost >= 10_000) {
    return `$${Math.round(cost).toLocaleString("en-US")}`;
  }
  if (cost >= 1) {
    return `$${cost.toFixed(2)}`;
  }
  return `$${cost.toFixed(3)}`;
}

/**
 * Compare two models across cost per question, total workload, and token output volume.
 */
export function calculateCostComparison(modelA, modelB, queryCount = 1000) {
  const costPerQA = modelA?.cost?.cost_per_question ?? null;
  const costPerQB = modelB?.cost?.cost_per_question ?? null;

  const totalCostA = calculateWorkloadCost(costPerQA, queryCount);
  const totalCostB = calculateWorkloadCost(costPerQB, queryCount);

  const tokensOutA = modelA?.cost?.avg_output_tokens ?? null;
  const tokensOutB = modelB?.cost?.avg_output_tokens ?? null;
  const tokensInA = modelA?.cost?.avg_input_tokens ?? null;
  const tokensInB = modelB?.cost?.avg_input_tokens ?? null;

  let cheaperSlot = null;
  let costRatio = null;
  let savings = null;

  if (totalCostA != null && totalCostB != null) {
    const diff = totalCostA - totalCostB;
    if (Math.abs(diff) < 0.0001) {
      cheaperSlot = "equal";
      costRatio = 1;
      savings = 0;
    } else if (totalCostA < totalCostB) {
      cheaperSlot = "A";
      costRatio = totalCostA > 0 ? Number((totalCostB / totalCostA).toFixed(2)) : null;
      savings = totalCostB - totalCostA;
    } else {
      cheaperSlot = "B";
      costRatio = totalCostB > 0 ? Number((totalCostA / totalCostB).toFixed(2)) : null;
      savings = totalCostA - totalCostB;
    }
  }

  let tokenMultiplier = null;
  let tokenLeader = null;

  if (tokensOutA != null && tokensOutB != null) {
    if (tokensOutA > tokensOutB) {
      tokenLeader = "A";
      tokenMultiplier = tokensOutB > 0 ? Number((tokensOutA / tokensOutB).toFixed(2)) : null;
    } else if (tokensOutB > tokensOutA) {
      tokenLeader = "B";
      tokenMultiplier = tokensOutA > 0 ? Number((tokensOutB / tokensOutA).toFixed(2)) : null;
    } else {
      tokenLeader = "equal";
      tokenMultiplier = 1;
    }
  }

  return {
    queryCount,
    costPerQA,
    costPerQB,
    totalCostA,
    totalCostB,
    tokensOutA,
    tokensOutB,
    tokensInA,
    tokensInB,
    cheaperSlot,
    costRatio,
    savings,
    tokenLeader,
    tokenMultiplier,
  };
}

/**
 * Returns insight on reasoning effort cost scaling within the same model family if sibling variants exist.
 */
export function effortVarianceInsight(model, allModels = []) {
  if (!model?.family_id && !model?.canonical_id) return null;
  const familyId = model.family_id || model.canonical_id;
  const siblings = allModels.filter(
    (m) =>
      m.benchmark_name !== model.benchmark_name &&
      ((model.family_id && m.family_id === model.family_id) ||
        (model.canonical_id && m.canonical_id === model.canonical_id)) &&
      m.cost?.cost_per_question != null
  );

  if (!siblings.length || model.cost?.cost_per_question == null) return null;

  const currentCost = model.cost.cost_per_question;
  const currentTokens = model.cost.avg_output_tokens;
  const currentEffort = (model.effort || "standard").toUpperCase();

  // Find a baseline sibling (e.g. lower effort variant)
  const other = siblings[0];
  const otherCost = other.cost.cost_per_question;
  const otherTokens = other.cost.avg_output_tokens;
  const otherEffort = (other.effort || "standard").toUpperCase();

  const costRatio = Number((currentCost / otherCost).toFixed(2));
  let tokenRatio = null;
  if (currentTokens != null && otherTokens != null && otherTokens > 0) {
    tokenRatio = Number((currentTokens / otherTokens).toFixed(2));
  }

  return {
    currentEffort,
    otherEffort,
    otherName: other.benchmark_name,
    costRatio,
    tokenRatio,
    currentCost,
    otherCost,
  };
}
