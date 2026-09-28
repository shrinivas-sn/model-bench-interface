# Project status

**As of 28/09/2026.**

## Current state
- **Live at https://model-bench.shrinu.workers.dev** (Next.js 15 static export on Cloudflare Workers).
- **Ingestion**: 4 declarative adapters (`openrouter` reasoning/benchmarks, `swe-bench-verified` reasoning effort, `livebench-scores`, `livebench-cost`) → 458 catalog models, 63 LiveBench rows.
- **UI**: Interactive effort button panel on comparison cards (1-click toggle for evaluated tiers like Claude Opus 5.5 Max/X-High & provider tiers), 3-stage picker, 5-colour palette.
- **Gates**: `verify:fixtures` 4/4 · `npm test` 65/65 · `tsc` clean · `npm run build` 7/7 static pages · `verify:ui` 116/116 checks.

## Pending
- Dynamic per-effort real-time cost calculator: expose `cost_per_question` and token multipliers per effort tier side-by-side with capability scores.
- Manual alias table for SWE-bench systems (51/180 matched) & 8 unmatched LiveBench names on `/quality`.

## Next up (start here)
1. **Effort-Dynamic Cost Estimator**: Expose `cost_per_question` & token volume multipliers per reasoning tier in Head-to-Head comparison cards.
2. **SWE-bench & LiveBench Aliases**: Add manual mappings in `normalization/registry.mjs` to lift the 51/180 match rate and resolve unmatched names.
3. **Cloudflare Builds**: Verify auto-deploy webhook on GitHub commits for daily cron sync.
