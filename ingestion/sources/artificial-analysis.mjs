/**
 * Artificial Analysis API source (v2 language models free endpoint).
 *
 * Official API documentation: https://artificialanalysis.ai/data-api/docs
 */

import { EFFORT_LEVELS } from "../../normalization/effort.mjs";

export const ADAPTER_URL = "https://artificialanalysis.ai/api/v2/language/models/free";
export const PAGE_URL = "https://artificialanalysis.ai/";
export const KEY_ENV = "ARTIFICIAL_ANALYSIS_API_KEY";

// Named levels AA writes as a suffix word ("(Max, …)", "(Minimal)").
const NAMED_EFFORTS = new Set(EFFORT_LEVELS.filter((e) => e !== "default" && e !== "none"));

/**
 * Split an Artificial Analysis model name into base name and reasoning effort.
 *   "Claude Opus 5.5 (max)"                    -> max
 *   "Claude Opus 5.5 (Max, Default Fallback)"  -> max   (first word is the level)
 *   "DeepSeek V4.1 Flash (Non-reasoning)"      -> none
 *   "Claude Sonnet 4.6 (Non-reasoning, Low)"   -> low
 *   "Gemma 4 31B (Reasoning)"                  -> default
 * Anything else in brackets (a date, a version) is part of the name: effort null.
 * Owner decisions 20/10/2026; the full AA name stays on the row and in the UI.
 *
 * @param {string} name
 * @returns {{ base: string, effort: string | null }}
 */
export function splitEffort(name) {
  if (!name || typeof name !== "string") return { base: "", effort: null };

  const match = name.match(/\s+\(([^)]+)\)$/);
  if (!match) return { base: name, effort: null };

  const words = match[1].split(",").map((w) => w.trim().toLowerCase());
  const named = words.find((w) => NAMED_EFFORTS.has(w)) ?? null;
  let effort = null;
  if (words.includes("non-reasoning")) effort = named ?? "none";
  else if (words.includes("reasoning")) effort = named ?? "default";
  else if (NAMED_EFFORTS.has(words[0])) effort = words[0];

  if (!effort) return { base: name, effort: null };
  return { base: name.slice(0, match.index).trim(), effort };
}

/**
 * Transform an API model object to a flat adapter item.
 *
 * @param {object} model
 * @returns {object}
 */
export function toItem(model) {
  return {
    source_id: model.id,
    page_url: PAGE_URL,
    name: model.name,
    slug: model.slug ?? null,
    creator: model.model_creator?.name ?? null,
    release_date: model.release_date ?? null,
    intelligence_index: model.evaluations?.artificial_analysis_intelligence_index ?? null,
    coding_index: model.evaluations?.artificial_analysis_coding_index ?? null,
    agentic_index: model.evaluations?.artificial_analysis_agentic_index ?? null,
    price_in: model.pricing?.price_1m_input_tokens ?? null,
    price_out: model.pricing?.price_1m_output_tokens ?? null,
    output_tps: model.performance?.median_output_tokens_per_second ?? null,
    ttft_s: model.performance?.median_time_to_first_token_seconds ?? null,
  };
}

/**
 * Create fetch implementation paginating through the Artificial Analysis API.
 *
 * @param {string} apiKey
 * @returns {Function}
 */
export function makeFetchImpl(apiKey) {
  return async (url, opts = {}) => {
    let page = 1;
    const allItems = [];

    while (page <= 20) {
      const pageUrl = new URL(url);
      pageUrl.searchParams.set("page", String(page));

      const res = await (opts.fetch || fetch)(pageUrl.toString(), {
        ...opts,
        headers: {
          ...opts.headers,
          "x-api-key": apiKey,
          Accept: "application/json",
          "User-Agent": "model-bench-ingest",
        },
      });

      if (!res.ok) return res;

      const data = await res.json();
      const records = data.data || [];
      for (const rec of records) {
        allItems.push(toItem(rec));
      }

      if (!data.pagination?.has_more) {
        break;
      }
      page++;
    }

    return new Response(JSON.stringify(allItems), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
}
