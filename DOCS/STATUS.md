# Project status

**As of 17/10/2026.**

## Current state
- **Live at https://model-bench.shrinu.workers.dev** (Next.js 15 static export on Cloudflare Workers).
- **Reasoning Effort Switcher & Terminal-Bench 4.0 upgrade complete (17/10/2026)**:
  - Shipped interactive inline reasoning effort switcher directly within model cards on the Head-to-Head Compare page (`components/HeadToHead.tsx`).
  - Added discrete effort tier selection (`none`, `low`, `medium`, `high`, `max`) with variant resolution and fallback.
  - Added Terminal-Bench 4.0 stat line alongside LiveBench reasoning/coding bars.
  - Normalized LiveBench 2026-09-02 release category schema mappings.
- **Gates**: `npm test` 97/97 PASS · `npm run build` static export clean (0 errors) · `npm run verify:fixtures` 5/5 PASS · `npx tsc --noEmit` 0 errors.

## Pending
- **Owner inputs**:
  - O1: Artificial Analysis API key in environment / GitHub Actions secrets (`ARTIFICIAL_ANALYSIS_API_KEY`).
  - O3: Connect Cloudflare Workers Builds to GitHub repo so daily cron commits automatically redeploy.

## Next up (start here)
1. Add effort-progression delta visualizer showing percentage jump between effort tiers for same base model.
2. Review remaining unmatched model names on `/quality` if new frontier models appear on LiveBench or Terminal-Bench.
