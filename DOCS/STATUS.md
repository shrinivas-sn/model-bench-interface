# Project status

Single running log — update in place each session. Overflow moved verbatim to
`DOCS/WORK/archive.md`.

## Current state

- **Live at https://model-bench.shrinusn2001.workers.dev and synced with GitHub `origin/main`.**
- Product: "Model Bench" — Next.js static edge app comparing frontier LLMs (Claude, GPT, Gemini, etc.)
  across LiveBench, SWE-bench Verified, and OpenRouter pricing/context.
- Ingestion: GitHub Actions daily cron (.github/workflows/ingest.yml) refreshes at 02:30 UTC.
  4 declarative adapters; verified parse ratio 1.00; stores accumulate history in git.
- Normalization: pure effort parser (explicit forms only, bare -max null); alias matcher;
  scores.json emitted at build time.
- UI: Command palette picker (cmdk + vaul), company grouping, effort chips, recents,
  shareable URL params (?a=...&b=...), model comparison cards, paired capability bars, radar chart.
- Quality Gates: `npm test` 28/28 pass; `MOBILE.md` 0 failing checks across 4 routes x 4 viewports;
  `npm run build` static export clean (7/7 pages generated); all live endpoints verify 200 (unknown 404).

## Pending

- Manual alias table for SWE-bench systems (org/team display names) to lift 51/180 match rate.
- Investigate 8 unmatched LiveBench names on `/quality`.

## Next up (start here)

1. Connect Workers Builds in Cloudflare dashboard (Settings -> Builds -> Connect to Git) if not already active.
2. Build manual alias table for SWE-bench systems on /quality to improve the 51/180 match rate.
