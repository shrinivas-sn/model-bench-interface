"use client";

import { useState } from "react";
import type { LivebenchModel } from "@/lib/data";
import { formatFamilyLabel, formatPerMillion } from "@/lib/picker.mjs";
import {
  formatCostPerQuestion,
  formatTokenCount,
  formatWorkloadCost,
  calculateCostComparison,
  calculateQuestionCostBreakdown,
} from "@/lib/cost.mjs";

type Props = {
  modelA: LivebenchModel;
  modelB: LivebenchModel;
};

const PRESET_VOLUMES = [100, 1000, 10000, 50000];

export function CostEstimator({ modelA, modelB }: Props) {
  const [queryCount, setQueryCount] = useState<number>(1000);

  const comparison = calculateCostComparison(modelA, modelB, queryCount);
  const breakdownA = calculateQuestionCostBreakdown(modelA);
  const breakdownB = calculateQuestionCostBreakdown(modelB);

  const labelA = formatFamilyLabel(modelA.family_id || modelA.benchmark_name);
  const labelB = formatFamilyLabel(modelB.family_id || modelB.benchmark_name);
  const effortA = modelA.effort ? modelA.effort.toUpperCase() : "STANDARD";
  const effortB = modelB.effort ? modelB.effort.toUpperCase() : "STANDARD";

  const hasCostData = comparison.costPerQA != null && comparison.costPerQB != null;
  const totalBoth = (comparison.totalCostA ?? 0) + (comparison.totalCostB ?? 0);
  const pctA = totalBoth > 0 ? Math.round(((comparison.totalCostA ?? 0) / totalBoth) * 100) : 50;
  const pctB = 100 - pctA;

  const workloadInCostA = breakdownA.inputCost * queryCount;
  const workloadOutCostA = breakdownA.outputCost * queryCount;
  const workloadInCostB = breakdownB.inputCost * queryCount;
  const workloadOutCostB = breakdownB.outputCost * queryCount;

  return (
    <div className="card cost-estimator-card">
      <div className="cost-estimator-header">
        <div className="cost-estimator-title-wrap">
          <span className="h2h-card-heading">Workload & Cost Estimator</span>
          <p className="cost-estimator-desc">
            Projected compute cost across query volumes, derived directly from input/output token pricing and reasoning expansion.
          </p>
        </div>

        <div className="cost-volume-controls" role="group" aria-label="Query volume presets">
          <span className="cost-volume-label">Workload:</span>
          <div className="cost-volume-buttons">
            {PRESET_VOLUMES.map((vol) => (
              <button
                key={vol}
                type="button"
                className="cost-volume-btn"
                data-selected={queryCount === vol}
                onClick={() => setQueryCount(vol)}
                aria-label={`Set workload to ${vol.toLocaleString()} queries`}
              >
                {vol >= 1000 ? `${vol / 1000}k` : vol}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="cost-estimator-grid">
        {/* Model A Cost Box */}
        <div className="cost-model-box" data-slot="A">
          <div className="cost-model-box-header">
            <span className="picker-slot-badge" data-slot="A">
              A
            </span>
            <span className="cost-model-name mono">
              {labelA} <span className="cost-effort-tag">{effortA}</span>
            </span>
          </div>
          <div className="cost-model-total mono">
            {formatWorkloadCost(comparison.totalCostA)}
          </div>
          <div className="cost-model-metrics">
            <div className="cost-metric-row">
              <span className="dim">Token Rates:</span>
              <span className="mono">
                {formatPerMillion(breakdownA.inputPrice)} in / {formatPerMillion(breakdownA.outputPrice)} out /M
              </span>
            </div>
            <div className="cost-metric-row">
              <span className="dim">Cost per question:</span>
              <span className="mono">{formatCostPerQuestion(comparison.costPerQA)}</span>
            </div>
            <div className="cost-metric-row">
              <span className="dim">Reasoning tokens:</span>
              <span className="mono">~{formatTokenCount(comparison.tokensOutA)}</span>
            </div>
          </div>
        </div>

        {/* Model B Cost Box */}
        <div className="cost-model-box" data-slot="B">
          <div className="cost-model-box-header">
            <span className="picker-slot-badge" data-slot="B">
              B
            </span>
            <span className="cost-model-name mono">
              {labelB} <span className="cost-effort-tag">{effortB}</span>
            </span>
          </div>
          <div className="cost-model-total mono">
            {formatWorkloadCost(comparison.totalCostB)}
          </div>
          <div className="cost-model-metrics">
            <div className="cost-metric-row">
              <span className="dim">Token Rates:</span>
              <span className="mono">
                {formatPerMillion(breakdownB.inputPrice)} in / {formatPerMillion(breakdownB.outputPrice)} out /M
              </span>
            </div>
            <div className="cost-metric-row">
              <span className="dim">Cost per question:</span>
              <span className="mono">{formatCostPerQuestion(comparison.costPerQB)}</span>
            </div>
            <div className="cost-metric-row">
              <span className="dim">Reasoning tokens:</span>
              <span className="mono">~{formatTokenCount(comparison.tokensOutB)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Callout & Proportional Bar */}
      {hasCostData && (
        <div className="cost-summary-panel">
          <div className="cost-proportion-bar-wrap" aria-hidden>
            <div className="cost-bar-segment" data-slot="A" style={{ width: `${pctA}%` }} />
            <div className="cost-bar-segment" data-slot="B" style={{ width: `${pctB}%` }} />
          </div>

          <div className="cost-insights">
            {comparison.cheaperSlot === "equal" ? (
              <span className="cost-insight-text">
                Both models have identical measured cost per question.
              </span>
            ) : comparison.cheaperSlot ? (
              <div className="cost-insight-text">
                <span className="cost-winner-badge">
                  Model {comparison.cheaperSlot} is {comparison.costRatio}× more cost-effective
                </span>
                <span className="cost-savings-text">
                  Save <b>{formatWorkloadCost(comparison.savings)}</b> across {queryCount.toLocaleString()} queries.
                </span>
              </div>
            ) : null}

            {comparison.tokenMultiplier && comparison.tokenLeader !== "equal" && (
              <div className="cost-token-insight dim">
                Model {comparison.tokenLeader} expands to <b>{comparison.tokenMultiplier}× more reasoning tokens</b> per task.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cost Formula Breakdown (Tin·Pin + Tout·Pout) */}
      {(breakdownA.hasPricing || breakdownB.hasPricing) && (
        <div className="cost-formula-explainer">
          <div className="cost-formula-explainer-head">
            <span className="cost-formula-title">Cost formula & token multipliers</span>
            <span className="cost-formula-rule mono">
              Cost = (T<sub>in</sub> · P<sub>in</sub> + T<sub>out</sub> · P<sub>out</sub>) / 1,000,000
            </span>
          </div>
          <div className="cost-formula-slots-grid">
            <div className="cost-formula-slot-box" data-slot="A">
              <div className="cost-formula-slot-header">
                <span className="picker-slot-badge" data-slot="A">A</span>
                <span className="cost-formula-model-title mono">{labelA}</span>
                <span className="cost-effort-tag">{effortA}</span>
              </div>
              <div className="cost-formula-math-line mono">
                <span className="cost-math-part">
                  <span className="cost-math-sub">In:</span> {formatTokenCount(breakdownA.inputTokens)} tok × {formatPerMillion(breakdownA.inputPrice)}/M (${breakdownA.inputCost.toFixed(4)})
                </span>
                <span className="cost-math-plus">+</span>
                <span className="cost-math-part">
                  <span className="cost-math-sub">Out:</span> {formatTokenCount(breakdownA.outputTokens)} tok × {formatPerMillion(breakdownA.outputPrice)}/M (${breakdownA.outputCost.toFixed(4)})
                </span>
                <span className="cost-math-eq">=</span>
                <span className="cost-math-total">{formatCostPerQuestion(breakdownA.totalCost)} /q</span>
              </div>
            </div>

            <div className="cost-formula-slot-box" data-slot="B">
              <div className="cost-formula-slot-header">
                <span className="picker-slot-badge" data-slot="B">B</span>
                <span className="cost-formula-model-title mono">{labelB}</span>
                <span className="cost-effort-tag">{effortB}</span>
              </div>
              <div className="cost-formula-math-line mono">
                <span className="cost-math-part">
                  <span className="cost-math-sub">In:</span> {formatTokenCount(breakdownB.inputTokens)} tok × {formatPerMillion(breakdownB.inputPrice)}/M (${breakdownB.inputCost.toFixed(4)})
                </span>
                <span className="cost-math-plus">+</span>
                <span className="cost-math-part">
                  <span className="cost-math-sub">Out:</span> {formatTokenCount(breakdownB.outputTokens)} tok × {formatPerMillion(breakdownB.outputPrice)}/M (${breakdownB.outputCost.toFixed(4)})
                </span>
                <span className="cost-math-eq">=</span>
                <span className="cost-math-total">{formatCostPerQuestion(breakdownB.totalCost)} /q</span>
              </div>
            </div>
          </div>
          <p className="cost-formula-explainer-desc">
            Reasoning effort scales output token volume (<b>T<sub>out</sub></b>) at the provider's output token rate (<b>P<sub>out</sub></b>), while prompt input tokens (<b>T<sub>in</sub></b>) remain fixed.
          </p>
        </div>
      )}

      {/* Detailed metrics table */}
      <div className="cost-table-wrap">
        <table className="cost-table">
          <thead>
            <tr>
              <th>Cost & Token Breakdown</th>
              <th className="num">A · {labelA}</th>
              <th className="num">B · {labelB}</th>
              <th className="num">Comparison</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Input token price ($ / 1Mtok)</td>
              <td className="mono num">{formatPerMillion(breakdownA.inputPrice)}</td>
              <td className="mono num">{formatPerMillion(breakdownB.inputPrice)}</td>
              <td className="mono num">
                <span className="dim">
                  {breakdownA.inputPrice === breakdownB.inputPrice ? "equal" : `${(breakdownA.inputPrice / (breakdownB.inputPrice || 1)).toFixed(1)}×`}
                </span>
              </td>
            </tr>
            <tr>
              <td>Output token price ($ / 1Mtok)</td>
              <td className="mono num">{formatPerMillion(breakdownA.outputPrice)}</td>
              <td className="mono num">{formatPerMillion(breakdownB.outputPrice)}</td>
              <td className="mono num">
                <span className="dim">
                  {breakdownA.outputPrice === breakdownB.outputPrice ? "equal" : `${(breakdownA.outputPrice / (breakdownB.outputPrice || 1)).toFixed(1)}×`}
                </span>
              </td>
            </tr>
            <tr>
              <td>Avg prompt tokens (fixed)</td>
              <td className="mono num">{formatTokenCount(comparison.tokensInA)}</td>
              <td className="mono num">{formatTokenCount(comparison.tokensInB)}</td>
              <td className="mono num">
                <span className="dim">fixed</span>
              </td>
            </tr>
            <tr>
              <td>Avg reasoning tokens ({effortA} vs {effortB})</td>
              <td className="mono num">{formatTokenCount(comparison.tokensOutA)}</td>
              <td className="mono num">{formatTokenCount(comparison.tokensOutB)}</td>
              <td className="mono num">
                {comparison.tokenMultiplier && comparison.tokenLeader !== "equal" ? (
                  <span>{comparison.tokenMultiplier}× volume</span>
                ) : (
                  <span className="dim">≈</span>
                )}
              </td>
            </tr>
            <tr>
              <td>Single query cost (Tin·Pin + Tout·Pout)</td>
              <td className="mono num">{formatCostPerQuestion(comparison.costPerQA)}</td>
              <td className="mono num">{formatCostPerQuestion(comparison.costPerQB)}</td>
              <td className="mono num">
                {comparison.costRatio && comparison.cheaperSlot !== "equal" ? (
                  <span className="delta-up">
                    {comparison.costRatio}× ({comparison.cheaperSlot === "A" ? "A cheaper" : "B cheaper"})
                  </span>
                ) : (
                  <span className="dim">≈</span>
                )}
              </td>
            </tr>
            <tr>
              <td>Prompt spend for {queryCount.toLocaleString()} queries</td>
              <td className="mono num">{formatWorkloadCost(workloadInCostA)}</td>
              <td className="mono num">{formatWorkloadCost(workloadInCostB)}</td>
              <td className="mono num"><span className="dim">—</span></td>
            </tr>
            <tr>
              <td>Reasoning spend for {queryCount.toLocaleString()} queries</td>
              <td className="mono num">{formatWorkloadCost(workloadOutCostA)}</td>
              <td className="mono num">{formatWorkloadCost(workloadOutCostB)}</td>
              <td className="mono num"><span className="dim">—</span></td>
            </tr>
            <tr>
              <td><strong>Total spend for {queryCount.toLocaleString()} queries</strong></td>
              <td className="mono num"><strong>{formatWorkloadCost(comparison.totalCostA)}</strong></td>
              <td className="mono num"><strong>{formatWorkloadCost(comparison.totalCostB)}</strong></td>
              <td className="mono num">
                {comparison.savings && comparison.savings > 0 ? (
                  <span className="delta-up">
                    Save {formatWorkloadCost(comparison.savings)} ({comparison.cheaperSlot})
                  </span>
                ) : (
                  <span className="dim">≈</span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
