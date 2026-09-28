# WORK — 2026-09-28

**Session:** Owner-reported UI/UX gaps — AI-slop palette, unclear model selection, missing
price/Mtok data, unexplained nav destinations, no visible data freshness, weak search.
**Continues:** `DOCS/WORK/2026-09-26/WORK.md`, `PLAN.md` (Phases 1-4, now closed).

## What the owner asked for

1. Replace the AI-slop colour palette with a clean 4-5 colour combination; improve the
   background too.
2. Model picking should be company → model → effort, with effort offered as buttons based on
   that model's actual variants; A and B should be unmistakable while comparing.
3. Explain/fix the missing price per million tokens; show ingestion recency at the top.
4. Lead with recent picks instead of making the user search; make search actually work.
5. Explain whether the other three nav buttons are useful.

## Findings (measured, before any change)

| # | Finding | Evidence |
|---|---|---|
| F1 | Prices rendered as `$0.00/M` everywhere | `build-data.mjs` stored OpenRouter `pricing.prompt` (dollars **per token**, e.g. 0.00001) and the LiveBench fallback (dollars **per million**) in the *same* field. 57 rows were per-token, 6 were per-million. Confirmed by comparing `pricing.prompt * 1e6` against `cost.input_price_per_million`: 38/63 matched exactly, the rest differed only because the two sources genuinely disagree. |
| F2 | Picking a model from search never reached the effort step | `search` non-empty forced the flat results list, so `stage="effort"` was unreachable while a query was present. Caught by `probe/verify-ui.mjs`, not by reading the code. |
| F3 | Effort was encoded with five unrelated hues (red/amber/emerald/blue/violet) | `model-picker.css` — effort is ordinal data, so five hues carried no information. |
| F4 | Emoji used as interface icons | `🔍` (search), `▼` (caret), `⇄` (swap), `●` (status dot) — renders per-OS, unreadable to screen readers. |
| F5 | Two text tiers failed WCAG AA | browser-measured: `.page-purpose` 4.18:1, `th` 4.05:1 against a 4.5:1 floor. |
| F6 | `.picker-group-heading` never applied | cmdk renders `[cmdk-group-heading]`; the class existed in CSS but on no element, so every group heading rendered unstyled. |
| F7 | `transition: all` on the swap button | animates painted properties on the main thread. |
| F8 | Freshness was only a small badge | `FreshnessBadge` in the header — no recency, no per-source count, and it could not show a build-frozen relative age. |

## Changes

- **Palette** (`app/globals.css`, `design-tokens.json`): five colours — graphite (all surfaces,
  lines, text), amber (accent + Model A), blue (Model B), green (healthy), red (error).
  Background is `#0f1216` with a neutral-to-neutral 180° wash, not near-black and not a
  coloured gradient. `--text-faint` raised to `#828d9c` so the lowest text tier clears AA.
- **Head-to-head** (`components/HeadToHead.tsx`): A/B identity carried by card top edge, slot
  badge, bar label and bar colour, plus a legend naming the two actual models; radar and
  per-task table headers name them too. Prices shown as `$/Mtok in / out`.
- **Picker** (`components/ModelPicker.tsx`, `components/model-picker.css`): three stages —
  companies (grid, with counts) → models for that company → reasoning effort for that model.
  The effort stage is skipped for single-variant families. Recents lead step one. Back button
  and breadcrumb; Escape goes back one stage before closing.
- **Search** (`lib/picker.mjs`): the app now owns filtering (`shouldFilter={false}`) with
  AND-token matching ranked label > word > effort > benchmark name > vendor, so "opus max"
  narrows instead of widening.
- **Icons** (`components/icons.tsx`): inline SVG replaces every emoji glyph.
- **Data status** (`components/DataStatusStrip.tsx`, `components/RelativeTime.tsx`): one line
  under the header on every route — last ingest, healthy source count, release, model and run
  counts, and a link to `/quality` when something is wrong.
- **Nav + pages** (`components/AppNav.tsx`, `components/ModelMatrix.tsx`,
  `components/SweBenchTable.tsx`, `app/*/page.tsx`): labels state the question each view
  answers ("Compare", "All models", "Agent runs", "Data health") with a hint line; the matrix
  and SWE-bench tables gained search, sort and a matched-only filter.
- **Prices** (`normalization/build-data.mjs`, `lib/data.ts`): every price normalised to dollars
  per million before it leaves the build step; the app reads only
  `pricing.input_per_million` / `pricing.output_per_million`.

## Verification

- `npm test` — **65/65 pass** (was 28; +37 covering search ranking and AND semantics, effort
  options, price formatting, recents storage failure modes, freshness summarising).
- `npx tsc --noEmit` — clean.
- `npm run build` — clean static export, 7/7 pages.
- `npm run verify:ui` (new, `probe/verify-ui.mjs`) — **116/116 checks pass** in Chrome against
  `out/` at 5 viewports: no horizontal overflow, all owned controls ≥44px, measured contrast
  7.25 / 5.58 / 5.4:1, correct data-strip and nav text, plus the full picker journey (companies
  → search ranking → effort buttons → commit → URL → back-one-stage) and the mobile bottom
  sheet at 390px.

## Open items (unchanged from before this session)

- SWE-bench manual alias table — still 51/180 matched; the 8 unmatched LiveBench names are
  listed on `/quality` with the fix instructions inline.
- Cloudflare Workers Builds still needs connecting in the dashboard so cron commits redeploy.
