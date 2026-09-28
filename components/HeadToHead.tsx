"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { RadarChart } from "@/components/RadarChart";
import { ModelPicker } from "@/components/ModelPicker";
import { CostEstimator } from "@/components/CostEstimator";
import { SwapIcon } from "@/components/icons";
import type { LivebenchModel, SweRow } from "@/lib/data";
import { defaultPair, formatFamilyLabel, formatPerMillion, readRecents } from "@/lib/picker.mjs";
import {
  formatCostPerQuestion,
  formatTokenCount,
  resolveModelForEffort,
  effortVarianceInsight,
  calculateQuestionCostBreakdown,
} from "@/lib/cost.mjs";

type Props = {
  livebench: LivebenchModel[];
  swe: SweRow[];
  capabilities: string[];
  vendorDisplay?: Record<string, string>;
};

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function Delta({ a, b }: { a: number; b: number }) {
  const d = a - b;
  if (Math.abs(d) < 0.05) return <span className="dim">≈</span>;
  return d > 0 ? (
    <span className="delta-up">+{d.toFixed(1)}</span>
  ) : (
    <span className="delta-down">{d.toFixed(1)}</span>
  );
}

function priceSummary(m: LivebenchModel) {
  if (!m.pricing) return "—";
  return `${formatPerMillion(m.pricing.input_per_million)} / ${formatPerMillion(
    m.pricing.output_per_million
  )}`;
}

const EFFORT_ORDER = ["low", "medium", "high", "xhigh", "max", "standard", "none"];

