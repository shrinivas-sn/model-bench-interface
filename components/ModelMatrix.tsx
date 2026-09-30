"use client";

import { useMemo, useState } from "react";

import type { LivebenchModel } from "@/lib/data";
import { formatFamilyLabel, formatPerMillion } from "@/lib/picker.mjs";
import { EffortChip } from "@/components/EffortChip";

type SortKey = "mean-desc" | "mean-asc" | "name" | "price-asc";

const SORTS: { id: SortKey; label: string }[] = [
  { id: "mean-desc", label: "LiveBench overall, high → low" },
  { id: "mean-asc", label: "LiveBench overall, low → high" },
  { id: "name", label: "Model name" },
  { id: "price-asc", label: "Input price, cheap → expensive" },
];

export function ModelMatrix({
  models,
  capabilities,
}: {
  models: LivebenchModel[];
  capabilities: string[];
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("mean-desc");
  const [matchedOnly, setMatchedOnly] = useState(false);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = models.filter((m) => {
      if (matchedOnly && !m.canonical_id) return false;
      if (!q) return true;
      return (
        m.benchmark_name.toLowerCase().includes(q) ||
        (m.canonical_id ?? "").toLowerCase().includes(q) ||
        formatFamilyLabel(m.family_id).toLowerCase().includes(q) ||
        m.display_vendor.toLowerCase().includes(q)
      );
    });

    out = [...out].sort((x, y) => {
      switch (sort) {
        case "name":
          return x.benchmark_name.localeCompare(y.benchmark_name);
        case "price-asc": {
          const px = x.pricing?.input_per_million ?? Number.POSITIVE_INFINITY;
          const py = y.pricing?.input_per_million ?? Number.POSITIVE_INFINITY;
          return px - py;
        }
        case "mean-asc":
          return (x.overall ?? -1) - (y.overall ?? -1);
        default:
          return (y.overall ?? -1) - (x.overall ?? -1);
      }
    });

    return out;
  }, [models, query, sort, matchedOnly]);

  const unmatchedCount = models.filter((m) => !m.canonical_id).length;

  return (
    <div className="stack-tight">
      <div className="matrix-controls">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by model, company or canonical id…"
          aria-label="Filter models"
          className="matrix-search"
        />
        <label className="matrix-select">
          <span className="dim">Sort</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="matrix-toggle">
          <input
            type="checkbox"
            checked={matchedOnly}
            onChange={(e) => setMatchedOnly(e.target.checked)}
          />
          <span>
            Matched only <span className="dim">({models.length - unmatchedCount} of {models.length})</span>
          </span>
        </label>
      </div>

      <p className="dim matrix-count">
        Showing <span className="mono">{rows.length}</span> of{" "}
        <span className="mono">{models.length}</span> benchmark rows. Sorted by mean across axes —
        indicative only, scores are per-benchmark.
      </p>

      <div className="card card-flush">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Model</th>
                <th>OpenRouter id</th>
                <th className="num">LiveBench overall</th>
                {capabilities.map((c) => (
                  <th key={c} className="num">
                    {c === "Instruction Following" ? "IF" : c}
                  </th>
                ))}
                <th className="num">$/Mtok in</th>
                <th className="num">Context</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.benchmark_name}>
                  <td>
                    <span className="matrix-model">
                      <span className="mono">{m.benchmark_name}</span>
                      <EffortChip effort={m.effort} />
                      {m.thinking && <span className="thinking-badge">thinking</span>}
                    </span>
                  </td>
                  <td>
                    {m.canonical_id ? (
                      <span className="mono dim">{m.canonical_id}</span>
                    ) : (
                      <span className="badge badge-stale">unmatched</span>
                    )}
                  </td>
                  <td className={`mono num${m.overall == null ? " unknown" : ""}`}>
                    {m.overall?.toFixed(1) ?? "—"}
                  </td>
                  {capabilities.map((c) => {
                    const v = m.categories[c];
                    return (
                      <td key={c} className={`mono num${v == null ? " unknown" : ""}`}>
                        {v?.toFixed(1) ?? "—"}
                      </td>
                    );
                  })}
                  <td className="mono num">
                    {m.pricing ? formatPerMillion(m.pricing.input_per_million) : "—"}
                  </td>
                  <td className="mono num">
                    {m.context_length ? `${(m.context_length / 1000).toFixed(0)}k` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {rows.length === 0 && (
        <p className="dim">No model matches “{query}”. Clear the filter to see all {models.length} rows.</p>
      )}
    </div>
  );
}
