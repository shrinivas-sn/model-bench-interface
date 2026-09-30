# Project status

**As of 30/09/2026.**

## Current state
- **Live at https://model-bench.shrinu.workers.dev** (Next.js 15 static export on Cloudflare Workers, deployed and verified).
- **Sources**: LiveBench 2026-06-25, Terminal-Bench 4.0 (official), Artificial Analysis waiting on API key, OpenRouter prices. Old BenchLM 2.0 snapshot and stale SWE-bench Verified removed.
- **UI**: Compare page shows LiveBench, Terminal-Bench 4.0 and Artificial Analysis (key-gated) with direct links to publishers.
- **Published-numbers upgrade complete (30/09/2026)**: All 5 phases executed, committed, pushed to `main`, and deployed.
- **Gates**: `npm test` 91/91 · `npm run build` static export clean · `npm run verify:fixtures` 5/5 PASS · `npx tsc --noEmit` 0 errors · `npm run verify:ui` 96/96 PASS.

## Pending
- **Owner inputs**:
  - O1: Artificial Analysis API key (optional) in environment and GitHub Actions secrets (`ARTIFICIAL_ANALYSIS_API_KEY`).
  - O3: Connect Cloudflare Workers Builds to GitHub repo (Cloudflare dashboard → Workers & Pages → `model-bench` → Settings → Builds; build command `npm run build`, deploy command `npx wrangler deploy`) so daily cron commits automatically redeploy.

## Next up (start here)
1. Build interactive **effort progression curve / scaling chart** across models comparing all tested reasoning effort tiers (`none`, `low`, `medium`, `high`, `max`).
2. Review unmatched model names on `/quality` if new frontier models appear on LiveBench or Terminal-Bench.
