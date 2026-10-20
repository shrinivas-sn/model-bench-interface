"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ModelPicker } from "@/components/ModelPicker";
import { EffortStatus, EffortStatusRow, type AtEffort } from "@/components/EffortChip";
import { SwapIcon } from "@/components/icons";
import { BenchBlock } from "@/components/BenchBlock";
import type {
  LivebenchModel,
  ScoresData,
  TerminalBenchRun,
  ArtificialAnalysisModel,
} from "@/lib/data";
import {
  defaultPair,
  formatFamilyLabel,
  formatPricePair,
  getAvailableEfforts,
  readRecents,
  resolveModelAndEffort,
  writeRecents,
} from "@/lib/picker.mjs";
import { joinKey, runsForVariant, scoreAtEffort, scoreDelta } from "@/lib/compare.mjs";

type Props = {
  /** Models the picker offers (LiveBench plus important models it has not scored). */
  models: LivebenchModel[];
  /** LiveBench score rows. */
  livebench: LivebenchModel[];
  capabilities: string[];
  terminalBench?: TerminalBenchRun[];
  artificialAnalysis?: ArtificialAnalysisModel[];
  sources: ScoresData["sources"];
  vendorDisplay?: Record<string, string>;
};

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function Delta({
  a,
  b,
  missing = "Not on this leaderboard",
  lowerIsBetter = false,
}: {
  a: number | null | undefined;
  b: number | null | undefined;
  missing?: string;
  lowerIsBetter?: boolean;
}) {
  const d = scoreDelta(a ?? null, b ?? null);
  if (d == null) return <span className="unknown">{missing}</span>;
  if (Math.abs(d) < 0.05) return <span className="dim">≈</span>;
  return d > 0 !== lowerIsBetter ? (
    <span className="delta-up">+{d.toFixed(1)}</span>
  ) : (
    <span className="delta-down">{d.toFixed(1)}</span>
  );
}

