"use client";

import { useState } from "react";
import type { LivebenchModel } from "@/lib/data";
import { formatFamilyLabel } from "@/lib/picker.mjs";
import {
  formatCostPerQuestion,
  formatTokenCount,
  formatWorkloadCost,
  calculateCostComparison,
} from "@/lib/cost.mjs";

type Props = {
  modelA: LivebenchModel;
  modelB: LivebenchModel;
};

const PRESET_VOLUMES = [100, 1000, 10000, 50000];

export function CostEstimator({ modelA, modelB }: Props) {
  const [queryCount, setQueryCount] = useState<number>(1000);

  const comparison = calculateCostComparison(modelA, modelB, queryCount);
  const labelA = formatFamilyLabel(modelA.family_id || modelA.benchmark_name);
  const labelB = formatFamilyLabel(modelB.family_id || modelB.benchmark_name);
  const effortA = modelA.effort ? modelA.effort.toUpperCase() : "STANDARD";
  const effortB = modelB.effort ? modelB.effort.toUpperCase() : "STANDARD";

  const hasCostData = comparison.costPerQA != null && comparison.costPerQB != null;
  const totalBoth = (comparison.totalCostA ?? 0) + (comparison.totalCostB ?? 0);
  const pctA = totalBoth > 0 ? Math.round(((comparison.totalCostA ?? 0) / totalBoth) * 100) : 50;
  const pctB = 100 - pctA;

  return (
    <div className="card cost-estimator-card">
      <div className="cost-estimator-header">
        <div className="cost-estimator-title-wrap">
          <span className="h2h-card-heading">Workload & Cost Estimator</span>
          <p className="cost-estimator-desc">
            LiveBench measured cost per question factoring in token pricing and reasoning output expansion.
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
              <span className="dim">Per question:</span>
              <span className="mono">{formatCostPerQuestion(comparison.costPerQA)}</span>
            </div>
            <div className="cost-metric-row">
              <span className="dim">Avg reasoning tokens:</span>
              <span className="mono">{formatTokenCount(comparison.tokensOutA)}</span>
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
              <span className="dim">Per question:</span>
              <span className="mono">{formatCostPerQuestion(comparison.costPerQB)}</span>
            </div>
            <div className="cost-metric-row">
              <span className="dim">Avg reasoning tokens:</span>
              <span className="mono">{formatTokenCount(comparison.tokensOutB)}</span>
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
              <td>Cost per benchmark question</td>
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
              <td>Avg reasoning / output tokens</td>
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
              <td>Avg prompt / input tokens</td>
              <td className="mono num">{formatTokenCount(comparison.tokensInA)}</td>
              <td className="mono num">{formatTokenCount(comparison.tokensInB)}</td>
              <td className="mono num">
                <span className="dim">—</span>
              </td>
            </tr>
            <tr>
              <td>Total for {queryCount.toLocaleString()} queries</td>
              <td className="mono num">{formatWorkloadCost(comparison.totalCostA)}</td>
              <td className="mono num">{formatWorkloadCost(comparison.totalCostB)}</td>
              <td className="mono num">
                {comparison.savings && comparison.savings > 0 ? (
                  <span className="delta-up">
                    Save {formatWorkloadCost(comparison.savings)} with {comparison.cheaperSlot}
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
