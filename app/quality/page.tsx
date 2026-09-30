import { getScores, getFreshness } from "@/lib/data";
import { summarizeFreshness, summarizeRelease } from "@/lib/status.mjs";
import { RelativeTime } from "@/components/RelativeTime";

const SOURCE_LABELS: Record<string, string> = {
  openrouter: "OpenRouter catalog (prices)",
  "livebench-scores": "LiveBench scores",
  "livebench-cost": "LiveBench cost",
  "terminal-bench": "Terminal-Bench leaderboard",
  "artificial-analysis": "Artificial Analysis API",
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
  for (const m of [
    ...data.livebench,
    ...data.terminal_bench,
    ...data.artificial_analysis,
  ]) {
    const key = m.canonical_id ? (m.alias_method ?? "exact") : "unmatched";
    methodCounts.set(key, (methodCounts.get(key) ?? 0) + 1);
  }
  const methods = [...methodCounts.entries()].sort((a, b) => b[1] - a[1]);

  const unmatchedLb = q.counts.livebench_models - q.counts.livebench_matched;
  const unmatchedTb = q.counts.terminal_bench_runs - q.counts.terminal_bench_matched;
  const unmatchedAa =
    (q.counts.artificial_analysis_models ?? 0) - (q.counts.artificial_analysis_matched ?? 0);

  return (
    <>
      <header className="page-head">
        <h1 className="page-title">Data health</h1>
        <p className="page-sub">
          Which sources were fetched, when, and which model names could not be matched. Unmatched
          names are listed, never guessed.
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
            exact = full-name match · manual = reviewed alias table · suffix/date-stripped = matched
            after removing reasoning-effort tags or run dates · unmatched = never guessed.
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
            <span>Terminal-Bench runs matched</span>
            <span className="mono">
              {q.counts.terminal_bench_matched} / {q.counts.terminal_bench_runs}
              {unmatchedTb > 0 && <span className="dim"> ({unmatchedTb} unmatched)</span>}
            </span>
          </p>
          {data.sources.artificial_analysis?.connected && q.counts.artificial_analysis_models ? (
            <p className="kv-row">
              <span>Artificial Analysis models matched</span>
              <span className="mono">
                {q.counts.artificial_analysis_matched} / {q.counts.artificial_analysis_models}
                {unmatchedAa > 0 && <span className="dim"> ({unmatchedAa} unmatched)</span>}
              </span>
            </p>
          ) : null}
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

      <div className="card" style={{ marginTop: 16 }}>
        <h2 className="card-title">
          Unmatched Terminal-Bench names ({q.unmatched.terminal_bench.length})
        </h2>
        {q.unmatched.terminal_bench.length ? (
          <>
            <div className="tag-list">
              {q.unmatched.terminal_bench.map((n) => (
                <span key={n} className="badge badge-stale mono">
                  {n}
                </span>
              ))}
            </div>
            <small className="dim" style={{ display: "block", marginTop: 12, lineHeight: 1.6 }}>
              To fix: add these to the manual alias table in{" "}
              <code>normalization/manual-aliases.json</code>, then re-run{" "}
              <code>npm run build:data</code>.
            </small>
          </>
        ) : (
          <p className="dim">Every Terminal-Bench name matched to the catalog.</p>
        )}
      </div>

      {data.sources.artificial_analysis?.connected && q.unmatched.artificial_analysis ? (
        <div className="card" style={{ marginTop: 16 }}>
          <h2 className="card-title">
            Unmatched Artificial Analysis names ({q.unmatched.artificial_analysis.length})
          </h2>
          {q.unmatched.artificial_analysis.length ? (
            <>
              <div className="tag-list">
                {q.unmatched.artificial_analysis.map((n) => (
                  <span key={n} className="badge badge-stale mono">
                    {n}
                  </span>
                ))}
              </div>
              <small className="dim" style={{ display: "block", marginTop: 12, lineHeight: 1.6 }}>
                To fix: add these to the manual alias table in{" "}
                <code>normalization/manual-aliases.json</code>, then re-run{" "}
                <code>npm run build:data</code>.
              </small>
            </>
          ) : (
            <p className="dim">Every Artificial Analysis name matched to the catalog.</p>
          )}
        </div>
      ) : null}
    </>
  );
}
