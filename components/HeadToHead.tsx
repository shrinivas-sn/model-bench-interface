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
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* pickers */}
      <div className="h2h-pickers-bar">
        <div className="h2h-picker-slot">
          <ModelPicker
            models={livebench}
            value={slots[0]}
            onChange={(name) => handleSlotChange(0, name)}
            slotLabel="A"
            vendorDisplay={vendorDisplay}
          />
        </div>

        <button
          type="button"
          className="picker-swap-btn"
          onClick={handleSwap}
          title="Swap Model A and Model B"
          aria-label="Swap Model A and Model B"
        >
          ⇄
        </button>

        <div className="h2h-picker-slot">
          <ModelPicker
            models={livebench}
            value={slots[1]}
            onChange={(name) => handleSlotChange(1, name)}
            slotLabel="B"
            vendorDisplay={vendorDisplay}
          />
        </div>
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
