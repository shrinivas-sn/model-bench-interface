# Project status

Single running log — update in place each session. Overflow moved verbatim to
`DOCS/WORK/archive.md`.

**As of 28/09/2026.**

## Current state

- **Live at https://model-bench.shrinu.workers.dev** — the `shrinusn2001` host recorded on
  27/09 no longer resolves; `shrinu` is the account's actual workers.dev subdomain.
  Released 28/09 with the redesign; `/` and `/matrix` return 200, unknown paths 404.
- Project: `E:\model-bench` — Next.js 15 static export (`output: "export"`), no server, no DB.
- Ingestion: GitHub Actions cron at 02:30 UTC → 4 declarative adapters → `store/*.jsonl` →
  `data/scores.json`. 458 catalog models, 63 LiveBench rows, 180 SWE-bench systems.
- UI: three-stage picker (company → model → reasoning effort), recent picks leading the default
  A/B pair, app-owned AND-token search, A/B identity by colour plus a named legend, and a
  data-status strip with last-ingest recency on every route.
- Palette: five colours — graphite (surfaces/text), amber (accent + Model A), blue (Model B),
  green (healthy), red (error). Every price is USD per million tokens.
- Gates: `npm test` 65/65 · `npx tsc --noEmit` clean · `npm run build` 7/7 static pages ·
  `npm run verify:ui` 116/116 browser checks.

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
