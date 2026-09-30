# Project status

**As of 30/09/2026.**

## Current state
- **Live at https://model-bench.shrinu.workers.dev** (Next.js 15 static export on Cloudflare Workers). Check the real URL in `npm run deploy` output; the archived 26/09 plan logged `model-bench.shrinusn2001.workers.dev`.
- **Ingestion**: 4 declarative adapters (`openrouter`, `swe-bench-verified`, `livebench-scores`, `livebench-cost`) plus a hand-copied Terminal-Bench 2.0 snapshot from BenchLM (`store/terminal-bench-2.jsonl`).
- **UI**: compare page with command-palette picker, effort dropdown, capability bars, radar, cost estimator; the collapsed benchmarks panel was removed on 28/09 (`7781ed4`), with Terminal-Bench 2.0 shown as one row.
- **Known problem (to be fixed by `PLAN.md`)**: the page shows estimated numbers. It scales scores for effort levels LiveBench never tested, fills in token counts, and credits a "derived composite" to Artificial Analysis. SWE-bench Verified's official board stopped updating on 26/02/2026, and the Terminal-Bench numbers are a third-party copy of an old version.
- **Gates (30/09/2026 baseline)**: `npm test` 76/76 · `npm run build` 5 static routes · `npm run verify:ui` 115/115.

## Pending
- **`PLAN.md` written 30/09/2026, not started**: published numbers only (LiveBench newest release, official Terminal-Bench 4.0, Artificial Analysis API), estimates deleted, SWE-bench retired, plain copy, slop scan.
- Owner inputs for the plan: O1 Artificial Analysis API key (optional), O2 wrangler login if needed, O3 connect Cloudflare Workers Builds (carried from 26/09), O4 confirm push + deploy.
- Cloudflare Workers Builds is not connected, so the daily data commit does not reach the live site (O3).

## Next up (start here)
1. **Execute `PLAN.md` from Phase 1, Task 1.1.** Read its "Read this first" section before starting.
2. Before Phase 2 (optional): provide the Artificial Analysis key (O1).
