import { getScores } from "@/lib/data";
import { EffortChip } from "@/components/EffortChip";

export default function MatrixPage() {
  const data = getScores();
  const caps = data.capabilities;
  const rows = [...data.livebench].sort((a, b) => {
    const mean = (m: typeof a) =>
      Object.values(m.categories).reduce((s, v) => s + v, 0) / (Object.keys(m.categories).length || 1);
    return mean(b) - mean(a);
  });

  return (
    <>
      <header style={{ marginBottom: 20 }}>
        <h1 className="page-title">Benchmark matrix</h1>
        <p className="page-sub">
          LiveBench capability means per model — {rows.length} models. Unmatched benchmark names
          are shown as-is with an honest badge. Sorted by mean across axes (indicative only —
          scores are per-benchmark, not commensurable across them).
        </p>
      </header>
      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Model</th>
              <th>Canonical (OpenRouter)</th>
              {caps.map((c) => (
                <th key={c} style={{ textAlign: "right" }}>
                  {c === "Instruction Following" ? "IF" : c}
                </th>
              ))}
              <th style={{ textAlign: "right" }}>$/Mtok in</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.benchmark_name}>
                <td className="mono" style={{ whiteSpace: "nowrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span>{m.benchmark_name}</span>
                    <EffortChip effort={m.effort} />
                    {m.thinking && <span className="thinking-badge">thinking</span>}
                  </div>
                </td>
                <td>
                  {m.canonical_id ? (
                    <span className="mono">{m.canonical_id}</span>
                  ) : (
                    <span className="badge badge-stale">unmatched</span>
                  )}
                </td>
                {caps.map((c) => {
                  const v = m.categories[c];
                  return (
                    <td key={c} className="mono" style={{ textAlign: "right", color: v == null ? "var(--text-muted)" : undefined }}>
                      {v?.toFixed(1) ?? "—"}
                    </td>
                  );
                })}
                <td className="mono" style={{ textAlign: "right" }}>
                  {m.pricing?.prompt != null ? (m.pricing.prompt === 0 ? "free" : `$${m.pricing.prompt < 1 ? m.pricing.prompt.toFixed(2) : m.pricing.prompt.toFixed(1)}`) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
