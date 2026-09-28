# Project status

Single running log — update in place each session. Overflow moved verbatim to
`DOCS/WORK/archive.md`.

**As of 28/09/2026.**

## Current state

- **Live at https://model-bench.shrinu.workers.dev** — the `shrinusn2001` host recorded on
  27/09 no longer resolves; `shrinu` is the account's actual workers.dev subdomain.
  Released 28/09 with the redesign; `/` and `/matrix` return 200, unknown paths 404.
- Project: `E:\model-bench` — Next.js 15 static export (`output: "export"`), no server, no DB.
- Ingestion: GitHub Actions cron at 02:30 UTC → 4 declarative adapters (`openrouter` with `reasoning` and `benchmarks`, `swe-bench-verified` with `reasoning_effort`, `livebench-scores`, `livebench-cost`) → `store/*.jsonl` → `data/scores.json`. 458 catalog models, 63 LiveBench rows, 180 SWE-bench systems.
- UI: Interactive reasoning effort switcher directly on Head-to-Head cards for instant 1-click effort switching (e.g. Claude Opus 5.5 Max vs X-High); three-stage picker with explicit effort stage for all models displaying provider API tiers and Artificial Analysis intelligence indices.
- Palette: five colours — graphite (surfaces/text), amber (accent + Model A), blue (Model B), green (healthy), red (error). Every price is USD per million tokens.
- Gates: `npm run verify:fixtures` 4/4 (1.00 ratio) · `npm test` 65/65 · `npx tsc --noEmit` clean · `npm run build` 7/7 static pages · `npm run verify:ui` 116/116 browser checks.

## Pending

- Workers Builds is still not connected in the Cloudflare dashboard, so the daily cron commit
  may not redeploy on its own — the 28/09 release was a manual `npm run deploy`.
- Manual alias table for SWE-bench systems: 51/180 matched.
- 8 unmatched LiveBench names (`inkling-xhigh`, `qwen3.8-max`, `smaug-agentic`, `smaug-mini`,
  `ox-alpha-max`, `qwen3.8-flash-next`, `smaug-flash`, `union-alpha`) — listed on `/quality`
  with the fix steps.

## Next up (start here)

1. Confirm the live URL behaves on a phone: three-stage picker, effort buttons for a
   multi-variant model, prices in `$/Mtok` (not `$0.00`), and the data-status strip.
2. Connect Workers Builds (Cloudflare → the Worker → Settings → Builds → Connect to Git; build
   `npm run build`, deploy `npx wrangler deploy`) so the cron redeploys by itself.
3. Build the manual alias table for SWE-bench systems in `normalization/registry.mjs` to lift
   the 51/180 match rate, then re-run `npm run build:data`.

## Verification limits

- `npm run verify:ui` measures Chrome only, at 320-1280px. Safari and Firefox were not run.
- Contrast and tap-target figures are browser-measured against `out/`; the live host was
  confirmed by markup and CSS-token check only, not re-measured.
