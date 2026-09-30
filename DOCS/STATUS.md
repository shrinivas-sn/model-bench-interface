# Project status

**As of 30/09/2026.**

## Current state
- **Live at https://model-bench.shrinu.workers.dev** (Next.js 15 static export on Cloudflare Workers). Check the real URL in `npm run deploy` output; the archived 26/09 plan logged `model-bench.shrinusn2001.workers.dev`.
- **Sources**: LiveBench 2026-06-25, Terminal-Bench Terminal-Bench 4.0 (official), Artificial Analysis waiting on API key, OpenRouter prices. Old BenchLM 2.0 snapshot removed.
- **UI**: compare page with command-palette picker, effort dropdown, capability bars, radar, cost estimator; the collapsed benchmarks panel was removed on 28/09 (`7781ed4`), with Terminal-Bench 4.0 official runs mapped.
- **Phase 1 & Phase 2 complete (30/09/2026)**: Effort lists only as published; LiveBench overall/categories computed as livebench.ai does; official Terminal-Bench 4.0 source and manual aliases; key-gated Artificial Analysis source; automatic LiveBench latest release discovery.
- **Gates**: `npm test` 98/98 · `npm run build` 5 static routes · `npm run verify:fixtures` 6/6 PASS · `npm run verify:ui` 115/115.

## Pending
- **`PLAN.md` Phase 3 in progress**: Compare page on real data only (Tie runs to variant, rebuild compare page without estimates/radar/cost estimator, update defaultPair).
- Owner inputs for the plan: O1 Artificial Analysis API key (optional), O2 wrangler login if needed, O3 connect Cloudflare Workers Builds (carried from 26/09), O4 confirm push + deploy.
- Cloudflare Workers Builds is not connected, so the daily data commit does not reach the live site (O3).

## Next up (start here)
1. **Execute `PLAN.md` Phase 3 (Task 3.1).**
2. Before Phase 3 (optional): provide the Artificial Analysis key (O1).
