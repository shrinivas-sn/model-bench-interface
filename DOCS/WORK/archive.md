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
