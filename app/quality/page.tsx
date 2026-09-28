import { getScores, getFreshness } from "@/lib/data";
import { summarizeFreshness, summarizeRelease } from "@/lib/status.mjs";
import { RelativeTime } from "@/components/RelativeTime";

const SOURCE_LABELS: Record<string, string> = {
  openrouter: "OpenRouter catalog",
  "swe-bench-verified": "SWE-bench Verified leaderboard",
  "livebench-scores": "LiveBench scores",
  "livebench-cost": "LiveBench cost",
};

function fmtAbsolute(iso: string) {
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)}Z`;
}

export default function QualityPage() {
  const data = getScores();
  const fresh = getFreshness();
  const q = data.data_quality;

  const summary = summarizeFreshness(fresh?.sources ?? {});

  const methodCounts = new Map<string, number>();
  for (const m of [...data.livebench, ...data.swe_bench]) {
    const key = m.canonical_id ? (m.alias_method ?? "exact") : "unmatched";
    methodCounts.set(key, (methodCounts.get(key) ?? 0) + 1);
  }
  const methods = [...methodCounts.entries()].sort((a, b) => b[1] - a[1]);

  const unmatchedSwe = q.counts.swe_bench_systems - q.counts.swe_bench_matched;
  const unmatchedLb = q.counts.livebench_models - q.counts.livebench_matched;

  return (
    <>
      <header className="page-head">
        <h1 className="page-title">Data health</h1>
        <p className="page-sub">
          A comparison is only as good as its freshness and its name matching. Both are shown here
          without rounding up.
        </p>
        <p className="page-purpose">
          Answers: is this data current, and how many benchmark names did the matcher have to
          admit it could not place?
        </p>
      </header>

      <div className="card-grid">
        <div className="card">
          <h2 className="card-title">Ingestion</h2>
          <p className="kv-row">
            <span>Last ingest</span>
            <span className="mono">
              <RelativeTime iso={summary.fetchedAt} />
            </span>
          </p>
          <p className="kv-row">
            <span>Status</span>
            <span>
              <span className={`badge badge-${summary.tone}`}>{summary.label}</span>
            </span>
          </p>
          <p className="kv-row">
            <span>Sources healthy</span>
            <span className="mono">
              {summary.healthy} / {summary.total}
            </span>
          </p>
          <p className="kv-row">
            <span>Release</span>
            <span className="mono" style={{ textAlign: "right" }}>
              {summarizeRelease(data.release)}
            </span>
          </p>
          <p className="kv-row">
            <span>App data built</span>
            <span className="mono">
              <RelativeTime iso={data.generated_at} />
            </span>
          </p>
          <small className="dim" style={{ display: "block", marginTop: 10, lineHeight: 1.6 }}>
            GitHub Actions re-ingests daily at 02:30 UTC and commits the refreshed stores, which
            triggers a rebuild of this site.
          </small>
        </div>

        <div className="card">
          <h2 className="card-title">Per source</h2>
          {fresh ? (
            <div className="stack-tight">
              {Object.entries(fresh.sources).map(([name, s]) => (
                <div key={name} className="kv-row">
                  <span>{SOURCE_LABELS[name] ?? name}</span>
                  <span style={{ textAlign: "right" }}>
                    <span
                      className={`badge badge-${
                        s.outcome === "ok" ? "ok" : s.outcome === "stale" ? "stale" : "err"
                      }`}
                    >
                      {s.outcome}
                    </span>
                    <div className="dim mono" style={{ fontSize: 11.5, marginTop: 4 }}>
                      {fmtAbsolute(s.fetched_at)}
                    </div>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="dim">No ingest report found — run the ingestion workflow.</p>
          )}
        </div>

        <div className="card">
          <h2 className="card-title">Name matching</h2>
          <div className="stack-tight">
            {methods.map(([method, n]) => (
              <div key={method} className="kv-row">
                <span
                  className={
                    method === "unmatched"
                      ? "match-suffix-stripped"
                      : method === "exact"
                        ? "match-exact"
                        : "match-suffix-stripped"
                  }
                >
                  {method}
                </span>
                <span className="mono">{n}</span>
              </div>
            ))}
          </div>
          <small className="dim" style={{ display: "block", marginTop: 10, lineHeight: 1.6 }}>
            exact = full-name match · suffix/date-stripped = matched after removing reasoning-effort
            tags or run dates · unmatched = never guessed.
          </small>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2 className="card-title">Coverage</h2>
        <div className="card-grid">
          <p className="kv-row">
            <span>OpenRouter catalog models</span>
            <span className="mono">{q.counts.catalog_models}</span>
          </p>
          <p className="kv-row">
            <span>LiveBench rows matched</span>
            <span className="mono">
              {q.counts.livebench_matched} / {q.counts.livebench_models}
              {unmatchedLb > 0 && <span className="dim"> ({unmatchedLb} unmatched)</span>}
            </span>
          </p>
          <p className="kv-row">
            <span>SWE-bench systems matched</span>
            <span className="mono">
              {q.counts.swe_bench_matched} / {q.counts.swe_bench_systems}
              {unmatchedSwe > 0 && <span className="dim"> ({unmatchedSwe} unmatched)</span>}
            </span>
          </p>
        </div>
        <small className="dim" style={{ display: "block", marginTop: 12, lineHeight: 1.6 }}>
          Unmatched rows still appear everywhere in the app, labelled <em>unmatched</em> — they are
          never coerced onto a similar catalog id, because a wrong match silently corrupts every
          comparison built on it.
        </small>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2 className="card-title">Unmatched LiveBench names ({q.unmatched.livebench.length})</h2>
        {q.unmatched.livebench.length ? (
          <>
            <div className="tag-list">
              {q.unmatched.livebench.map((n) => (
                <span key={n} className="badge badge-stale mono">
                  {n}
                </span>
              ))}
            </div>
            <small className="dim" style={{ display: "block", marginTop: 12, lineHeight: 1.6 }}>
              To fix: add these to the alias table in <code>normalization/registry.mjs</code>, then
              re-run <code>npm run build:data</code>. Each new match raises the coverage numbers
              above.
            </small>
          </>
        ) : (
          <p className="dim">Every benchmark name matched to the catalog.</p>
        )}
      </div>
    </>
  );
}
