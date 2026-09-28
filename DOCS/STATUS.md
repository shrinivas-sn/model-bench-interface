# Project status

**As of 28/09/2026.**

## Current state
- **Live at https://model-bench.shrinu.workers.dev** (Next.js 15 static export on Cloudflare Workers).
- **Ingestion**: 4 declarative adapters (`openrouter` reasoning/benchmarks, `swe-bench-verified` reasoning effort, `livebench-scores`, `livebench-cost`) → 458 catalog models, 63 LiveBench rows.
- **UI**: Interactive effort button panel on comparison cards, dynamic effort-resolved model engine (`LOW`, `MEDIUM`, `HIGH`, `XHIGH`, `MAX`), dynamic card-level `$/Question` & reasoning token metrics, and real-time Effort-Dynamic Cost & Workload Estimator.
- **Gates**: `verify:fixtures` 4/4 · `npm test` 73/73 · `tsc` clean · `npm run build` 7/7 static pages · `verify:ui` 116/116 checks.

## Pending
- Manual alias table for SWE-bench systems (51/180 matched) & 8 unmatched LiveBench names on `/quality`.
- Cloudflare Workers Builds webhook verification for automatic cron sync redeployments.

## Next up (start here)
1. **SWE-bench & LiveBench Aliases**: Add manual mappings in `normalization/registry.mjs` to lift the 51/180 match rate and resolve unmatched names.
2. **Cloudflare Builds**: Verify auto-deploy webhook on GitHub commits for daily cron sync.
