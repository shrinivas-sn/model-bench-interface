# Project status

**As of 30/09/2026.**

## Current state
- **Live at https://model-bench.shrinu.workers.dev** (Next.js 15 static export on Cloudflare Workers). Check the real URL in `npm run deploy` output; the archived 26/09 plan logged `model-bench.shrinusn2001.workers.dev`.
- **Sources**: LiveBench 2026-06-25, Terminal-Bench Terminal-Bench 4.0 (official), Artificial Analysis waiting on API key, OpenRouter prices. Old BenchLM 2.0 snapshot removed.
- **UI**: Compare page shows LiveBench, Terminal-Bench 4.0 and no AA block until key from publishers only; estimator, radar and effort-scaling deleted.
- **Phase 1, 2, 3 & 4 complete (30/09/2026)**: Honest data layer; official sources; compare page rebuilt on real published numbers; SWE-bench retired; copy rewritten to plain language; slop scan clean.
- **Gates**: `npm test` 91/91 · `npm run build` static export clean · `npm run verify:fixtures` 5/5 PASS · `npx tsc --noEmit` 0 errors.

## Pending
- **`PLAN.md` Phase 5**: Browser verification with `probe/verify-ui.mjs`, publish/deploy confirmation, close plan.
- Owner inputs for the plan: O1 Artificial Analysis API key (optional), O2 wrangler login if needed, O3 connect Cloudflare Workers Builds (carried from 26/09), O4 confirm push + deploy.
- Cloudflare Workers Builds is not connected, so the daily data commit does not reach the live site (O3).

## Next up (start here)
1. **Execute `PLAN.md` Phase 5 (Task 5.1).**

