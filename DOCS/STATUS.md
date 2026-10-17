# Project status

**As of 17/10/2026.**

## Current state
- **Live at https://model-bench.shrinu.workers.dev** (Next.js 15 static export on Cloudflare Workers).
- **Reasoning-effort bug fixed, measured-only (17/10/2026, uncommitted)**:
  - Root cause: `getAvailableEfforts` unioned OpenRouter `supported_efforts` (API configurability flag) with measured runs — every model got low→max buttons, but LiveBench 2026-09-02 has one row per model (verified live CSV: 48 bare names, `effort: null`), so low→max left all numbers pinned; single-run Terminal-Bench models blanked to `—`.
  - Fix (logic only, no UI change): efforts offered only when a benchmark row actually tested them — LiveBench sibling variants, Terminal-Bench `reasoning_effort`, or Artificial Analysis `effort`. Only 3 models have multi-effort TB runs (gpt-6-astra 58.18→50.61, claude-fable-5.1 57.88→43.33, claude-opus-5 5 levels); rest show their single published run.
  - Touched: `lib/picker.mjs`, `components/HeadToHead.tsx` (7 call sites), `normalization/test/picker-stages.test.mjs`.
- **Gates**: `npm test` 97/97 PASS · `npm run verify:fixtures` 5/5 PASS · `npx tsc --noEmit` 0 errors (`npm run build` not run — timed out at 30s).

## Pending
- **Owner inputs**:
  - O1: Artificial Analysis API key in environment / GitHub Actions secrets (`ARTIFICIAL_ANALYSIS_API_KEY`).
  - O3: Connect Cloudflare Workers Builds to GitHub repo so daily cron commits automatically redeploy.

## Next up (start here)
1. Add effort-progression delta visualizer showing percentage jump between effort tiers for same base model.
2. Review remaining unmatched model names on `/quality` if new frontier models appear on LiveBench or Terminal-Bench.
