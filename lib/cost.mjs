/**
 * Cost & Workload Estimation for LLM Benchmarking
 *
 * Provides pure functions for formatting benchmark costs, calculating workload
 * projections, reasoning token multipliers, dynamic effort tier resolution,
 * and cost efficiency comparisons.
 */

export const EFFORT_WEIGHTS = {
  low: 0.20,
  medium: 0.50,
  high: 1.00,
  xhigh: 1.75,
  max: 3.20,
  standard: 1.00,
  none: 1.00,
};

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
 * Computes exact per-question token cost breakdown (input cost, output cost, total).
 * Cost = (avg_input_tokens * input_price_per_m + avg_output_tokens * output_price_per_m) / 1_000_000
 */
export function calculateQuestionCostBreakdown(model) {
  if (!model) {
    return {
      inputTokens: 0,
      outputTokens: 0,
      inputPrice: 0,
      outputPrice: 0,
      inputCost: 0,
      outputCost: 0,
      totalCost: 0,
      hasPricing: false,
    };
  }

  const inputTokens = model.cost?.avg_input_tokens ?? 1500;
  const outputTokens = model.cost?.avg_output_tokens ?? 15000;
  const inputPrice = model.pricing?.input_per_million ?? model.cost?.input_price_per_million ?? 0;
  const outputPrice = model.pricing?.output_per_million ?? model.cost?.output_price_per_million ?? 0;

  const inputCost = (inputTokens * inputPrice) / 1_000_000;
  const outputCost = (outputTokens * outputPrice) / 1_000_000;
  const totalCost = model.cost?.cost_per_question ?? (inputCost + outputCost);
  const hasPricing = Boolean(inputPrice > 0 || outputPrice > 0);

  return {
    inputTokens,
    outputTokens,
    inputPrice,
    outputPrice,
    inputCost,
    outputCost,
    totalCost,
    hasPricing,
  };
}

/**
 * Resolves a model for a target reasoning effort tier.
 * If an exact benchmark run exists for that effort in the model's family, uses it.
 * Otherwise, scales output reasoning token volume, cost per question, and capability
 * score curves relative to the evaluated baseline tier.
 */
export function resolveModelForEffort(model, targetEffort, allModels = []) {
  if (!model) return null;
  const requested = (targetEffort || model.effort || "standard").toLowerCase();

  // 1. Check if an exact benchmark variant exists in the same family
  const familyVariants = allModels.filter(
    (v) =>
      (model.family_id && v.family_id === model.family_id) ||
      (model.canonical_id && v.canonical_id === model.canonical_id)
  );

  const exactVariant = familyVariants.find(
    (v) =>
      (v.effort && v.effort.toLowerCase() === requested) ||
      (!v.effort && (requested === "standard" || requested === "none"))
  );

  if (exactVariant) {
    return {
      ...exactVariant,
      activeEffort: requested,
      baselineEffort: exactVariant.effort || "standard",
      isEvaluated: true,
      isCalculated: false,
      tokenMultiplier: 1,
    };
  }

  // 2. Compute dynamic effort scaling from the baseline model
  const baseEffort = (model.effort || "high").toLowerCase();
  const weightBase = EFFORT_WEIGHTS[baseEffort] || 1.0;
  const weightTarget = EFFORT_WEIGHTS[requested] || 1.0;
  const scalingRatio = weightTarget / weightBase;

  // Output token scaling
  const baseOutTokens = model.cost?.avg_output_tokens ?? 15000;
  const baseInTokens = model.cost?.avg_input_tokens ?? 1500;
  const scaledOutTokens = Math.max(100, Math.round(baseOutTokens * scalingRatio));

  // Pricing (USD per million tokens)
  const inPricePerM =
    model.pricing?.input_per_million ?? model.cost?.input_price_per_million ?? 0;
  const outPricePerM =
    model.pricing?.output_per_million ?? model.cost?.output_price_per_million ?? 0;

  // Dynamic cost per question calculation
  let scaledCostPerQ = null;
  if (model.cost?.cost_per_question != null) {
    if (inPricePerM > 0 || outPricePerM > 0) {
      const baseNum = baseInTokens * inPricePerM + baseOutTokens * outPricePerM;
      const targetNum = baseInTokens * inPricePerM + scaledOutTokens * outPricePerM;
      if (baseNum > 0) {
        scaledCostPerQ = Number((model.cost.cost_per_question * (targetNum / baseNum)).toFixed(4));
      } else {
        scaledCostPerQ = Number((targetNum / 1_000_000).toFixed(4));
      }
    } else {
      scaledCostPerQ = Number(
        (model.cost.cost_per_question * (0.20 + 0.80 * scalingRatio)).toFixed(4)
      );
    }
  } else if (inPricePerM > 0 || outPricePerM > 0) {
    scaledCostPerQ = Number(
      ((baseInTokens * inPricePerM + scaledOutTokens * outPricePerM) / 1_000_000).toFixed(4)
    );
  }

  // Capability score scaling (logarithmic curve based on reasoning token multiplier)
  const logRatio = Math.log2(scalingRatio);
  const scaledCategories = {};
  if (model.categories) {
    for (const [cat, score] of Object.entries(model.categories)) {
      if (typeof score !== "number") continue;
      const isHighReasoning = /coding|math|reasoning|logic|data analysis/i.test(cat);
      const shift = isHighReasoning ? 3.0 * logRatio : 1.0 * logRatio;
      scaledCategories[cat] = Math.min(100, Math.max(0, Number((score + shift).toFixed(1))));
    }
  }

  // Task score scaling
  const scaledTasks = {};
  if (model.tasks) {
    for (const [task, score] of Object.entries(model.tasks)) {
      if (typeof score !== "number") continue;
      const shift = 2.5 * logRatio;
      scaledTasks[task] = Math.min(100, Math.max(0, Number((score + shift).toFixed(1))));
    }
  }

  return {
    ...model,
    effort: requested,
    activeEffort: requested,
    baselineEffort: baseEffort,
    isEvaluated: false,
    isCalculated: true,
    tokenMultiplier: Number(scalingRatio.toFixed(2)),
    categories: scaledCategories,
    tasks: scaledTasks,
    cost: {
      input_price_per_million: model.cost?.input_price_per_million ?? inPricePerM,
      output_price_per_million: model.cost?.output_price_per_million ?? outPricePerM,
      cost_per_question: scaledCostPerQ,
      avg_input_tokens: baseInTokens,
      avg_output_tokens: scaledOutTokens,
    },
  };
}

