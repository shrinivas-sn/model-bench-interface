# Project status

**As of 30/09/2026.**

## Current state
- **Live at https://model-bench.shrinu.workers.dev** (Next.js 15 static export on Cloudflare Workers). Check the real URL in `npm run deploy` output; the archived 26/09 plan logged `model-bench.shrinusn2001.workers.dev`.
- **Sources**: LiveBench 2026-06-25, Terminal-Bench 4.0 (official), Artificial Analysis waiting on API key, OpenRouter prices. Old BenchLM 2.0 snapshot and stale SWE-bench Verified removed.
- **UI**: Compare page shows LiveBench, Terminal-Bench 4.0 and Artificial Analysis (key-gated) with direct links to publishers; estimator, radar and effort-scaling deleted.
- **Published-numbers upgrade complete (30/09/2026)**: All 5 phases executed and verified.
- **Gates**: `npm test` 91/91 · `npm run build` static export clean · `npm run verify:fixtures` 5/5 PASS · `npx tsc --noEmit` 0 errors · `npm run verify:ui` 96/96 PASS.

## Pending
- **Owner inputs**:
  - O1: Artificial Analysis API key (optional) in environment and GitHub Actions secrets (`ARTIFICIAL_ANALYSIS_API_KEY`).
  - O2: Wrangler login for manual CLI deploy if needed (`npx wrangler login`).
  - O3: Connect Cloudflare Workers Builds to GitHub repo (Cloudflare dashboard → Workers & Pages → `model-bench` → Settings → Builds; build command `npm run build`, deploy command `npx wrangler deploy`) so daily cron commits automatically redeploy.
  - O4: Push `main` to origin (`git push origin main`) and deploy to Cloudflare (`npm run deploy`).

## Next up (start here)
1. Owner review: confirm push and deploy to Cloudflare (O4).
2. Review unmatched model names on `/quality` if new frontier models appear on LiveBench or Terminal-Bench.
