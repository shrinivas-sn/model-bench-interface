<!-- docs-structure: v1 -->
# DOCS index

| Date | Summary | Status | Load-bearing | Touches | Continues |
|---|---|---|---|---|---|
| 26/09/2026 | Project brainstormed and initialized on E: drive. Decisions locked: Next.js web app; JSON-first sources (OpenRouter catalog, SWE-bench, LiveBench) via `@shrinivas-sn/adapter-ingestion`; head-to-head compare as the core playground view; GitHub Actions cron for data freshness; per-benchmark comparison, never naive score averaging; model registry keyed on OpenRouter IDs. Jev design layer analyzed — final verdict recorded: adopt `ui-design-chain-gate` + 196-pick catalog as design-token authority, skip `scaffold-frontend.js` wholesale generation. MVP built and verified same day (4 adapters ratio 1.00, 13/13 tests, clean static build); initial commit pending | active | yes | `DOCS/`, `DOCS/CONTEXT/DECISIONS.md`, `DOCS/WORK/2026-09-26/` | — |
| 26/09/2026 | UI redesign planned: `PLAN.md` — command-palette picker grouped by company with reasoning-effort chips (effort parsed from LiveBench names, explicit forms only), head-to-head refresh, mobile-check gate, static export to Cloudflare Workers Static Assets (no server/DB). Cloudflare Claude Code plugin installed | active | yes | `PLAN.md`, `components/`, `normalization/`, `next.config.mjs` | — |

**Status:** `active` · `done` · `superseded` · `abandoned`

**Load-bearing:** `yes` when the session still constrains product or architecture.
