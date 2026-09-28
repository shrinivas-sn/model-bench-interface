"use client";

import { useMemo, useState } from "react";

import type { SweRow } from "@/lib/data";

export function SweBenchTable({ rows }: { rows: SweRow[] }) {
  const [query, setQuery] = useState("");
  const [matchedOnly, setMatchedOnly] = useState(false);

  const scored = useMemo(
    () => rows.filter((r) => r.resolved_pct != null),
    [rows]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scored.filter((r) => {
      if (matchedOnly && !r.canonical_id) return false;
      if (!q) return true;
      return [r.system, r.model_alias, r.org, r.agent, r.canonical_id]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q));
    });
  }, [scored, query, matchedOnly]);

  const matched = scored.filter((r) => r.canonical_id).length;
  const agents = new Set(scored.map((r) => r.agent).filter(Boolean)).size;

  return (
    <div className="stack-tight">
      <div className="matrix-controls">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by system, model, org or agent…"
          aria-label="Filter SWE-bench systems"
          className="matrix-search"
        />
        <label className="matrix-toggle">
          <input
            type="checkbox"
            checked={matchedOnly}
            onChange={(e) => setMatchedOnly(e.target.checked)}
          />
          <span>
            Matched models only <span className="dim">({matched} of {scored.length})</span>
          </span>
        </label>
      </div>

      <p className="dim matrix-count">
        Showing <span className="mono">{filtered.length}</span> of{" "}
        <span className="mono">{scored.length}</span> scored runs across{" "}
        <span className="mono">{agents}</span> agent harnesses. Resolved % is against the 500
        human-verified issues.
      </p>

      <div className="card card-flush">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th className="num">#</th>
                <th>System</th>
                <th>Model</th>
                <th className="num">Resolved %</th>
                <th>Date</th>
                <th>Agent</th>
                <th>Run</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.source_id}>
                  <td className="mono dim num">{i + 1}</td>
                  <td className="swe-system">{r.system}</td>
                  <td>
                    {r.canonical_id ? (
                      <span className="mono">{r.canonical_id}</span>
                    ) : r.model_alias ? (
                      <span className="matrix-model">
                        <span className="mono dim">{r.model_alias}</span>
                        <span className="badge badge-stale">unmatched</span>
                      </span>
                    ) : (
                      <span className="badge badge-err">no model recorded</span>
                    )}
                  </td>
                  <td className="mono num swe-score">{r.resolved_pct?.toFixed(1)}</td>
                  <td className="mono dim">{r.run_date ?? "—"}</td>
                  <td className="dim">{r.agent ?? "—"}</td>
                  <td>
                    {r.url ? (
                      <a className="swe-link" href={r.url} target="_blank" rel="noreferrer noopener">
                        source
                      </a>
                    ) : (
                      <span className="unknown">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filtered.length === 0 && (
        <p className="dim">No run matches “{query}”. Clear the filter to see all {scored.length} runs.</p>
      )}
    </div>
  );
}
