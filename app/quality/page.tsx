import { getScores, getFreshness } from "@/lib/data";

const SOURCE_LABELS: Record<string, string> = {
  openrouter: "OpenRouter catalog",
  "swe-bench-verified": "SWE-bench Verified leaderboard",
  "livebench-scores": "LiveBench scores",
  "livebench-cost": "LiveBench cost",
};

function fmtWhen(iso: string) {
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  const when = days <= 0 ? "today" : days === 1 ? "1 day ago" : `${days} days ago`;
  return `${when} · ${d.toISOString().slice(0, 16).replace("T", " ")}Z`;
}

export default function QualityPage() {
  const data = getScores();
  const fresh = getFreshness();
  const q = data.data_quality;

  const methodCounts = new Map<string, number>();
  for (const m of [...data.livebench, ...data.swe_bench]) {
    const key = m.canonical_id ? (m.alias_method ?? "exact") : "unmatched";
    methodCounts.set(key, (methodCounts.get(key) ?? 0) + 1);
  }

  return (
    <>
      <header style={{ marginBottom: 20 }}>
        <h1 className="page-title">Data quality</h1>
        <p className="page-sub">
          Every comparison in this app is only as good as its alias matches and its ingestion
          freshness. This page shows both, honestly.
        </p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
        <div className="card">
          <h3 style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
            Ingestion freshness
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {fresh
              ? Object.entries(fresh.sources).map(([name, s]) => (
                  <div key={name} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13 }}>
                    <span>{SOURCE_LABELS[name] ?? name}</span>
                    <span style={{ textAlign: "right" }}>
                      <span className={`badge badge-${s.outcome === "ok" ? "ok" : s.outcome === "stale" ? "stale" : "err"}`}>
                        {s.outcome}
                      </span>
                      <div className="dim mono" style={{ fontSize: 11 }}>{fmtWhen(s.fetched_at)}</div>
                    </span>
                  </div>
                ))
              : "not ingested"}
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
            Alias match methods
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
            {[...methodCounts.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([method, n]) => (
                <div key={method} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className={method === "unmatched" ? "match-suffix-stripped" : method === "exact" ? "match-exact" : "match-suffix-stripped"}>
                    {method}
                  </span>
                  <span className="mono">{n}</span>
                </div>
              ))}
          </div>
          <p className="dim" style={{ fontSize: 11, marginTop: 10 }}>
            exact = full-name match · suffix/date-stripped = matched after removing reasoning-effort
            tags or run dates · unmatched = never guessed.
          </p>
        </div>

        <div className="card">
          <h3 style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
            Counts
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Catalog models</span><span className="mono">{q.counts.catalog_models}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>LiveBench models (matched)</span><span className="mono">{q.counts.livebench_models} ({q.counts.livebench_matched})</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>SWE-bench systems (matched)</span><span className="mono">{q.counts.swe_bench_systems} ({q.counts.swe_bench_matched})</span></div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
          Unmatched benchmark names ({q.unmatched.livebench.length})
        </h3>
        {q.unmatched.livebench.length ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {q.unmatched.livebench.map((n) => (
              <span key={n} className="badge badge-stale mono" style={{ textTransform: "none" }}>{n}</span>
            ))}
          </div>
        ) : (
          <p className="dim" style={{ fontSize: 13 }}>All benchmark names matched to the catalog.</p>
        )}
      </div>
    </>
  );
}