/**
 * Returns insight on reasoning effort cost scaling for the resolved model.
 */
export function effortVarianceInsight(resolvedModel, allModels = []) {
  if (!resolvedModel) return null;
  const currentEffort = (resolvedModel.activeEffort || resolvedModel.effort || "standard").toUpperCase();
  const costQ = resolvedModel.cost?.cost_per_question;
  const tokens = resolvedModel.cost?.avg_output_tokens;

  if (resolvedModel.isCalculated) {
    const baseEffort = (resolvedModel.baselineEffort || "HIGH").toUpperCase();
    const mult = resolvedModel.tokenMultiplier;
    return {
      type: "calculated",
      currentEffort,
      baseEffort,
      tokens,
      costQ,
      tokenMultiplier: mult,
      message: `${currentEffort} reasoning: estimated ~${formatTokenCount(tokens)} tokens (${formatCostPerQuestion(costQ)}/q) dynamically scaled from ${baseEffort} baseline (${mult}× reasoning volume).`,
    };
  }

  // If evaluated variant with sibling variants
  const familyId = resolvedModel.family_id || resolvedModel.canonical_id;
  const siblings = allModels.filter(
    (m) =>
      m.benchmark_name !== resolvedModel.benchmark_name &&
      ((resolvedModel.family_id && m.family_id === resolvedModel.family_id) ||
        (resolvedModel.canonical_id && m.canonical_id === resolvedModel.canonical_id)) &&
      m.cost?.cost_per_question != null
  );

  if (siblings.length > 0) {
    const other = siblings[0];
    const otherEffort = (other.effort || "standard").toUpperCase();
    const otherCost = other.cost.cost_per_question;
    const otherTokens = other.cost.avg_output_tokens;
    const costRatio = Number((costQ / otherCost).toFixed(2));
    const tokenRatio = tokens && otherTokens ? Number((tokens / otherTokens).toFixed(2)) : null;

    return {
      type: "evaluated",
      currentEffort,
      otherEffort,
      tokens,
      costQ,
      costRatio,
      tokenRatio,
      message: `${currentEffort} evaluated: measured ${formatTokenCount(tokens)} tokens (${formatCostPerQuestion(costQ)}/q) vs ${otherEffort} (${formatTokenCount(otherTokens)} tokens, ${formatCostPerQuestion(otherCost)}/q).`,
    };
  }

  return {
    type: "standard",
    currentEffort,
    tokens,
    costQ,
    message: `${currentEffort} effort: ${formatTokenCount(tokens)} tokens per query at ${formatCostPerQuestion(costQ)}/q.`,
  };
}
