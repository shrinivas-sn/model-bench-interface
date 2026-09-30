# Model Bench

Side-by-side comparison for choosing the right LLM — Claude, GPT, Gemini, DeepSeek, Qwen and the rest of the frontier, compared on **LiveBench** (newest release, auto-detected), **Terminal-Bench** (official leaderboard, tbench.ai), **Artificial Analysis** (official API, requires `ARTIFICIAL_ANALYSIS_API_KEY`), and the **OpenRouter** catalog (pricing, context length).

Every score and metric on Model Bench is published directly by the benchmark or API that evaluated it — nothing is estimated, simulated, or scaled.

Data is ingested by [`@shrinivas-sn/adapter-ingestion`](https://www.npmjs.com/package/@shrinivas-sn/adapter-ingestion)
from structured sources; every source has a declarative adapter, an append-only JSONL
store, and a canary that flags shape drift.

## Views

| Nav label | Route | What it answers |
|---|---|---|
| Compare | `/` | Side-by-side comparison across LiveBench, Terminal-Bench, and Artificial Analysis with pricing |
| All models | `/matrix` | Every model LiveBench has tested in its latest release |
| Data health | `/quality` | Which sources were fetched, when, and unmatched model names |

The compare view picks a model in three steps — company, then model, then reasoning effort —
and leads with your recent picks so the same pair never has to be searched twice.

## Architecture

```
ingestion/
  adapters/*.adapter.json   declarative adapters (one per store)
  sources/*.mjs             fetchImpl transforms (CSV->JSON unpivot, board pick, flight decode)
  fixtures/                 live-captured samples; verifyAgainstFixtures gates trust
  run-all.mjs               runIngest per adapter -> store/*.jsonl + data/freshness.json
normalization/
  registry.mjs              canonical model IDs + progressive alias matcher
  manual-aliases.json       reviewed vendor-specific alias table
  livebench-scores.mjs      official LiveBench category & overall score formulas
  build-data.mjs            store/*.jsonl -> data/scores.json (app-imported)
app/ + components/          Next.js 15 / React 19 playground (Jev design tokens)
```

Design tokens: the Jev `ui-design-chain-gate` resolved archetype/typography/motion, and the
palette was overridden by the owner to a five-colour graphite + amber set — see
`design-tokens.json` and `DOCS/CONTEXT/DECISIONS.md`. Colour never carries decoration: amber
is the accent and Model A, blue is Model B, green is healthy, red is error. Reasoning effort is
ordinal, so its chips are one amber ramp rather than five different hues.

## Commands

```bash
npm install
npm run verify:fixtures   # adapters must parse fixtures at ratio >= 0.8 before trust
npm run ingest            # live ingest sources -> store/*.jsonl
npm run build:data        # store/*.jsonl -> data/scores.json + data quality report
npm test                  # unit tests (node --test)
npm run verify:ui         # serve out/ and verify layout, contrast and the picker flow in Chrome
npm run dev               # playground at localhost:3000
npm run build             # build:data + next build (static export -> out/)
npm run deploy            # build + deploy to Cloudflare Workers Static Assets
```

**Live Deployment:** [https://model-bench.shrinu.workers.dev](https://model-bench.shrinu.workers.dev)

A daily GitHub Actions workflow (`.github/workflows/ingest.yml`) re-ingests at 02:30 UTC,
rebuilds `data/`, and commits — history accumulates in the JSONL stores for free.

## Honest-data rules

- **Per-benchmark comparison only.** LiveBench scores, Terminal-Bench resolve rates, and Artificial Analysis quality indices are never averaged across benchmarks.
- **Published numbers only.** No synthetic scaling, no simulated effort tiers, no derived workload estimates. If a benchmark has not tested an effort level, it is not shown.
- **Alias matching never guesses.** Progressive exact → suffix-strip → date-strip forms; reviewed manual aliases in `manual-aliases.json`; unmatched names are listed on `/quality`, never coerced.
- **Price `-1` on OpenRouter means unknown**, stored as null — never shown as $0 or "free".
- **Every price is normalised to USD per million tokens before it leaves `build-data.mjs`.**
  OpenRouter's API reports dollars per *token* while LiveBench's cost CSV reports per *million*;
  emitting either raw produced `$0.00/M` everywhere. The app only reads
  `pricing.input_per_million` / `pricing.output_per_million`.
- **Canary status is surfaced**, not swallowed: a stale source shows in the header badge
  and on `/quality`.

## Source provenance

| Source | Endpoint | Verified |
|---|---|---|
| OpenRouter | `https://openrouter.ai/api/v1/models` | live JSON, no auth |
| LiveBench | `livebench.ai/table_<release>.csv` + `cost_<release>.csv` | official release files auto-discovered from livebench.ai |
| Terminal-Bench | `tbench.ai/leaderboard` | official leaderboard RSC flight payload |
| Artificial Analysis | `https://artificialanalysis.ai/api/v2/data/llms/models` | official API (requires key) |
