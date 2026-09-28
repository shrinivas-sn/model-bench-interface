"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { RadarChart } from "@/components/RadarChart";
import { ModelPicker } from "@/components/ModelPicker";
import { SwapIcon } from "@/components/icons";
import type { LivebenchModel, SweRow } from "@/lib/data";
import { defaultPair, formatFamilyLabel, formatPerMillion, readRecents } from "@/lib/picker.mjs";

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

export function HeadToHead({ livebench, swe, capabilities, vendorDisplay = {} }: Props) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramA, paramB, defaultA, defaultB, livebench]);

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

  const handleSwap = () => updateSlots([slots[1], slots[0]]);

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

  const sweFor = (m: LivebenchModel | null) => {
    const id = m?.canonical_id;
    if (!id) return null;
    const rows = swe.filter((r) => r.canonical_id === id && r.resolved_pct != null);
    if (!rows.length) return null;
    return { n: rows.length, best: Math.max(...rows.map((r) => r.resolved_pct as number)) };
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

  const labelOf = (m: LivebenchModel) => formatFamilyLabel(m.family_id || m.benchmark_name);

  const modelCard = (m: LivebenchModel, slot: "A" | "B", index: number) => {
    const sweRow = sweFor(m);
    return (
      <div className="h2h-model-card" data-slot={slot}>
        <ModelPicker
          models={livebench}
          value={slots[index]}
          onChange={(name) => handleSlotChange(index, name)}
          slotLabel={slot}
          vendorDisplay={vendorDisplay}
        />
        <div className="h2h-card-stats">
          <div className="h2h-card-stat">
            <span className="h2h-stat-label">$/Mtok in / out</span>
            <span className="h2h-stat-value mono">{priceSummary(m)}</span>
          </div>
          <div className="h2h-card-stat">
            <span className="h2h-stat-label">Context</span>
            <span className="h2h-stat-value mono">
              {m.context_length ? `${(m.context_length / 1000).toFixed(0)}k` : "—"}
            </span>
          </div>
          <div className="h2h-card-stat">
            <span className="h2h-stat-label">SWE-bench best</span>
            <span className="h2h-stat-value mono">
              {sweRow ? `${sweRow.best.toFixed(1)}% (${sweRow.n})` : "no match"}
            </span>
          </div>
        </div>
        <div className="h2h-card-meta">
          <span>
            {m.alias_method ? (
              <span className={`match-${m.alias_method}`}>{m.alias_method} match</span>
            ) : (
              <span className="badge badge-stale">unmatched</span>
            )}
          </span>
          <small className="mono dim">{m.benchmark_name}</small>
        </div>
      </div>
    );
  };

  return (
    <div className="h2h-root">
      <div className="h2h-cards-container">
        {modelCard(a, "A", 0)}

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

        {modelCard(b, "B", 1)}
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
