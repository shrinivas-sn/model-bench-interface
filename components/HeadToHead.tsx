"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ModelPicker } from "@/components/ModelPicker";
import { EffortChip } from "@/components/EffortChip";
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
  readRecents,
  writeRecents,
} from "@/lib/picker.mjs";
import { runsForVariant, scoreDelta } from "@/lib/compare.mjs";

type Props = {
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
}: {
  a: number | null | undefined;
  b: number | null | undefined;
}) {
  const d = scoreDelta(a ?? null, b ?? null);
  if (d == null) return <span className="unknown">Not on this leaderboard</span>;
  if (Math.abs(d) < 0.05) return <span className="dim">≈</span>;
  return d > 0 ? (
    <span className="delta-up">+{d.toFixed(1)}</span>
  ) : (
    <span className="delta-down">{d.toFixed(1)}</span>
  );
}

export function HeadToHead({
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
  }, [paramA, paramB, defaultA, defaultB, livebench]);

  // With no link to follow, lead with what this visitor picked last time.
  const appliedRecents = useRef(false);
  useEffect(() => {
    if (appliedRecents.current) return;
    appliedRecents.current = true;
    if (paramA || paramB) return;
    const recents = readRecents(storage());
    if (!recents.length) return;
    const [a, b] = defaultPair(livebench, recents);
    if (a && b) setSlots([a, b]);
  }, [livebench, paramA, paramB]);

  const updateUrl = (nextSlots: string[]) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("a", nextSlots[0]);
    params.set("b", nextSlots[1]);
    params.delete("effort_a");
    params.delete("effort_b");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleSlotChange = (index: number, name: string) => {
    const next = [...slots];
    next[index] = name;
    setSlots(next);
    writeRecents(storage(), name);
    updateUrl(next);
  };

  const handleSwap = () => {
    const nextSlots = [slots[1], slots[0]];
    setSlots(nextSlots);
    updateUrl(nextSlots);
  };

  const a = useMemo(
    () => livebench.find((m) => m.benchmark_name === slots[0]) ?? null,
    [livebench, slots]
  );
  const b = useMemo(
    () => livebench.find((m) => m.benchmark_name === slots[1]) ?? null,
    [livebench, slots]
  );

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

  const labelOf = (m: LivebenchModel) => formatFamilyLabel(m.family_id || m.benchmark_name);

  // Terminal-Bench runs
  const newestTbDate =
    terminalBench.map((r) => r.run_date).filter(Boolean).sort().pop() || "—";
  const tbA = runsForVariant(
    terminalBench,
    a.canonical_id,
    a.effort,
    "reasoning_effort"
  ) as { exact: TerminalBenchRun | null; all: TerminalBenchRun[] };
  const tbB = runsForVariant(
    terminalBench,
    b.canonical_id,
    b.effort,
    "reasoning_effort"
  ) as { exact: TerminalBenchRun | null; all: TerminalBenchRun[] };
  const hasExactTbBoth = Boolean(tbA.exact && tbB.exact);

  // Artificial Analysis entries
  const aaA = runsForVariant(
    artificialAnalysis,
    a.canonical_id,
    a.effort,
    "effort"
  ) as { exact: ArtificialAnalysisModel | null; all: ArtificialAnalysisModel[] };
  const aaB = runsForVariant(
    artificialAnalysis,
    b.canonical_id,
    b.effort,
    "effort"
  ) as { exact: ArtificialAnalysisModel | null; all: ArtificialAnalysisModel[] };
  const entryA: ArtificialAnalysisModel | null =
    aaA.exact ?? (aaA.all.length === 1 ? aaA.all[0] : null);
  const entryB: ArtificialAnalysisModel | null =
    aaB.exact ?? (aaB.all.length === 1 ? aaB.all[0] : null);
  const asOfAA = sources.artificial_analysis?.fetched_at
    ? `Fetched ${sources.artificial_analysis.fetched_at.slice(0, 10)}`
    : "Fetched";

  const renderModelCard = (m: LivebenchModel, slot: "A" | "B", index: number) => {
    return (
      <div className="h2h-model-card" data-slot={slot}>
        <ModelPicker
          models={livebench}
          value={slots[index]}
          onChange={(name) => handleSlotChange(index, name)}
          slotLabel={slot}
          vendorDisplay={vendorDisplay}
        />

        <div className="h2h-effort-row" data-slot={slot}>
          <span className="h2h-stat-label">Effort:</span>
          {m.effort ? (
            <EffortChip effort={m.effort} />
          ) : (
            <span className="unknown">effort not stated</span>
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
              <Delta a={a.overall} b={b.overall} />
            </span>
          </div>
          <div className="cap-bars">
            <div
              className="cap-bar-item"
              data-slot="A"
              data-lead={Boolean(a.overall != null && b.overall != null && a.overall >= b.overall)}
            >
              <span className="cap-bar-label">A</span>
              <div className="cap-bar-track">
                <div
                  className="cap-bar-fill"
                  data-slot="A"
                  style={{ width: `${a.overall != null ? Math.min(100, Math.max(0, a.overall)) : 0}%` }}
                />
              </div>
              <span
                className="cap-bar-val mono"
                data-lead={Boolean(a.overall != null && b.overall != null && a.overall >= b.overall)}
              >
                {a.overall?.toFixed(1) ?? "—"}
              </span>
            </div>

            <div
              className="cap-bar-item"
              data-slot="B"
              data-lead={Boolean(a.overall != null && b.overall != null && b.overall >= a.overall)}
            >
              <span className="cap-bar-label">B</span>
              <div className="cap-bar-track">
                <div
                  className="cap-bar-fill"
                  data-slot="B"
                  style={{ width: `${b.overall != null ? Math.min(100, Math.max(0, b.overall)) : 0}%` }}
                />
              </div>
              <span
                className="cap-bar-val mono"
                data-lead={Boolean(a.overall != null && b.overall != null && b.overall >= a.overall)}
              >
                {b.overall?.toFixed(1) ?? "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Capability rows */}
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
                  const va = a.tasks[t];
                  const vb = b.tasks[t];
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
          {aaA.all.length > 1 && !aaA.exact ? (
            <div className="card-notice">
              A: Artificial Analysis lists several versions of this model — pick the matching effort to compare (
              {aaA.all.map((r) => r.name).join(", ")})
            </div>
          ) : null}
          {aaB.all.length > 1 && !aaB.exact ? (
            <div className="card-notice">
              B: Artificial Analysis lists several versions of this model — pick the matching effort to compare (
              {aaB.all.map((r) => r.name).join(", ")})
            </div>
          ) : null}

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
            },
          ].map((row) => {
            const hasBoth = row.valA != null && row.valB != null;
            const aLeads = hasBoth && row.valA! >= row.valB!;
            const bLeads = hasBoth && row.valB! >= row.valA!;

            return (
              <div key={row.label} className="cap-row">
                <div className="cap-header">
                  <span className="cap-name">{row.label}</span>
                  <span className="cap-delta">
                    <Delta a={row.valA} b={row.valB} />
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
