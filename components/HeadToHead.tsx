"use client";

import { useMemo, useState } from "react";
import { RadarChart } from "@/components/RadarChart";
import type { LivebenchModel, SweRow } from "@/lib/data";

type Props = {
  livebench: LivebenchModel[];
  swe: SweRow[];
  capabilities: string[];
};

type PickerModel = {
  label: string;
  vendor: string;
  matched: boolean;
  model: LivebenchModel | null;
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

export function HeadToHead({ livebench, swe, capabilities }: Props) {
  const pickers = useMemo<PickerModel[]>(
    () =>
      livebench
        .map((m) => ({
          label: m.canonical_id ?? `${m.benchmark_name} (unmatched)`,
          vendor: m.vendor,
          matched: m.canonical_id != null,
          model: m,
        }))
        .sort(
          (x, y) => Number(y.matched) - Number(x.matched) || x.label.localeCompare(y.label)
        ),
    [livebench]
  );

  const defaultIdx = (needle: string) => {
    const i = pickers.findIndex((p) => p.label.includes(needle));
    return i >= 0 ? i : 0;
  };
  const [aIdx, setAIdx] = useState(() => defaultIdx("opus-5.5"));
  const [bIdx, setBIdx] = useState(() => defaultIdx("gpt-5.5") || Math.min(1, pickers.length - 1));

  const a = pickers[aIdx]?.model ?? null;
  const b = pickers[bIdx]?.model ?? null;

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
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* pickers */}
      <div className="card card-quiet" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {[
          { label: "Model A", idx: aIdx, set: setAIdx, m: a },
          { label: "Model B", idx: bIdx, set: setBIdx, m: b },
        ].map((side) => (
          <div key={side.label} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label className="dim" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {side.label}
            </label>
            <select value={side.idx} onChange={(e) => side.set(Number(e.target.value))}>
              {pickers.map((p, i) => (
                <option key={p.label} value={i}>
                  {p.label}
                </option>
              ))}
            </select>
            <span className="dim" style={{ fontSize: 12 }}>
              {side.m.vendor} ·{" "}
              {side.m.alias_method ? (
                <span className={`match-${side.m.alias_method}`}>{side.m.alias_method}</span>
              ) : (
                <span className="badge badge-stale">unmatched</span>
              )}
            </span>
          </div>
        ))}
      </div>

      {/* capability table + radar */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, alignItems: "start" }}>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table>
            <thead>
              <tr>
                <th>Capability</th>
                <th style={{ textAlign: "right" }}>A</th>
                <th style={{ textAlign: "right" }}>B</th>
                <th style={{ textAlign: "right" }}>Δ</th>
              </tr>
            </thead>
            <tbody>
              {capabilities.map((cap) => {
                const va = a.categories[cap];
                const vb = b.categories[cap];
                return (
                  <tr key={cap}>
                    <td>{cap}</td>
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
        <div className="card card-quiet" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <RadarChart
            axes={capabilities}
            series={[
              { label: "A", values: a.categories },
              { label: "B", values: b.categories },
            ]}
          />
          <div style={{ display: "flex", gap: 16, fontSize: 12, flexWrap: "wrap", justifyContent: "center" }}>
            <span><span style={{ color: "var(--primary)" }}>■</span> {a.benchmark_name}</span>
            <span><span style={{ color: "#60a5fa" }}>■</span> {b.benchmark_name}</span>
          </div>
        </div>
      </div>

      {/* price + context + swe summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        <div className="card">
          <h3 style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
            Price ($/Mtok in)
          </h3>
          <div className="mono" style={{ fontSize: 15 }}>
            <div>A · {fmtPrice(a.pricing?.prompt)} <span className="dim" style={{ fontSize: 11 }}>({a.pricing?.source ?? "unknown"})</span></div>
            <div>B · {fmtPrice(b.pricing?.prompt)} <span className="dim" style={{ fontSize: 11 }}>({b.pricing?.source ?? "unknown"})</span></div>
          </div>
          <p className="dim" style={{ fontSize: 11, marginTop: 8 }}>
            Out: {fmtPrice(a.pricing?.completion)} / {fmtPrice(b.pricing?.completion)}
          </p>
        </div>
        <div className="card">
          <h3 style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
            Context window
          </h3>
          <div className="mono" style={{ fontSize: 15 }}>
            <div>A · {a.context_length ? `${(a.context_length / 1000).toFixed(0)}k` : "—"}</div>
            <div>B · {b.context_length ? `${(b.context_length / 1000).toFixed(0)}k` : "—"}</div>
          </div>
        </div>
        <div className="card">
          <h3 style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
            SWE-bench Verified
          </h3>
          <div className="mono" style={{ fontSize: 15 }}>
            <div>
              A ·{" "}
              {sweFor(a) ? (
                <>best {sweFor(a)!.best.toFixed(1)}% <span className="dim">({sweFor(a)!.n} runs)</span></>
              ) : (
                <span className="dim">no verified run</span>
              )}
            </div>
            <div>
              B ·{" "}
              {sweFor(b) ? (
                <>best {sweFor(b)!.best.toFixed(1)}% <span className="dim">({sweFor(b)!.n} runs)</span></>
              ) : (
                <span className="dim">no verified run</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* per-task detail */}
      <details className="card card-quiet">
        <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
          Per-task LiveBench scores ({taskKeys.length} tasks)
        </summary>
        <div style={{ overflowX: "auto", marginTop: 12 }}>
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
                    <td className="mono" style={{ fontSize: 12 }}>{t}</td>
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
