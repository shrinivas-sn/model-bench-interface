# Project status

**As of 28/09/2026.**

## Current state
- **Live at https://model-bench.shrinu.workers.dev** (Next.js 15 static export on Cloudflare Workers).
- **Ingestion & Aliasing**: 4 declarative adapters (`openrouter`, `swe-bench-verified`, `livebench-scores`, `livebench-cost`) → 458 catalog models, 63 LiveBench rows, 72 matched SWE-bench Verified runs.
- **UI**: Clean one-liner reasoning effort dropdown, real-time Workload & Cost Estimator. The benchmarks panel was collapsed (28/09, owner feedback: information overload) into one `<details>` line expanding to a compact A/B/Δ table.
- **Gates**: `verify:fixtures` 4/4 · `npm test` 76/76 · `tsc` clean · `npm run build` 7/7 static pages · `verify:ui` 115/115 checks.

## Pending
- Cloudflare Workers Builds webhook verification for automatic cron sync redeployments.

## Next up (start here)
1. **Re-run full gates after the collapse**: `npm test` and `npm run verify:ui` against the new collapsed benchmarks section.
2. **Live Deployment Verification**: Confirm static export and build assets deployed on Cloudflare Workers.
3. **Additional Developer Benchmarks**: Monitor upstream SWE-bench Verified and Artificial Analysis feeds for new model evaluations.