export function HeadToHead({
  models,
  livebench,
  capabilities,
  terminalBench = [],
  artificialAnalysis = [],
  sources,
  vendorDisplay = {},
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const paramA = searchParams.get("a");
  const paramB = searchParams.get("b");
  const paramEffortA = searchParams.get("effort_a") || searchParams.get("effortA");
  const paramEffortB = searchParams.get("effort_b") || searchParams.get("effortB");

  const fallback = useMemo(() => defaultPair(models, []), [models]);
  const defaultA = fallback[0];
  const defaultB = fallback[1];

  const resolvedA = useMemo(() => resolveModelAndEffort(paramA, models), [paramA, models]);
  const resolvedB = useMemo(() => resolveModelAndEffort(paramB, models), [paramB, models]);

  const [slots, setSlots] = useState<string[]>(() => [
    resolvedA.model?.benchmark_name ?? defaultA,
    resolvedB.model?.benchmark_name ?? defaultB,
  ]);

  const a = useMemo(
    () => models.find((m) => m.benchmark_name === slots[0]) ?? null,
    [models, slots]
  );
  const b = useMemo(
    () => models.find((m) => m.benchmark_name === slots[1]) ?? null,
    [models, slots]
  );

  const availableEffortsA = useMemo(
    () => getAvailableEfforts(a, terminalBench, artificialAnalysis, livebench),
    [a, terminalBench, artificialAnalysis, livebench]
  );
  const availableEffortsB = useMemo(
    () => getAvailableEfforts(b, terminalBench, artificialAnalysis, livebench),
    [b, terminalBench, artificialAnalysis, livebench]
  );

  const pickEffort = (
    urlEffort: string | null,
    inferredEffort: string | null,
    model: LivebenchModel | null,
    available: string[]
  ): string | null => {
    if (!available.length) return null;
    const u = (urlEffort || "").toLowerCase();
    if (u && available.includes(u)) return u;
    const inf = (inferredEffort || "").toLowerCase();
    if (inf && available.includes(inf)) return inf;
    const def = (model?.default_effort || model?.effort || "").toLowerCase();
    if (def && available.includes(def)) return def;
    if (available.includes("high")) return "high";
    if (available.includes("max")) return "max";
    return available[0] ?? null;
  };

  const [effortA, setEffortA] = useState<string | null>(() => {
    const model = resolvedA.model ?? models.find((m) => m.benchmark_name === defaultA) ?? null;
    const av = getAvailableEfforts(model, terminalBench, artificialAnalysis, livebench);
    return pickEffort(paramEffortA, resolvedA.effort, model, av);
  });

  const [effortB, setEffortB] = useState<string | null>(() => {
    const model = resolvedB.model ?? models.find((m) => m.benchmark_name === defaultB) ?? null;
    const av = getAvailableEfforts(model, terminalBench, artificialAnalysis, livebench);
    return pickEffort(paramEffortB, resolvedB.effort, model, av);
  });

  // Keep URL and state in step when someone follows a shared link.
  useEffect(() => {
    const resA = resolveModelAndEffort(paramA, models);
    const resB = resolveModelAndEffort(paramB, models);
    const mA = resA.model?.benchmark_name ?? defaultA;
    const mB = resB.model?.benchmark_name ?? defaultB;
    setSlots([mA, mB]);

    const modelAObj = models.find((m) => m.benchmark_name === mA) ?? null;
    const modelBObj = models.find((m) => m.benchmark_name === mB) ?? null;
    const avA = getAvailableEfforts(modelAObj, terminalBench, artificialAnalysis, livebench);
    const avB = getAvailableEfforts(modelBObj, terminalBench, artificialAnalysis, livebench);

    setEffortA(pickEffort(paramEffortA, resA.effort, modelAObj, avA));
    setEffortB(pickEffort(paramEffortB, resB.effort, modelBObj, avB));
  }, [paramA, paramB, paramEffortA, paramEffortB, defaultA, defaultB, models, livebench, terminalBench, artificialAnalysis]);

  // With no link to follow, lead with what this visitor picked last time.
  const appliedRecents = useRef(false);
  useEffect(() => {
    if (appliedRecents.current) return;
    appliedRecents.current = true;
    if (paramA || paramB) return;
    const recents = readRecents(storage());
    if (!recents.length) return;
    const [defRecentA, defRecentB] = defaultPair(models, recents);
    if (defRecentA && defRecentB) {
      setSlots([defRecentA, defRecentB]);
      const mA = models.find((m) => m.benchmark_name === defRecentA) ?? null;
      const mB = models.find((m) => m.benchmark_name === defRecentB) ?? null;
      const avA = getAvailableEfforts(mA, terminalBench, artificialAnalysis, livebench);
      const avB = getAvailableEfforts(mB, terminalBench, artificialAnalysis, livebench);
      setEffortA(pickEffort(null, null, mA, avA));
      setEffortB(pickEffort(null, null, mB, avB));
    }
  }, [models, livebench, paramA, paramB, terminalBench, artificialAnalysis]);

  const updateUrl = (
    nextSlots: string[],
    nextEffortA: string | null,
    nextEffortB: string | null
  ) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("a", nextSlots[0]);
    params.set("b", nextSlots[1]);
    if (nextEffortA) params.set("effort_a", nextEffortA);
    else params.delete("effort_a");
    if (nextEffortB) params.set("effort_b", nextEffortB);
    else params.delete("effort_b");
    params.delete("effortA");
    params.delete("effortB");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleSlotChange = (index: number, name: string) => {
    const nextSlots = [...slots];
    nextSlots[index] = name;
    setSlots(nextSlots);
    writeRecents(storage(), name);

    const newModel = models.find((m) => m.benchmark_name === name) ?? null;
    const newAvail = getAvailableEfforts(newModel, terminalBench, artificialAnalysis, livebench);
    const newEffort = pickEffort(null, null, newModel, newAvail);

    if (index === 0) {
      setEffortA(newEffort);
      updateUrl(nextSlots, newEffort, effortB);
    } else {
      setEffortB(newEffort);
      updateUrl(nextSlots, effortA, newEffort);
    }
  };

  const handleEffortChange = (index: number, eff: string) => {
    const currentModel = index === 0 ? a : b;
    let nextSlots = slots;
    if (currentModel) {
      // A LiveBench variant row at that effort becomes the slot (only picker entries can be slots).
      const variant = models.find(
        (x) =>
          (x.family_id === currentModel.family_id ||
            (joinKey(x) != null && joinKey(x) === joinKey(currentModel))) &&
          x.effort === eff
      );
      if (variant && variant.benchmark_name !== currentModel.benchmark_name) {
        nextSlots = [...slots];
        nextSlots[index] = variant.benchmark_name;
        setSlots(nextSlots);
      }
    }
    if (index === 0) {
      setEffortA(eff);
      updateUrl(nextSlots, eff, effortB);
    } else {
      setEffortB(eff);
      updateUrl(nextSlots, effortA, eff);
    }
  };

  const handleSwap = () => {
    const nextSlots = [slots[1], slots[0]];
    const nextEffortA = effortB;
    const nextEffortB = effortA;
    setSlots(nextSlots);
    setEffortA(nextEffortA);
    setEffortB(nextEffortB);
    updateUrl(nextSlots, nextEffortA, nextEffortB);
  };

  const taskKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const m of [a, b]) for (const k of Object.keys(m?.tasks ?? {})) keys.add(k);
    return [...keys].sort();
  }, [a, b]);

  if (!a || !b) {
    return (
      <div className="card">
        <p className="dim">
          No benchmark data. Run <code>npm run ingest</code> then <code>npm run build:data</code>.
        </p>
      </div>
    );
  }

  const labelOf = (m: LivebenchModel) =>
    m.display_name || formatFamilyLabel(m.family_id || m.benchmark_name);

  // Terminal-Bench runs
  const newestTbDate =
    terminalBench.map((r) => r.run_date).filter(Boolean).sort().pop() || "—";
  const tbA = runsForVariant(
    terminalBench,
    joinKey(a),
    effortA,
    "reasoning_effort"
  ) as { exact: TerminalBenchRun | null; all: TerminalBenchRun[] };
  const tbB = runsForVariant(
    terminalBench,
    joinKey(b),
    effortB,
    "reasoning_effort"
  ) as { exact: TerminalBenchRun | null; all: TerminalBenchRun[] };
  const hasExactTbBoth = Boolean(tbA.exact && tbB.exact);

  // One rule for every block: the score at the picked effort, or say why there is none.
  const atData = {
    livebench,
    terminal_bench: terminalBench,
    artificial_analysis: artificialAnalysis,
  };
  const lbAtA = scoreAtEffort(a, "livebench", effortA, atData) as AtEffort<LivebenchModel>;
  const lbAtB = scoreAtEffort(b, "livebench", effortB, atData) as AtEffort<LivebenchModel>;
  const tbAtA = scoreAtEffort(a, "terminal_bench", effortA, atData) as AtEffort<TerminalBenchRun>;
  const tbAtB = scoreAtEffort(b, "terminal_bench", effortB, atData) as AtEffort<TerminalBenchRun>;
  const aaAtA = scoreAtEffort(a, "artificial_analysis", effortA, atData) as AtEffort<ArtificialAnalysisModel>;
  const aaAtB = scoreAtEffort(b, "artificial_analysis", effortB, atData) as AtEffort<ArtificialAnalysisModel>;
  const lbRowA = lbAtA.row;
  const lbRowB = lbAtB.row;

  const tbScoreA = tbAtA.value;
  const tbScoreB = tbAtB.value;
  const tbHasBoth = tbScoreA != null && tbScoreB != null;
  const tbALeads = tbHasBoth && tbScoreA >= tbScoreB;
  const tbBLeads = tbHasBoth && tbScoreB >= tbScoreA;

  // Artificial Analysis entry at the picked effort (or its stated status).
  const entryA = aaAtA.row;
  const entryB = aaAtB.row;
  const asOfAA = sources.artificial_analysis?.fetched_at
    ? `Fetched ${sources.artificial_analysis.fetched_at.slice(0, 10)}`
    : "Fetched";

  const statusRow = (atA: AtEffort, atB: AtEffort) => (
    <EffortStatusRow>
      <EffortStatus slot="A" at={atA} picked={effortA} onPick={(l) => handleEffortChange(0, l)} />
      <EffortStatus slot="B" at={atB} picked={effortB} onPick={(l) => handleEffortChange(1, l)} />
    </EffortStatusRow>
  );

  const renderModelCard = (m: LivebenchModel, slot: "A" | "B", index: number) => {
    const available = slot === "A" ? availableEffortsA : availableEffortsB;
    const activeEffort = slot === "A" ? effortA : effortB;

    return (
      <div className="h2h-model-card" data-slot={slot}>
        <ModelPicker
          models={models}
          value={slots[index]}
          onChange={(name) => handleSlotChange(index, name)}
          slotLabel={slot}
          vendorDisplay={vendorDisplay}
        />

        <div className="h2h-effort-row" data-slot={slot}>
          <span className="h2h-stat-label">Reasoning Effort:</span>
          {available.length > 0 ? (
            <div
              className="h2h-effort-group"
              role="radiogroup"
              aria-label={`Select reasoning effort for Model ${slot}`}
            >
              {available.map((eff) => {
                const isActive = activeEffort === eff;
                return (
                  <button
                    key={eff}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    className={`h2h-effort-btn effort-chip-${eff}`}
                    data-slot={slot}
                    data-active={isActive}
                    onClick={() => handleEffortChange(index, eff)}
                    title={`Switch Model ${slot} reasoning effort to ${eff}`}
                  >
                    {eff}
                  </button>
                );
              })}
            </div>
          ) : (
            <span className="unknown">not configurable</span>
          )}
        </div>

        <div className="h2h-card-stats">
          <div className="h2h-card-stat">
            <span className="h2h-stat-label">Price in / out ($ per 1M tokens)</span>
            <span className="h2h-stat-value mono">
              {formatPricePair(m.pricing?.input_per_million, m.pricing?.output_per_million)}
              {m.pricing?.source ? (
                <small className="dim text-xs">
                  {" "}
                  via {m.pricing.source === "openrouter" ? "OpenRouter" : "LiveBench"}
                </small>
              ) : null}
            </span>
          </div>
          <div className="h2h-card-stat">
            <span className="h2h-stat-label">Context window</span>
            <span className="h2h-stat-value mono">
              {m.context_length ? `${(m.context_length / 1000).toFixed(0)}k` : "—"}
            </span>
          </div>
          <div className="h2h-card-stat">
            <span className="h2h-stat-label">LiveBench cost per question</span>
            <span className="h2h-stat-value mono">
              {m.cost?.cost_per_question != null
                ? `$${m.cost.cost_per_question.toFixed(4)}`
                : "—"}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h2h-root">
      <div className="h2h-cards-container">
        {renderModelCard(a, "A", 0)}

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

        {renderModelCard(b, "B", 1)}
      </div>

      {/* Block 1: LiveBench */}
      <BenchBlock
        id="livebench"
        title="LiveBench"
        measures="Fresh questions each release, scored 0–100. Overall is LiveBench's own average of its categories."
        sourceLabel="livebench.ai"
        sourceUrl={sources.livebench.url}
        asOf={`Release ${sources.livebench.release}`}
      >
        {statusRow(lbAtA, lbAtB)}
        <div className="row-between mb-2">
          <span className="h2h-card-heading">Capabilities & Overall</span>
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

        {/* Overall score row */}
        <div className="cap-row">
          <div className="cap-header">
            <span className="cap-name">Overall</span>
            <span className="cap-delta">
              <Delta a={lbRowA?.overall} b={lbRowB?.overall} />
            </span>
          </div>
          <div className="cap-bars">
            <div
              className="cap-bar-item"
              data-slot="A"
              data-lead={Boolean(lbRowA?.overall != null && lbRowB?.overall != null && lbRowA.overall >= lbRowB.overall)}
            >
              <span className="cap-bar-label">A</span>
              <div className="cap-bar-track">
                <div
                  className="cap-bar-fill"
                  data-slot="A"
                  style={{ width: `${lbRowA?.overall != null ? Math.min(100, Math.max(0, lbRowA.overall)) : 0}%` }}
                />
              </div>
              <span
                className="cap-bar-val mono"
                data-lead={Boolean(lbRowA?.overall != null && lbRowB?.overall != null && lbRowA.overall >= lbRowB.overall)}
              >
                {lbRowA?.overall?.toFixed(1) ?? "—"}
              </span>
            </div>

            <div
              className="cap-bar-item"
              data-slot="B"
              data-lead={Boolean(lbRowA?.overall != null && lbRowB?.overall != null && lbRowB.overall >= lbRowA.overall)}
            >
              <span className="cap-bar-label">B</span>
              <div className="cap-bar-track">
                <div
                  className="cap-bar-fill"
                  data-slot="B"
                  style={{ width: `${lbRowB?.overall != null ? Math.min(100, Math.max(0, lbRowB.overall)) : 0}%` }}
                />
              </div>
              <span
                className="cap-bar-val mono"
                data-lead={Boolean(lbRowA?.overall != null && lbRowB?.overall != null && lbRowB.overall >= lbRowA.overall)}
              >
                {lbRowB?.overall?.toFixed(1) ?? "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Terminal-Bench 4.0 line stat */}
        <div className="cap-row">
          <div className="cap-header">
            <span className="cap-name">
              Terminal-Bench 4.0 <span className="cap-meta-badge">Agentic Coding</span>
            </span>
            <span className="cap-delta">
              <Delta a={tbScoreA} b={tbScoreB} />
            </span>
          </div>
          {statusRow(tbAtA, tbAtB)}
          <div className="cap-bars">
            <div className="cap-bar-item" data-slot="A" data-lead={tbALeads}>
              <span className="cap-bar-label">A</span>
              <div className="cap-bar-track">
                <div
                  className="cap-bar-fill"
                  data-slot="A"
                  style={{
                    width: `${tbScoreA != null ? Math.min(100, Math.max(0, tbScoreA)) : 0}%`,
                  }}
                />
              </div>
              <span
                className="cap-bar-val mono"
                data-lead={tbALeads}
                style={{ width: "auto", minWidth: "34px" }}
              >
                {tbScoreA != null ? `${tbScoreA.toFixed(1)}%` : "—"}
              </span>
            </div>

            <div className="cap-bar-item" data-slot="B" data-lead={tbBLeads}>
              <span className="cap-bar-label">B</span>
              <div className="cap-bar-track">
                <div
                  className="cap-bar-fill"
                  data-slot="B"
                  style={{
                    width: `${tbScoreB != null ? Math.min(100, Math.max(0, tbScoreB)) : 0}%`,
                  }}
                />
              </div>
              <span
                className="cap-bar-val mono"
                data-lead={tbBLeads}
                style={{ width: "auto", minWidth: "34px" }}
              >
                {tbScoreB != null ? `${tbScoreB.toFixed(1)}%` : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Capability rows */}
        {capabilities.map((cap) => {
          const va = lbRowA?.categories[cap];
          const vb = lbRowB?.categories[cap];
          const hasBoth = va != null && vb != null;
          const aLeads = hasBoth && va >= vb;
          const bLeads = hasBoth && vb >= va;

          return (
            <div key={cap} className="cap-row">
              <div className="cap-header">
                <span className="cap-name">{cap}</span>
                <span className="cap-delta">
                  <Delta a={va} b={vb} />
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
                  const va = lbRowA?.tasks[t];
                  const vb = lbRowB?.tasks[t];
                  return (
                    <tr key={t}>
                      <td className="mono">{t}</td>
                      <td className="mono num">{va?.toFixed(1) ?? "—"}</td>
                      <td className="mono num">{vb?.toFixed(1) ?? "—"}</td>
                      <td className="num">
                        <Delta a={va} b={vb} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </details>
      </BenchBlock>

      {/* Block 2: Terminal-Bench */}
      {terminalBench.length > 0 ? (
        <BenchBlock
          id="terminal-bench"
          title={sources.terminal_bench?.title || "Terminal-Bench 4.0"}
          measures="An AI agent works through real tasks in a terminal. Score = % of tasks solved; ± is the 95% range the leaderboard publishes."
          sourceLabel="tbench.ai"
          sourceUrl={sources.terminal_bench?.url || "https://www.tbench.ai/"}
          asOf={`Runs dated up to ${newestTbDate}`}
        >
          {statusRow(tbAtA, tbAtB)}
          {hasExactTbBoth && tbA.exact && tbB.exact ? (
            <div className="cap-row">
              <div className="cap-header">
                <span className="cap-name">At the picked effort</span>
                <span className="cap-delta">
                  <Delta a={tbA.exact.accuracy} b={tbB.exact.accuracy} />
                </span>
              </div>
              <div className="cap-bars">
                <div
                  className="cap-bar-item"
                  data-slot="A"
                  data-lead={tbA.exact.accuracy >= tbB.exact.accuracy}
                >
                  <span className="cap-bar-label">A</span>
                  <div className="cap-bar-track">
                    <div
                      className="cap-bar-fill"
                      data-slot="A"
                      style={{
                        width: `${Math.min(100, Math.max(0, tbA.exact.accuracy))}%`,
                      }}
                    />
                  </div>
                  <span className="cap-bar-val mono" style={{ width: "auto" }}>
                    {tbA.exact.accuracy.toFixed(1)}% ± {tbA.exact.ci95_half_width ?? "—"}
                  </span>
                </div>
                <div
                  className="cap-bar-item"
                  data-slot="B"
                  data-lead={tbB.exact.accuracy >= tbA.exact.accuracy}
                >
                  <span className="cap-bar-label">B</span>
                  <div className="cap-bar-track">
                    <div
                      className="cap-bar-fill"
                      data-slot="B"
                      style={{
                        width: `${Math.min(100, Math.max(0, tbB.exact.accuracy))}%`,
                      }}
                    />
                  </div>
                  <span className="cap-bar-val mono" style={{ width: "auto" }}>
                    {tbB.exact.accuracy.toFixed(1)}% ± {tbB.exact.ci95_half_width ?? "—"}
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          <div className="bench-runs-grid">
            <div className="bench-run-col">
              <span className="bench-run-col-title">
                <span className="h2h-legend-swatch" data-slot="A" aria-hidden />
                A · {labelOf(a)} ({tbA.all.length} {tbA.all.length === 1 ? "run" : "runs"})
              </span>
              {tbA.all.length === 0 ? (
                <p className="unknown">Not on this leaderboard</p>
              ) : (
                <ul className="bench-run-list">
                  {tbA.all.map((r) => {
                    const isPicked = tbA.exact && r.run_id === tbA.exact.run_id;
                    return (
                      <li
                        key={r.run_id}
                        className="bench-run-item"
                        data-picked={Boolean(isPicked)}
                      >
                        {r.agent_label || "agent"} ·{" "}
                        {r.reasoning_effort ?? "effort not stated"} ·{" "}
                        {r.accuracy.toFixed(1)}% ± {r.ci95_half_width ?? "—"} ·{" "}
                        {r.run_date || "—"}
                        {isPicked ? (
                          <span className="badge-picked">picked effort</span>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="bench-run-col">
              <span className="bench-run-col-title">
                <span className="h2h-legend-swatch" data-slot="B" aria-hidden />
                B · {labelOf(b)} ({tbB.all.length} {tbB.all.length === 1 ? "run" : "runs"})
              </span>
              {tbB.all.length === 0 ? (
                <p className="unknown">Not on this leaderboard</p>
              ) : (
                <ul className="bench-run-list">
                  {tbB.all.map((r) => {
                    const isPicked = tbB.exact && r.run_id === tbB.exact.run_id;
                    return (
                      <li
                        key={r.run_id}
                        className="bench-run-item"
                        data-picked={Boolean(isPicked)}
                      >
                        {r.agent_label || "agent"} ·{" "}
                        {r.reasoning_effort ?? "effort not stated"} ·{" "}
                        {r.accuracy.toFixed(1)}% ± {r.ci95_half_width ?? "—"} ·{" "}
                        {r.run_date || "—"}
                        {isPicked ? (
                          <span className="badge-picked">picked effort</span>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </BenchBlock>
      ) : null}

      {/* Block 3: Artificial Analysis */}
      {sources.artificial_analysis?.connected && artificialAnalysis.length > 0 ? (
        <BenchBlock
          id="artificial-analysis"
          title="Artificial Analysis"
          measures="Independent indices Artificial Analysis runs on every model, plus measured speed."
          sourceLabel="Data: Artificial Analysis"
          sourceUrl={sources.artificial_analysis.url || "https://artificialanalysis.ai/"}
          asOf={asOfAA}
        >
          {statusRow(aaAtA, aaAtB)}
          {[
            {
              label: "Intelligence Index",
              valA: entryA?.intelligence_index ?? null,
              valB: entryB?.intelligence_index ?? null,
              format: (v: number | null) => (v != null ? v.toFixed(1) : "—"),
              max: 100,
            },
            {
              label: "Coding Index",
              valA: entryA?.coding_index ?? null,
              valB: entryB?.coding_index ?? null,
              format: (v: number | null) => (v != null ? v.toFixed(1) : "—"),
              max: 100,
            },
            {
              label: "Agentic Index",
              valA: entryA?.agentic_index ?? null,
              valB: entryB?.agentic_index ?? null,
              format: (v: number | null) => (v != null ? v.toFixed(1) : "—"),
              max: 100,
            },
            {
              label: "Output speed (tokens/s)",
              valA: entryA?.output_tps ?? null,
              valB: entryB?.output_tps ?? null,
              format: (v: number | null) => (v != null ? `${v.toFixed(0)} tok/s` : "—"),
              max: 300,
            },
            {
              label: "Time to first token (s)",
              valA: entryA?.ttft_s ?? null,
              valB: entryB?.ttft_s ?? null,
              format: (v: number | null) => (v != null ? `${v.toFixed(2)}s` : "—"),
              max: 5,
              lowerIsBetter: true,
            },
          ].map((row) => {
            const lower = "lowerIsBetter" in row && row.lowerIsBetter === true;
            const hasBoth = row.valA != null && row.valB != null;
            const aLeads = hasBoth && (lower ? row.valA! <= row.valB! : row.valA! >= row.valB!);
            const bLeads = hasBoth && (lower ? row.valB! <= row.valA! : row.valB! >= row.valA!);
            // Both models are on AA but one value is absent: AA has not published it.
            const missing = entryA && entryB ? "Not published by AA" : "Not on this leaderboard";

            return (
              <div key={row.label} className="cap-row">
                <div className="cap-header">
                  <span className="cap-name">{row.label}</span>
                  <span className="cap-delta">
                    <Delta a={row.valA} b={row.valB} missing={missing} lowerIsBetter={lower} />
                  </span>
                </div>
                <div className="cap-bars">
                  <div className="cap-bar-item" data-slot="A" data-lead={aLeads}>
                    <span className="cap-bar-label">A</span>
                    <div className="cap-bar-track">
                      <div
                        className="cap-bar-fill"
                        data-slot="A"
                        style={{
                          width: `${row.valA != null ? Math.min(100, Math.max(0, (row.valA / row.max) * 100)) : 0}%`,
                        }}
                      />
                    </div>
                    <span className="cap-bar-val mono" data-lead={aLeads} style={{ width: "auto" }}>
                      {row.format(row.valA)}
                    </span>
                  </div>
                  {entryA ? <span className="bench-aa-sub">from {entryA.name}</span> : null}

                  <div className="cap-bar-item" data-slot="B" data-lead={bLeads}>
                    <span className="cap-bar-label">B</span>
                    <div className="cap-bar-track">
                      <div
                        className="cap-bar-fill"
                        data-slot="B"
                        style={{
                          width: `${row.valB != null ? Math.min(100, Math.max(0, (row.valB / row.max) * 100)) : 0}%`,
                        }}
                      />
                    </div>
                    <span className="cap-bar-val mono" data-lead={bLeads} style={{ width: "auto" }}>
                      {row.format(row.valB)}
                    </span>
                  </div>
                  {entryB ? <span className="bench-aa-sub">from {entryB.name}</span> : null}
                </div>
              </div>
            );
          })}
        </BenchBlock>
      ) : null}
    </div>
  );
}
