# WORK archive

Overflow from STATUS.md, moved verbatim at trim time.

## 26/09/2026 — from STATUS.md

### Superseded state (morning)

- Project created 26/09/2026 after a brainstorm. **No code exists yet.**
- Decisions locked (see `CONTEXT/DECISIONS.md`): Next.js; JSON-first sources — OpenRouter
  `/api/v1/models` (model registry backbone + pricing), SWE-bench `experiments` repo,
  LiveBench repo data; head-to-head compare is the core playground view; GitHub Actions
  cron for freshness.
- Jev design layer verdict: **adopt** `ui-design-chain-gate.js` + the 196-pick design
  catalog as the design-token authority — run at scaffold time with domain
  `ai-benchmark-analytics`, audience `developers`; **skip** `scaffold-frontend.js`
  wholesale generation; optional later: `slop-prelint-gate.js`.

### Verification detail (evening)

- Gate results: `npm test` 13/13 pass; `npm run verify:fixtures` → openrouter 6/6,
  swe-bench-verified 4/4, livebench-scores 60/60, livebench-cost 6/6 — all ratio 1.00
  (threshold 0.8). `npm run build` clean after clearing a stale `.next` cache
  (`PageNotFoundError` on page-data collection; `rm -rf .next` resolved it).
- Live ingest 26/09: openrouter 458 models, swe-bench-verified 180 systems,
  livebench-scores 1,449 rows, livebench-cost 63 rows — every canary OK
  (`data/freshness.json`).
- Match rates at build: LiveBench 55/63 matched, SWE-bench 51/180 matched.
  Unmatched LiveBench names: `inkling-xhigh`, `qwen3.8-max`, `smaug-agentic`,
  `smaug-mini`, `ox-alpha-max`, `qwen3.8-flash-next`, `smaug-flash`, `union-alpha`.
- Bug fixed: `.gitignore` excluded `store/` and `data/` while the ingest cron commits
  exactly those (`git add store/ data/` would fail on CI). Both now tracked; `runs/`
  and (restored) `next-env.d.ts` stay ignored.

## 27/09/2026 — superseded STATUS.md (UI redesign + deploy session)

Moved verbatim when STATUS.md was trimmed on 28/09/2026.

### Current state (as recorded 27/09)

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

### Pending (as recorded 27/09)

- Manual alias table for SWE-bench systems (org/team display names) to lift 51/180 match rate.
- Investigate 8 unmatched LiveBench names on `/quality`.

### Next up (as recorded 27/09)

1. Connect Workers Builds in the Cloudflare dashboard (Settings -> Builds -> Connect to Git) if not already active.
2. Build manual alias table for SWE-bench systems on /quality to improve the 51/180 match rate.

### Correction recorded 28/09/2026

The "Live at https://model-bench.shrinusn2001.workers.dev" line above was wrong. That host
no longer resolves (curl returns 000 on `/`, `/matrix` and `/nope`). The account's actual
workers.dev subdomain is `shrinu`, confirmed by a `npm run deploy` that printed
`https://model-bench.shrinu.workers.dev` and by curl returning 200/200/404 on the three
checks. Any doc or bookmark pointing at `shrinusn2001` should be updated.