function getEffortListForModel(m: LivebenchModel, livebench: LivebenchModel[]) {
  const familyVariants = livebench.filter(
    (v) =>
      (m.family_id && v.family_id === m.family_id) ||
      (m.canonical_id && v.canonical_id === m.canonical_id)
  );

  const effortsSet = new Set<string>();
  for (const v of familyVariants) {
    if (v.effort) effortsSet.add(v.effort.toLowerCase());
  }
  if (Array.isArray(m.supported_efforts)) {
    for (const e of m.supported_efforts) {
      if (e && e !== "none") effortsSet.add(e.toLowerCase());
    }
  }

  if (effortsSet.size === 0) {
    effortsSet.add(m.effort ? m.effort.toLowerCase() : "standard");
  }

  const sortedEfforts = Array.from(effortsSet).sort((a, b) => {
    const ia = EFFORT_ORDER.indexOf(a);
    const ib = EFFORT_ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  return sortedEfforts.map((eff) => {
    const matchingVariant = familyVariants.find(
      (v) => (v.effort && v.effort.toLowerCase() === eff) || (!v.effort && eff === "standard")
    );
    return {
      id: eff,
      label: eff.toUpperCase(),
      hasBenchmark: Boolean(matchingVariant),
      variant: matchingVariant || null,
      thinking: Boolean(matchingVariant?.thinking || m.thinking),
    };
  });
}

export function HeadToHead({ livebench, swe, capabilities, vendorDisplay = {} }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const paramA = searchParams.get("a");
  const paramB = searchParams.get("b");
  const effortParamA = searchParams.get("effort_a");
  const effortParamB = searchParams.get("effort_b");

  const [overrideEffort, setOverrideEffort] = useState<Record<string, string>>(() => ({
    A: effortParamA || "",
    B: effortParamB || "",
  }));

  const isKnown = (name: string | null) =>
    Boolean(name) && livebench.some((m) => m.benchmark_name === name);

  const fallback = useMemo(() => defaultPair(livebench, []), [livebench]);
  const defaultA = fallback[0];
  const defaultB = fallback[1];

  const [slots, setSlots] = useState<string[]>(() => [
    isKnown(paramA) ? (paramA as string) : defaultA,
    isKnown(paramB) ? (paramB as string) : defaultB,
  ]);

  // Keep URL and state in step when someone follows a shared link.
  useEffect(() => {
    setSlots([
      isKnown(paramA) ? (paramA as string) : defaultA,
      isKnown(paramB) ? (paramB as string) : defaultB,
    ]);
    if (effortParamA || effortParamB) {
      setOverrideEffort({
        A: effortParamA || "",
        B: effortParamB || "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramA, paramB, effortParamA, effortParamB, defaultA, defaultB, livebench]);

  // With no link to follow, lead with what this visitor picked last time —
  // the whole point of recents is not having to search again.
  const appliedRecents = useRef(false);
  useEffect(() => {
    if (appliedRecents.current) return;
    appliedRecents.current = true;
    if (paramA || paramB) return;
    const recents = readRecents(storage());
    if (!recents.length) return;
    const [a, b] = defaultPair(livebench, recents);
    if (a && b) setSlots([a, b]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateUrl = (nextSlots: string[], nextEfforts: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("a", nextSlots[0]);
    params.set("b", nextSlots[1]);
    if (nextEfforts.A) params.set("effort_a", nextEfforts.A);
    else params.delete("effort_a");
    if (nextEfforts.B) params.set("effort_b", nextEfforts.B);
    else params.delete("effort_b");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleSlotChange = (index: number, name: string) => {
    const next = [...slots];
    next[index] = name;
    const slotKey = index === 0 ? "A" : "B";
    const nextEfforts = { ...overrideEffort };
    delete nextEfforts[slotKey];
    setOverrideEffort(nextEfforts);
    setSlots(next);
    updateUrl(next, nextEfforts);
  };

  const handleSwap = () => {
    const nextEfforts = {
      A: overrideEffort.B || "",
      B: overrideEffort.A || "",
    };
    setOverrideEffort(nextEfforts);
    const nextSlots = [slots[1], slots[0]];
    setSlots(nextSlots);
    updateUrl(nextSlots, nextEfforts);
  };

  const handleEffortSelect = (slot: "A" | "B", index: number, opt: (ReturnType<typeof getEffortListForModel>)[0], baseM: LivebenchModel) => {
    if (opt.variant) {
      const nextSlots = [...slots];
      nextSlots[index] = opt.variant.benchmark_name;
      const nextEfforts = { ...overrideEffort, [slot]: opt.id };
      setOverrideEffort(nextEfforts);
      setSlots(nextSlots);
      updateUrl(nextSlots, nextEfforts);
    } else {
      const nextEfforts = { ...overrideEffort, [slot]: opt.id };
      setOverrideEffort(nextEfforts);
      updateUrl(slots, nextEfforts);
    }
  };

  const rawA = useMemo(
    () => livebench.find((m) => m.benchmark_name === slots[0]) ?? null,
    [livebench, slots]
  );
  const rawB = useMemo(
    () => livebench.find((m) => m.benchmark_name === slots[1]) ?? null,
    [livebench, slots]
  );

  const effA = overrideEffort.A || rawA?.effort?.toLowerCase() || "standard";
  const effB = overrideEffort.B || rawB?.effort?.toLowerCase() || "standard";

  const resolvedA = useMemo(
    () => (rawA ? resolveModelForEffort(rawA, effA, livebench) : null),
    [rawA, effA, livebench]
  );
  const resolvedB = useMemo(
    () => (rawB ? resolveModelForEffort(rawB, effB, livebench) : null),
    [rawB, effB, livebench]
  );

  const a = resolvedA;
  const b = resolvedB;

  const taskKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const m of [a, b]) for (const k of Object.keys(m?.tasks ?? {})) keys.add(k);
    return [...keys].sort();
  }, [a, b]);

  const sweFor = (m: LivebenchModel | null) => {
    const id = m?.canonical_id;
    if (!id) return null;
    const rows = swe.filter((r) => r.canonical_id === id && r.resolved_pct != null);
    if (!rows.length) return null;
    return { n: rows.length, best: Math.max(...rows.map((r) => r.resolved_pct as number)) };
  };

  if (!a || !b || !rawA || !rawB) {
    return (
      <div className="card">
        <p className="dim">
          No benchmark data. Run <code>npm run ingest</code> then <code>npm run build:data</code>.
        </p>
      </div>
    );
  }

  const labelOf = (m: LivebenchModel) => formatFamilyLabel(m.family_id || m.benchmark_name);

  const modelCard = (
    resolvedM: NonNullable<typeof a>,
    rawM: LivebenchModel,
    slot: "A" | "B",
    index: number
  ) => {
    const sweRow = sweFor(rawM);
    const effortOptionsList = getEffortListForModel(rawM, livebench);
    const currentActiveEffort = overrideEffort[slot] || resolvedM.activeEffort || rawM.effort?.toLowerCase() || "standard";
    const activeOpt = effortOptionsList.find((opt) => opt.id === currentActiveEffort) || effortOptionsList[0];
    const isLivebenchEvaluated = resolvedM.isEvaluated;
    const costBreakdown = calculateQuestionCostBreakdown(resolvedM);
    const effortInsight = effortVarianceInsight(resolvedM, livebench);

    return (
      <div className="h2h-model-card" data-slot={slot}>
        <ModelPicker
          models={livebench}
          value={slots[index]}
          onChange={(name) => handleSlotChange(index, name)}
          slotLabel={slot}
          vendorDisplay={vendorDisplay}
        />

        <div className="h2h-effort-selector-panel" role="group" aria-label={`Reasoning effort for ${labelOf(resolvedM)}`}>
          <div className="h2h-effort-header">
            <span className="h2h-effort-title">Reasoning Effort</span>
            <span className="h2h-effort-status-badge" data-benchmarked={isLivebenchEvaluated}>
              {isLivebenchEvaluated ? (
                <>
                  <span className="h2h-effort-status-dot" /> LiveBench evaluated
                </>
              ) : (
                <>
                  <span className="h2h-effort-status-dot" style={{ background: "var(--accent)" }} /> ⚡ Dynamic ({resolvedM.activeEffort.toUpperCase()} model)
                </>
              )}
            </span>
          </div>

          <div className="h2h-effort-button-group">
            {effortOptionsList.map((opt) => {
              const isSelected = opt.id === currentActiveEffort;
              const preview = resolveModelForEffort(rawM, opt.id, livebench);
              const previewCost = preview?.cost?.cost_per_question;
              const previewTok = preview?.cost?.avg_output_tokens;
              const inP = preview?.pricing?.input_per_million ?? preview?.cost?.input_price_per_million ?? 0;
              const outP = preview?.pricing?.output_per_million ?? preview?.cost?.output_price_per_million ?? 0;
              const rateStr = inP > 0 || outP > 0 ? `${formatPerMillion(inP)}/${formatPerMillion(outP)}/M` : null;

              return (
                <button
                  key={opt.id}
                  type="button"
                  className="h2h-effort-btn"
                  data-slot={slot}
                  data-selected={isSelected}
                  data-benchmarked={opt.hasBenchmark}
                  onClick={() => handleEffortSelect(slot, index, opt, rawM)}
                  title={`${opt.label}: ~${formatTokenCount(previewTok)} reasoning tokens @ ${formatPerMillion(inP)} in / ${formatPerMillion(outP)} out (${formatCostPerQuestion(previewCost)}/q)`}
                  aria-label={`Select ${opt.label} reasoning effort`}
                >
                  <span className="h2h-effort-btn-top">
                    <span className="h2h-effort-btn-text">{opt.label}</span>
                    {opt.hasBenchmark && (
                      <span className="h2h-effort-btn-dot" title="LiveBench evaluation data available" />
                    )}
                    {opt.thinking && <span className="h2h-effort-btn-tag">think</span>}
                  </span>
                  <span className="h2h-effort-btn-bottom">
                    {rateStr && <span className="h2h-effort-btn-rate mono">{rateStr}</span>}
                    {previewCost != null && (
                      <span className="h2h-effort-btn-cost mono">{formatCostPerQuestion(previewCost)}</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {effortInsight && (
            <div className="h2h-effort-variance-insight">
              {effortInsight.message}
            </div>
          )}
        </div>

        <div className="h2h-card-stats">
          <div className="h2h-card-stat">
            <span className="h2h-stat-label">$/Mtok in / out</span>
            <span className="h2h-stat-value mono">{priceSummary(resolvedM)}</span>
          </div>
          <div className="h2h-card-stat">
            <span className="h2h-stat-label">$/Question</span>
            <span className="h2h-stat-value mono">{formatCostPerQuestion(resolvedM.cost?.cost_per_question)}</span>
          </div>
          <div className="h2h-card-stat">
            <span className="h2h-stat-label">Reasoning Tok</span>
            <span className="h2h-stat-value mono">{formatTokenCount(resolvedM.cost?.avg_output_tokens)}</span>
          </div>
          <div className="h2h-card-stat">
            <span className="h2h-stat-label">Context</span>
            <span className="h2h-stat-value mono">
              {resolvedM.context_length ? `${(resolvedM.context_length / 1000).toFixed(0)}k` : "—"}
            </span>
          </div>
          <div className="h2h-card-stat">
            <span className="h2h-stat-label">SWE-bench best</span>
            <span className="h2h-stat-value mono">
              {sweRow ? `${sweRow.best.toFixed(1)}% (${sweRow.n})` : "no match"}
            </span>
          </div>
        </div>

        {/* Highlighted Cost Formula & Token Breakdown */}
        {costBreakdown.hasPricing && (
          <div className="h2h-cost-formula-card" data-slot={slot}>
            <div className="h2h-formula-head">
              <span className="h2h-formula-badge">
                <span className="h2h-formula-badge-dot" /> Cost Formula Breakdown
              </span>
              <span className="h2h-formula-total mono">
                {formatCostPerQuestion(costBreakdown.totalCost)} / query
              </span>
            </div>

            <div className="h2h-formula-math mono">
              <div className="h2h-math-item">
                <span className="h2h-math-tag">Prompt in</span>
                <span className="h2h-math-calc">
                  {formatTokenCount(costBreakdown.inputTokens)} tok × {formatPerMillion(costBreakdown.inputPrice)}/M
                </span>
                <span className="h2h-math-val">${costBreakdown.inputCost.toFixed(4)}</span>
              </div>
              <span className="h2h-math-plus">+</span>
              <div className="h2h-math-item">
                <span className="h2h-math-tag">Reasoning out ({resolvedM.activeEffort.toUpperCase()})</span>
                <span className="h2h-math-calc">
                  {formatTokenCount(costBreakdown.outputTokens)} tok × {formatPerMillion(costBreakdown.outputPrice)}/M
                </span>
                <span className="h2h-math-val">${costBreakdown.outputCost.toFixed(4)}</span>
              </div>
            </div>

            <p className="h2h-formula-note">
              Query cost is calculated as <code>(Input Tok × P<sub>in</sub> + Output Tok × P<sub>out</sub>) / 1M</code>. Higher reasoning effort expands output tokens (<b>{formatTokenCount(costBreakdown.outputTokens)} tok</b>) at <b>{formatPerMillion(costBreakdown.outputPrice)}/Mtok</b>, while prompt tokens (<b>{formatTokenCount(costBreakdown.inputTokens)} tok</b>) remain constant.
            </p>
          </div>
        )}

        <div className="h2h-card-meta">
          <span>
            {resolvedM.alias_method ? (
              <span className={`match-${resolvedM.alias_method}`}>{resolvedM.alias_method} match</span>
            ) : (
              <span className="badge badge-stale">unmatched</span>
            )}
          </span>
          <small className="mono dim">{resolvedM.benchmark_name}</small>
        </div>
      </div>
    );
  };

  return (
    <div className="h2h-root">
      <div className="h2h-cards-container">
        {modelCard(a, rawA, "A", 0)}

        <div className="h2h-card-swap-wrap">
          <button
            type="button"
            className="picker-swap-btn"
            onClick={handleSwap}
            title="Swap model A and model B"
            aria-label="Swap model A and model B"
          >
            <SwapIcon size={18} />
          </button>
        </div>

        {modelCard(b, rawB, "B", 1)}
      </div>

      <div className="h2h-compare-grid">
        <div className="h2h-capabilities-card">
          <div className="row-between">
            <span className="h2h-card-heading">Capability axes</span>
            <div className="h2h-legend">
              <span className="h2h-legend-item">
                <span className="h2h-legend-swatch" data-slot="A" aria-hidden />
                A · <span className="h2h-legend-name">{labelOf(a)}</span>
              </span>
              <span className="h2h-legend-item">
                <span className="h2h-legend-swatch" data-slot="B" aria-hidden />
                B · <span className="h2h-legend-name">{labelOf(b)}</span>
              </span>
            </div>
          </div>

          {capabilities.map((cap) => {
            const va = a.categories[cap];
            const vb = b.categories[cap];
            const hasBoth = va != null && vb != null;
            const aLeads = hasBoth && va >= vb;
            const bLeads = hasBoth && vb >= va;

            return (
              <div key={cap} className="cap-row">
                <div className="cap-header">
                  <span className="cap-name">{cap}</span>
                  <span className="cap-delta">
                    {hasBoth ? <Delta a={va} b={vb} /> : <span className="unknown">not stated</span>}
                  </span>
                </div>

                <div className="cap-bars">
                  <div className="cap-bar-item" data-slot="A" data-lead={aLeads}>
                    <span className="cap-bar-label">A</span>
                    <div className="cap-bar-track">
                      <div
                        className="cap-bar-fill"
                        data-slot="A"
                        style={{ width: `${va != null ? Math.min(100, Math.max(0, va)) : 0}%` }}
                      />
                    </div>
                    <span className="cap-bar-val mono" data-lead={aLeads}>
                      {va?.toFixed(1) ?? "—"}
                    </span>
                  </div>

                  <div className="cap-bar-item" data-slot="B" data-lead={bLeads}>
                    <span className="cap-bar-label">B</span>
                    <div className="cap-bar-track">
                      <div
                        className="cap-bar-fill"
                        data-slot="B"
                        style={{ width: `${vb != null ? Math.min(100, Math.max(0, vb)) : 0}%` }}
                      />
                    </div>
                    <span className="cap-bar-val mono" data-lead={bLeads}>
                      {vb?.toFixed(1) ?? "—"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="h2h-radar-card">
          <span className="h2h-card-heading">Shape of the two models</span>
          <RadarChart
            axes={capabilities}
            series={[
              { label: `A · ${labelOf(a)}`, values: a.categories },
              { label: `B · ${labelOf(b)}`, values: b.categories },
            ]}
          />
          <div className="h2h-legend">
            <span className="h2h-legend-item">
              <span className="h2h-legend-swatch" data-slot="A" aria-hidden />
              <span className="h2h-legend-name">{labelOf(a)}</span>
            </span>
            <span className="h2h-legend-item">
              <span className="h2h-legend-swatch" data-slot="B" aria-hidden />
              <span className="h2h-legend-name">{labelOf(b)}</span>
            </span>
          </div>
        </div>
      </div>

      <CostEstimator modelA={a} modelB={b} />

      <details className="h2h-tasks-details">
        <summary className="h2h-tasks-summary">
          Per-task LiveBench scores ({taskKeys.length} tasks)
        </summary>
        <div className="h2h-tasks-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Task</th>
                <th className="num">A · {labelOf(a)}</th>
                <th className="num">B · {labelOf(b)}</th>
                <th className="num">Δ</th>
              </tr>
            </thead>
            <tbody>
              {taskKeys.map((t) => {
                const va = a.tasks[t];
                const vb = b.tasks[t];
                return (
                  <tr key={t}>
                    <td className="mono">{t}</td>
                    <td className="mono num">{va?.toFixed(1) ?? "—"}</td>
                    <td className="mono num">{vb?.toFixed(1) ?? "—"}</td>
                    <td className="num">
                      {va != null && vb != null ? <Delta a={va} b={vb} /> : <span className="unknown">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
