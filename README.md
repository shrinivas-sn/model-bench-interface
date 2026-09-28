# Model Bench

Interactive playground for choosing the right LLM for the work — Claude, GPT, Gemini,
DeepSeek, Qwen and the rest of the frontier, compared across **LiveBench**,
**SWE-bench Verified**, and the **OpenRouter** catalog (pricing, context windows).

Data is ingested by [`@shrinivas-sn/adapter-ingestion`](https://www.npmjs.com/package/@shrinivas-sn/adapter-ingestion)
from JSON-only sources; every source has a declarative adapter, an append-only JSONL
store, and a canary that flags shape drift. No HTML scraping, no API keys, no LLM cost
in the pipeline.

## Views

| Nav label | Route | What it answers |
|---|---|---|
| Compare | `/` | Which of these two models is better for my capability mix — and at what price? |
| All models | `/matrix` | Every score in one filterable table, with canonical-id provenance |
| Agent runs | `/swe-bench` | Which agent+model systems actually resolve real GitHub issues? |
| Data health | `/quality` | Can I trust this data? Freshness, canary status, alias-match methods, unmatched names |

The compare view picks a model in three steps — company, then model, then reasoning effort —
and leads with your recent picks so the same pair never has to be searched twice.

## Architecture

```
ingestion/
  adapters/*.adapter.json   declarative adapters (one per store)
  sources/*.mjs             fetchImpl transforms (CSV->JSON unpivot, board pick)
  fixtures/                 live-captured samples; verifyAgainstFixtures gates trust
  run-all.mjs               runIngest per adapter -> store/*.jsonl + data/freshness.json
normalization/
  registry.mjs              canonical model IDs + progressive alias matcher
  categories.mjs            LiveBench task -> category -> capability axes
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
npm run ingest            # live ingest all 4 sources -> store/*.jsonl
npm run build:data        # store/*.jsonl -> data/scores.json + data quality report
npm test                  # alias matcher, picker and status unit tests (node --test)
npm run verify:ui         # serve out/ and verify layout, contrast and the picker flow in Chrome
npm run dev               # playground at localhost:3000
npm run build             # build:data + next build (static export -> out/)
npm run deploy            # build + deploy to Cloudflare Workers Static Assets
```

**Live Deployment:** [https://model-bench.shrinu.workers.dev](https://model-bench.shrinu.workers.dev)

A daily GitHub Actions workflow (`.github/workflows/ingest.yml`) re-ingests at 02:30 UTC,
rebuilds `data/`, and commits — history accumulates in the JSONL stores for free.

## Honest-data rules

- **Per-benchmark comparison only.** LiveBench scores, SWE-bench resolve %, and Elo are
  never averaged into one number; capability axes aggregate within LiveBench only.
- **Alias matching never guesses.** Progressive exact → suffix-strip → date-strip forms;
  every match records its method; unmatched names are listed on `/quality`, never coerced.
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
| SWE-bench | `raw.githubusercontent.com/SWE-bench/swe-bench.github.io/master/data/leaderboards.json` | the exact file the official leaderboard site loads (see `swe-bench/experiments` `analysis/get_leaderboard.py`) |
| LiveBench | `livebench.ai/table_2026_06_25.csv` + `cost_…csv` | the exact files the official site loads (release list read from its bundle) |
