# Model Bench

Interactive playground for choosing the right LLM for the work — Claude, GPT, Gemini,
DeepSeek, Qwen and the rest of the frontier, compared across **LiveBench**,
**SWE-bench Verified**, and the **OpenRouter** catalog (pricing, context windows).

Data is ingested by [`@shrinivas-sn/adapter-ingestion`](https://www.npmjs.com/package/@shrinivas-sn/adapter-ingestion)
from JSON-only sources; every source has a declarative adapter, an append-only JSONL
store, and a canary that flags shape drift. No HTML scraping, no API keys, no LLM cost
in the pipeline.

## Views

| Route | What it answers |
|---|---|
| `/` (Head-to-Head) | Which of these two models is better for my capability mix — and at what price? |
| `/matrix` | Full model × capability matrix, sorted, with canonical-id provenance |
| `/swe-bench` | Which agent+model systems actually resolve real GitHub issues? |
| `/quality` | Can I trust this data? Freshness, canary status, alias-match methods, unmatched names |

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

Design tokens resolved by the Jev `ui-design-chain-gate` (terminal-dev /
zinc-emerald / inter-jetbrains / snappy-utilitarian) — see `design-tokens.json`.

## Commands

```bash
npm install
npm run verify:fixtures   # adapters must parse fixtures at ratio >= 0.8 before trust
npm run ingest            # live ingest all 4 sources -> store/*.jsonl
npm run build:data        # store/*.jsonl -> data/scores.json + data quality report
npm test                  # alias matcher unit tests (node --test)
npm run dev               # playground at localhost:3000
npm run build             # build:data + next build (static export -> out/)
npm run deploy            # build + deploy to Cloudflare Workers Static Assets
```

A daily GitHub Actions workflow (`.github/workflows/ingest.yml`) re-ingests at 02:30 UTC,
rebuilds `data/`, and commits — history accumulates in the JSONL stores for free.

## Honest-data rules

- **Per-benchmark comparison only.** LiveBench scores, SWE-bench resolve %, and Elo are
  never averaged into one number; capability axes aggregate within LiveBench only.
- **Alias matching never guesses.** Progressive exact → suffix-strip → date-strip forms;
  every match records its method; unmatched names are listed on `/quality`, never coerced.
- **Price `-1` on OpenRouter means unknown**, stored as null — never shown as $0 or "free".
- **Canary status is surfaced**, not swallowed: a stale source shows in the header badge
  and on `/quality`.

## Source provenance

| Source | Endpoint | Verified |
|---|---|---|
| OpenRouter | `https://openrouter.ai/api/v1/models` | live JSON, no auth |
| SWE-bench | `raw.githubusercontent.com/SWE-bench/swe-bench.github.io/master/data/leaderboards.json` | the exact file the official leaderboard site loads (see `swe-bench/experiments` `analysis/get_leaderboard.py`) |
| LiveBench | `livebench.ai/table_2026_06_25.csv` + `cost_…csv` | the exact files the official site loads (release list read from its bundle) |
