# Project status

**As of 30/09/2026.**

## Current state
- **Live at https://model-bench.shrinu.workers.dev** (Next.js 15 static export on Cloudflare Workers). Check the real URL in `npm run deploy` output; the archived 26/09 plan logged `model-bench.shrinusn2001.workers.dev`.
- **Ingestion**: 4 declarative adapters (`openrouter`, `swe-bench-verified`, `livebench-scores`, `livebench-cost`) plus a hand-copied Terminal-Bench 2.0 snapshot from BenchLM (`store/terminal-bench-2.jsonl`).
- **UI**: compare page with command-palette picker, effort dropdown, capability bars, radar, cost estimator; the collapsed benchmarks panel was removed on 28/09 (`7781ed4`), with Terminal-Bench 2.0 shown as one row.
- **Phase 1 complete (30/09/2026)**: Effort lists only as published; LiveBench overall/categories computed as livebench.ai does (PLAN.md Phase 1 done 30/09/2026).
- **Gates**: `npm test` 83/83 · `npm run build` 5 static routes · `npm run verify:fixtures` 4/4 PASS · `npm run verify:ui` 115/115.

## Pending
- **`PLAN.md` Phase 2 in progress**: published numbers only (LiveBench newest release, official Terminal-Bench 4.0, Artificial Analysis API), estimates deleted, SWE-bench retired, plain copy, slop scan.
- Owner inputs for the plan: O1 Artificial Analysis API key (optional), O2 wrangler login if needed, O3 connect Cloudflare Workers Builds (carried from 26/09), O4 confirm push + deploy.
- Cloudflare Workers Builds is not connected, so the daily data commit does not reach the live site (O3).

## Next up (start here)
1. **Execute `PLAN.md` Phase 2 (Task 2.1).**
2. Before Phase 2 (optional): provide the Artificial Analysis key (O1).
