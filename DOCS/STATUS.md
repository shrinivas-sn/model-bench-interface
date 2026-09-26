# Project status

Single running log — update in place each session. Overflow moved verbatim to
`DOCS/WORK/archive.md` (26/09/2026 entry).

## Current state

- **MVP built and verified (26/09/2026); initial commit made on `main` — no remote yet.**
- Product: "Model Bench" — Next.js app ingesting LLM benchmark data via
  `@shrinivas-sn/adapter-ingestion`; normalized canonical store; playground for choosing
  the best model per work type.
- Ingestion: 4 declarative adapters (openrouter, swe-bench-verified, livebench-scores,
  livebench-cost) + fixtures; all verify at parse ratio 1.00 (threshold 0.8). Live ingest
  26/09: 458 catalog models, 180 SWE-bench systems, 1,449 LiveBench rows, 63 cost rows —
  all canaries OK.
- Normalization: alias registry (exact → suffix → date, honest method reporting),
  `build-data.mjs` → `data/scores.json`. Match rates: LiveBench 55/63, SWE-bench 51/180;
  unmatched names reported on `/quality`, never coerced.
- Playground: 4 static routes — head-to-head (`/`), matrix, SWE-bench, `/quality` — on
  Jev design tokens (terminal-dev / zinc-emerald / inter-jetbrains / snappy-utilitarian).
- Gate: 13/13 tests pass; `npm run build` clean (stale `.next` caused a transient
  `PageNotFoundError`; `rm -rf .next` fixed it).
- Fixed: `.gitignore` had wrongly excluded `store/` + `data/` (the cron commits exactly
  those); both now tracked, `runs/` + `next-env.d.ts` ignored.

## Pending

- Push to a GitHub remote so the daily
  cron (`.github/workflows/ingest.yml`, 02:30 UTC) can run and stores accumulate history.
- Manual alias table for SWE-bench systems (org/team display names) to lift 51/180.
- Investigate the 8 unmatched LiveBench names (list in `DOCS/WORK/archive.md`).
- Optional: price-performance scatter; labelled percentile composite view.

## Next up (start here)

1. Palette picker live locally (dialog desktop / sheet mobile, effort chips, recents, URL state). Next: Phase 3 page refresh + mobile-check.
2. Then: add a manual alias table for SWE-bench systems (org/team display names) to lift the
   51/180 match rate — matches must report method `manual` on `/quality`; remember the
   adapter-ingestion gotcha: editing an adapter `map` re-appends the whole source as
   `changed`.
