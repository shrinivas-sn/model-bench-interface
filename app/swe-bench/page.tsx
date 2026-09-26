import { getScores } from "@/lib/data";

export default function SweBenchPage() {
  const data = getScores();
  const rows = data.swe_bench.filter((r) => r.resolved_pct != null).slice(0, 60);

  return (
    <>
      <header style={{ marginBottom: 20 }}>
        <h1 className="page-title">SWE-bench Verified</h1>
        <p className="page-sub">
          Top system runs (agent + model) by % resolved of 500 human-verified issues. Each row is
          a system run — the same model appears under many agents, which is exactly why the
          model choice matters separately from the agent choice.
        </p>
      </header>
      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>System</th>
              <th>Model</th>
              <th style={{ textAlign: "right" }}>Resolved %</th>
              <th>Date</th>
              <th>Agent</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.source_id}>
                <td className="mono dim">{i + 1}</td>
                <td style={{ maxWidth: 320 }}>{r.system}</td>
                <td>
                  {r.canonical_id ? (
                    <span className="mono" style={{ fontSize: 12 }}>{r.canonical_id}</span>
                  ) : r.model_alias ? (
                    <>
                      <span className="mono dim" style={{ fontSize: 12 }}>{r.model_alias}</span>{" "}
                      <span className="badge badge-stale">unmatched</span>
                    </>
                  ) : (
                    <span className="badge badge-err">no model</span>
                  )}
                </td>
                <td className="mono" style={{ textAlign: "right", fontWeight: 600 }}>{r.resolved_pct?.toFixed(1)}</td>
                <td className="mono dim" style={{ fontSize: 12 }}>{r.run_date ?? "—"}</td>
                <td className="dim" style={{ fontSize: 12 }}>{r.agent ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
