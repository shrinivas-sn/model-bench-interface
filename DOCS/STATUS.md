# Project status

**As of 30/09/2026.**

## Current state
- **Live at https://model-bench.shrinu.workers.dev** (Next.js 15 static export on Cloudflare Workers). Check the real URL in `npm run deploy` output; the archived 26/09 plan logged `model-bench.shrinusn2001.workers.dev`.
- **Sources**: LiveBench 2026-06-25, Terminal-Bench Terminal-Bench 4.0 (official), Artificial Analysis waiting on API key, OpenRouter prices. Old BenchLM 2.0 snapshot removed.
- **UI**: Compare page shows LiveBench, Terminal-Bench 4.0 and no AA block until key from publishers only; estimator, radar and effort-scaling deleted.
- **Phase 1, 2 & 3 complete (30/09/2026)**: Honest data layer; official sources (Terminal-Bench 4.0, Artificial Analysis API, LiveBench release auto-discovery); compare page rebuilt on real published numbers with pure `runsForVariant` helper and updated defaultPair.
- **Gates**: `npm test` 91/91 · `npm run build` 5 static routes · `npm run verify:fixtures` 6/6 PASS.

## Pending
- **`PLAN.md` Phase 4 in progress**: Retire stale sources (SWE-bench), plain copy everywhere, slop scan pass.
- Owner inputs for the plan: O1 Artificial Analysis API key (optional), O2 wrangler login if needed, O3 connect Cloudflare Workers Builds (carried from 26/09), O4 confirm push + deploy.
- Cloudflare Workers Builds is not connected, so the daily data commit does not reach the live site (O3).

## Next up (start here)
1. **Execute `PLAN.md` Phase 4 (Task 4.1).**
2. Before Phase 4 (optional): provide the Artificial Analysis key (O1).
