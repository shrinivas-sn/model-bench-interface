# Project status

Single running log — update in place each session. Overflow moved verbatim to
`DOCS/WORK/archive.md`.

**As of 28/09/2026.**

## Current state

- **Live at https://model-bench.shrinusn2001.workers.dev and synced with GitHub `origin/main`.**
- Product: "Model Bench" — Next.js static edge app comparing frontier LLMs (Claude, GPT, Gemini, etc.)
  across LiveBench, SWE-bench Verified, and OpenRouter pricing/context.
- Ingestion: GitHub Actions daily cron (.github/workflows/ingest.yml) refreshes at 02:30 UTC.
  4 declarative adapters; verified parse ratio 1.00; stores accumulate history in git.
- Normalization: pure effort parser (explicit forms only, bare -max null); alias matcher;
  scores.json emitted at build time. All prices normalised to USD **per million tokens** —
  OpenRouter reports per token and LiveBench per million, and mixing the two was the bug that
  made every price read `$0.00/M`.
- UI: three-stage picker (company → model → reasoning effort, effort buttons driven by that
  model's real variants), recent picks leading by default, app-owned AND-token search, A/B
  identity carried by colour and named legend, and a data-status strip showing last ingest,
  source health and counts on every route.
- Palette: five colours — graphite, amber, blue, green, red. The generated zinc-emerald /
  terminal-dev tokens were overridden by the owner. See `design-tokens.json`.
- Quality Gates: `npm test` **65/65** pass; `npm run verify:ui` **116/116** browser checks
  (layout, AA contrast, 44px tap targets, full picker journey, mobile sheet); `npx tsc --noEmit`
  clean; `npm run build` static export clean (7/7 pages generated).

## Pending

- Manual alias table for SWE-bench systems (org/team display names) to lift 51/180 match rate.
- Investigate 8 unmatched LiveBench names — now listed on `/quality` with the exact fix steps.
- Deploy this UI pass; the live URL still serves the previous design.

## Next up (start here)

1. Run `npm run deploy` to publish the redesign to the live URL.
2. Connect Workers Builds in the Cloudflare dashboard (Settings → Builds → Connect to Git) if
   not already active, so the daily cron commit redeploys automatically.
3. Build the manual alias table for SWE-bench systems on `/quality` to improve the 51/180
   match rate.
