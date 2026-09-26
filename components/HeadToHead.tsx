"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { RadarChart } from "@/components/RadarChart";
import { ModelPicker } from "@/components/ModelPicker";
import type { LivebenchModel, SweRow } from "@/lib/data";

type Props = {
  livebench: LivebenchModel[];
  swe: SweRow[];
  capabilities: string[];
  vendorDisplay?: Record<string, string>;
};

function fmtPrice(p: number | null | undefined) {
  if (p == null) return "—";
  if (p === 0) return "free";
  return `$${p < 1 ? p.toFixed(2) : p.toFixed(1)}`;
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

export function HeadToHead({ livebench, swe, capabilities, vendorDisplay = {} }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const defaultA = useMemo(() => {
    return (
      livebench.find((m) => m.benchmark_name === "claude-opus-5-5-max-effort")?.benchmark_name ||
      livebench.find((m) => m.benchmark_name.includes("opus-5"))?.benchmark_name ||
      livebench[0]?.benchmark_name ||
      ""
    );
  }, [livebench]);

  const defaultB = useMemo(() => {
    return (
      livebench.find((m) => m.benchmark_name === "gpt-5.5-xhigh")?.benchmark_name ||
      livebench.find((m) => m.benchmark_name.includes("gpt-5"))?.benchmark_name ||
      (livebench[1] || livebench[0])?.benchmark_name ||
      ""
    );
  }, [livebench]);

  const paramA = searchParams.get("a");
  const paramB = searchParams.get("b");

  const validA = paramA && livebench.some((m) => m.benchmark_name === paramA) ? paramA : defaultA;
  const validB = paramB && livebench.some((m) => m.benchmark_name === paramB) ? paramB : defaultB;

  const [slots, setSlots] = useState<string[]>([validA, validB]);

  useEffect(() => {
    const curA = paramA && livebench.some((m) => m.benchmark_name === paramA) ? paramA : defaultA;
    const curB = paramB && livebench.some((m) => m.benchmark_name === paramB) ? paramB : defaultB;
    setSlots([curA, curB]);
  }, [paramA, paramB, defaultA, defaultB, livebench]);

  const updateSlots = (nextSlots: string[]) => {
    setSlots(nextSlots);
    const params = new URLSearchParams(searchParams.toString());
    params.set("a", nextSlots[0]);
    params.set("b", nextSlots[1]);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleSlotChange = (index: number, name: string) => {
    const next = [...slots];
    next[index] = name;
    updateSlots(next);
  };

  const handleSwap = () => {
    updateSlots([slots[1], slots[0]]);
  };

  const a = useMemo(() => livebench.find((m) => m.benchmark_name === slots[0]) || null, [livebench, slots]);
  const b = useMemo(() => livebench.find((m) => m.benchmark_name === slots[1]) || null, [livebench, slots]);

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
    const best = Math.max(...rows.map((r) => r.resolved_pct as number));
    const n = rows.length;
    return { n, best };
  };

  if (!a || !b) {
    return (
      <div className="card">
        <p className="dim">
          No benchmark data. Run <code>npm run ingest</code> then <code>npm run build:data</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="h2h-root">
      {/* Top Model Cards */}
      <div className="h2h-cards-container">
        {/* Model Card A */}
        <div className="h2h-model-card">
          <ModelPicker
            models={livebench}
            value={slots[0]}
            onChange={(name) => handleSlotChange(0, name)}
            slotLabel="A"
            vendorDisplay={vendorDisplay}
          />
          <div className="h2h-card-stats">
            <div className="h2h-card-stat">
              <span className="h2h-stat-label">Price (in / out)</span>
              <span className="h2h-stat-value mono">
                {fmtPrice(a.pricing?.prompt)} / {fmtPrice(a.pricing?.completion)}
              </span>
            </div>
            <div className="h2h-card-stat">
              <span className="h2h-stat-label">Context Window</span>
              <span className="h2h-stat-value mono">
                {a.context_length ? `${(a.context_length / 1000).toFixed(0)}k tokens` : "—"}
              </span>
            </div>
            <div className="h2h-card-stat">
              <span className="h2h-stat-label">SWE-bench Best</span>
              <span className="h2h-stat-value mono">
                {sweFor(a) ? `${sweFor(a)!.best.toFixed(1)}% (${sweFor(a)!.n})` : "none"}
              </span>
            </div>
          </div>
          <div className="h2h-card-meta">
            <span>
              Method:{" "}
              {a.alias_method ? (
                <span className={`match-${a.alias_method}`}>{a.alias_method}</span>
              ) : (
                <span className="badge badge-stale">unmatched</span>
              )}
            </span>
            <small className="mono dim">
              {a.benchmark_name}
            </small>
          </div>
        </div>

        {/* Swap Button */}
        <div className="h2h-card-swap-wrap">
          <button
            type="button"
            className="picker-swap-btn"
            onClick={handleSwap}
            title="Swap Model A and Model B"
            aria-label="Swap Model A and Model B"
          >
            ⇄
          </button>
        </div>

        {/* Model Card B */}
        <div className="h2h-model-card">
          <ModelPicker
            models={livebench}
            value={slots[1]}
            onChange={(name) => handleSlotChange(1, name)}
            slotLabel="B"
            vendorDisplay={vendorDisplay}
          />
          <div className="h2h-card-stats">
            <div className="h2h-card-stat">
              <span className="h2h-stat-label">Price (in / out)</span>
              <span className="h2h-stat-value mono">
                {fmtPrice(b.pricing?.prompt)} / {fmtPrice(b.pricing?.completion)}
              </span>
            </div>
            <div className="h2h-card-stat">
              <span className="h2h-stat-label">Context Window</span>
              <span className="h2h-stat-value mono">
                {b.context_length ? `${(b.context_length / 1000).toFixed(0)}k tokens` : "—"}
              </span>
            </div>
            <div className="h2h-card-stat">
              <span className="h2h-stat-label">SWE-bench Best</span>
              <span className="h2h-stat-value mono">
                {sweFor(b) ? `${sweFor(b)!.best.toFixed(1)}% (${sweFor(b)!.n})` : "none"}
              </span>
            </div>
          </div>
          <div className="h2h-card-meta">
            <span>
              Method:{" "}
              {b.alias_method ? (
                <span className={`match-${b.alias_method}`}>{b.alias_method}</span>
              ) : (
                <span className="badge badge-stale">unmatched</span>
              )}
            </span>
            <small className="mono dim">
              {b.benchmark_name}
            </small>
          </div>
        </div>
      </div>

      {/* Middle: Paired Capability Bars + Radar Chart */}
      <div className="h2h-compare-grid">
        <div className="h2h-capabilities-card">
          {capabilities.map((cap) => {
            const va = a.categories[cap];
            const vb = b.categories[cap];
            const hasBoth = va != null && vb != null;
            const aWins = hasBoth && va >= vb;
            const bWins = hasBoth && vb >= va;

            return (
              <div key={cap} className="cap-row">
                <div className="cap-header">
                  <span className="cap-name">{cap}</span>
                  <div className="cap-delta">
                    {hasBoth ? <Delta a={va} b={vb} /> : <span className="dim">—</span>}
                  </div>
                </div>

                <div className="cap-bars">
                  {/* Model A Bar */}
                  <div className="cap-bar-item">
                    <span className="cap-bar-label">A</span>
                    <div className="cap-bar-track">
                      <div
                        className={`cap-bar-fill ${aWins ? "cap-winner" : "cap-loser"}`}
                        style={{ width: `${va != null ? Math.min(100, Math.max(0, va)) : 0}%` }}
                      />
                    </div>
                    <span className={`cap-bar-val mono ${aWins ? "cap-winner-text" : ""}`}>
                      {va?.toFixed(1) ?? "—"}
                    </span>
                  </div>

                  {/* Model B Bar */}
                  <div className="cap-bar-item">
                    <span className="cap-bar-label">B</span>
                    <div className="cap-bar-track">
                      <div
                        className={`cap-bar-fill ${bWins ? "cap-winner" : "cap-loser"}`}
                        style={{ width: `${vb != null ? Math.min(100, Math.max(0, vb)) : 0}%` }}
                      />
                    </div>
                    <span className={`cap-bar-val mono ${bWins ? "cap-winner-text" : ""}`}>
                      {vb?.toFixed(1) ?? "—"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="h2h-radar-card">
          <RadarChart
            axes={capabilities}
            series={[
              { label: "A", values: a.categories },
              { label: "B", values: b.categories },
            ]}
          />
          <div className="h2h-radar-legend">
            <span><span style={{ color: "var(--primary)" }}>■</span> Model A</span>
            <span><span style={{ color: "#60a5fa" }}>■</span> Model B</span>
          </div>
        </div>
      </div>

      {/* per-task detail */}
      <details className="h2h-tasks-details">
        <summary className="h2h-tasks-summary">
          Per-task LiveBench scores ({taskKeys.length} tasks)
        </summary>
        <div className="h2h-tasks-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Task</th>
                <th style={{ textAlign: "right" }}>A</th>
                <th style={{ textAlign: "right" }}>B</th>
                <th style={{ textAlign: "right" }}>Δ</th>
              </tr>
            </thead>
            <tbody>
              {taskKeys.map((t) => {
                const va = a.tasks[t];
                const vb = b.tasks[t];
                return (
                  <tr key={t}>
                    <td className="mono">{t}</td>
                    <td className="mono" style={{ textAlign: "right" }}>{va?.toFixed(1) ?? "—"}</td>
                    <td className="mono" style={{ textAlign: "right" }}>{vb?.toFixed(1) ?? "—"}</td>
                    <td style={{ textAlign: "right" }}>
                      {va != null && vb != null ? <Delta a={va} b={vb} /> : <span className="dim">—</span>}
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
