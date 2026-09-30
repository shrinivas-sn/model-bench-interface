export type CatalogModel = {
  id: string;
  title: string;
  vendor: string;
  context_length: number | null;
  /** Dollars per million tokens. Every price in this file shares this unit. */
  input_per_million: number | null;
  output_per_million: number | null;
  supported_efforts?: string[] | null;
  default_effort?: string | null;
};

export type LivebenchModel = {
  benchmark_name: string;
  canonical_id: string | null;
  alias_method: string | null;
  vendor: string;
  display_vendor: string;
  family_id: string;
  effort: "max" | "xhigh" | "high" | "medium" | "low" | null;
  supported_efforts?: string[] | null;
  default_effort?: string | null;
  thinking: boolean;
  overall: number | null;
  tasks: Record<string, number>;
  categories: Record<string, number>;
  cost: {
    input_price_per_million: number | null;
    output_price_per_million: number | null;
    cost_per_question: number | null;
    avg_input_tokens?: number | null;
    avg_output_tokens?: number | null;
  } | null;
  pricing: {
    input_per_million: number | null;
    output_per_million: number | null;
    source: "openrouter" | "livebench";
  } | null;
  context_length?: number | null;
};

export type SweRow = {
  source_id: string;
  system: string;
  model_alias: string | null;
  org: string | null;
  resolved_pct: number | null;
  run_date: string | null;
  agent: string | null;
  reasoning_effort?: string | null;
  is_open_model: boolean | null;
  checked: boolean | null;
  canonical_id: string | null;
  alias_method: string | null;
  url: string | null;
};

export type TerminalBenchRun = {
  run_id: string;
  canonical_id: string | null;
  alias_method: string | null;
  model_label: string;
  model_org: string | null;
  agent_label: string | null;
  reasoning_effort: string | null;
  accuracy: number;
  ci95_half_width: number | null;
  n_trials: number | null;
  total_cost_usd: number | null;
  run_date: string | null;
  leaderboard_title: string;
};

export type ArtificialAnalysisModel = {
  aa_id: string;
  canonical_id: string | null;
  alias_method: string | null;
  name: string;
  effort: string | null;
  creator: string | null;
  intelligence_index: number | null;
  coding_index: number | null;
  agentic_index: number | null;
  output_tps: number | null;
  ttft_s: number | null;
  release_date: string | null;
};

export type ScoresData = {
  generated_at: string;
  release: string;
  vendor_display: Record<string, string>;
  capabilities: string[];
  sources: {
    livebench: { release: string; url: string };
    terminal_bench: { title: string; url: string } | null;
    artificial_analysis: { connected: boolean; url: string; fetched_at?: string | null };
  };
  catalog: CatalogModel[];
  livebench: LivebenchModel[];
  swe_bench: SweRow[];
  terminal_bench: TerminalBenchRun[];
  artificial_analysis: ArtificialAnalysisModel[];
  data_quality: {
    counts: {
      catalog_models: number;
      livebench_models: number;
      livebench_matched: number;
      swe_bench_systems: number;
      swe_bench_matched: number;
      terminal_bench_runs: number;
      terminal_bench_matched: number;
      artificial_analysis_models?: number;
      artificial_analysis_matched?: number;
    };
    unmatched: {
      livebench: string[];
      swe_bench_model_display: string[];
      terminal_bench: string[];
      artificial_analysis?: string[];
    };
  };
};

export type FreshnessData = {
  generated_at: string;
  sources: Record<string, { outcome: string; canary: string; fetched_at: string }>;
};

export function getScores(): ScoresData {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("../data/scores.json") as ScoresData;
}

export function getFreshness(): FreshnessData | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("../data/freshness.json") as FreshnessData;
  } catch {
    return null;
  }
}

/** SWE-bench summary per canonical model: best/median/latest resolved % among its systems. */
export function sweSummaryByCanonical(
  rows: SweRow[]
): Record<string, { n: number; best: number; median: number; latest: number | null }> {
  const byCanonical = new Map<string, SweRow[]>();
  for (const r of rows) {
    if (!r.canonical_id || r.resolved_pct == null) continue;
    const list = byCanonical.get(r.canonical_id) ?? [];
    list.push(r);
    byCanonical.set(r.canonical_id, list);
  }
  const out: Record<string, { n: number; best: number; median: number; latest: number | null }> = {};
  for (const [id, list] of byCanonical) {
    const pcts = list.map((r) => r.resolved_pct as number).sort((a, b) => a - b);
    const mid = Math.floor(pcts.length / 2);
    const median = pcts.length % 2 ? pcts[mid] : (pcts[mid - 1] + pcts[mid]) / 2;
    const dated = list
      .filter((r) => r.run_date)
      .sort((a, b) => (a.run_date! < b.run_date! ? 1 : -1));
    out[id] = {
      n: list.length,
      best: pcts[pcts.length - 1],
      median: Number(median.toFixed(1)),
      latest: dated[0]?.resolved_pct ?? null,
    };
  }
  return out;
}
