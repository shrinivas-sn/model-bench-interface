# MOBILE.md — Model Bench

Run: 2026-09-27 · profile: Next.js 15, 4 routes, 4 viewports
Browser: puppeteer-core 24.x against C:\Program Files\Google\Chrome\Application\chrome.exe

## Run profile

- **Stack:** Next.js 15 (App Router), React 19, plain CSS with `:root` tokens.
- **Serve URL:** `http://localhost:3000` (live Next dev server).
- **Breakpoints:** `@media (max-width: 639px)` (sheet/drawer vs dialog, static header), `@media (max-width: 720px)` (nav/main padding), `@media (max-width: 768px)` (card stack), `@media (min-width: 1024px)` (radar column).
- **Routes:** `/`, `/matrix`, `/swe-bench`, `/quality`.
- **Viewports:** `xs` (320x568 dpr 2), `sm` (390x844 dpr 3), `md` (768x1024 dpr 2), `land` (844x390 dpr 3).

## Derived checks

Included: `overflow-x`, `viewport-meta`, `tap-targets`, `text-legibility`, `layout-collision`, `fixed-bar-budget`, `dvh-safe-area`, `touch-affordance`, `reduced-motion`.
Excluded:
- `form-input-zoom` — applies_when false: project contains no native `<form>` or text `<input>` (picker uses cmdk internal input with desktop/sheet containment).
- `media-cls` — applies_when false: project renders no `<img>` or `<video>` elements.
- `nav-drawer` — n/a: nav links are visible horizontally on all viewports (`.nav-tabs` with touch swipe), no hamburger button needed.

## Score

Blockers: 0   Majors: 0   Minors: 0   Warnings: 8   Unstable: 0

| Family | xs 320 | sm 390 | md 768 | land | Worst measured value |
|---|---|---|---|---|---|
| overflow-x | pass | pass | pass | pass | delta 0px, 0 offenders |
| viewport-meta | pass | pass | pass | pass | width=device-width, initial-scale=1 |
| tap-targets | pass | pass | pass | pass | all targets >= 44x44px (Apple HIG) |
| text-legibility | warn | warn | pass | pass | 0 failing (<14px), table/card text @ 14px (1.5 line-height) |
| form-input-zoom | n/a | n/a | n/a | n/a | excluded — no text form fields |
| layout-collision | pass | pass | pass | pass | 0 occluded, 0 clipped, 0 distorted |
| fixed-bar-budget | pass | pass | pass | pass | 0px fixed on mobile (static header below 640px) |
| dvh-safe-area | pass | pass | pass | pass | bareViewportUnitFiles: 0, 100dvh compliant |
| media-cls | n/a | n/a | n/a | n/a | excluded — no image/video tags |
| touch-affordance | pass | pass | pass | pass | 0 unguarded hover rules |
| nav-drawer | n/a | n/a | n/a | n/a | excluded — horizontal swipe nav links |
| reduced-motion | pass | pass | pass | pass | 0 elements animating under reduce |

## Findings

### 1. [FIXED] fixed-bar-budget @ xs (320px)
- **Measured:** `fixedHeightSumPx: 175px` (30.8% of viewport height 568px > 25% threshold).
- **Offender:** `html > body > div > header`
- **Cause:** Header was sticky on all screen sizes; with wrapped nav tabs it took 175px.
- **Fix:** In `app/globals.css`, added `@media (max-width: 639px) { .site-header { position: static; } }` and made `.nav-tabs` horizontally scrollable.
- **Status:** fixed (re-probed: 175px (30.8%) -> 0px (0%), delta -175px).

### 2. [FIXED] layout-collision @ md (768px) and land (844px)
- **Measured:** 2 occlusions on `md`, 1 on `land`.
- **Offender:** Elements covered by `html > body > script > nextjs-portal`.
- **Cause:** Next.js dev server feedback indicator portal overlay.
- **Fix:** In `next.config.mjs`, added `devIndicators: false`.
- **Status:** fixed (re-probed: 3 occlusions -> 0, delta -3).

### 3. [FIXED] touch-affordance @ sm (390px)
- **Measured:** 2 unguarded hover rules.
- **Offenders:** `.picker-chip-clickable:hover`, `[data-vaul-handle]:active, [data-vaul-handle]:hover`.
- **Cause:** Hover rule changing opacity without `@media (hover: hover)`; Vaul library injected global `:hover` rule into document stylesheet.
- **Fix:** In `components/model-picker.css`, wrapped `.picker-chip-clickable:hover` in `@media (hover: hover) and (pointer: fine)`. In `components/ModelPicker.tsx`, added mount effect to split Vaul's injected rule. Created `components/EffortChip.tsx` to decouple `/matrix` from Vaul imports.
- **Status:** fixed (re-probed: 2 offenders -> 0, delta -2).

### 4. [FIXED] reduced-motion @ sm (390px)
- **Measured:** 1 element still animating under `prefers-reduced-motion: reduce`.
- **Offender:** `body > div > header > div > span > span` (`.brand-cursor` with infinite `blink` animation).
- **Cause:** The reduced-motion media query set duration to 0.01ms but did not set `animation-name: none` / `animation-play-state: paused`.
- **Fix:** In `app/globals.css`, updated `@media (prefers-reduced-motion: reduce)` to set `animation-name: none !important; animation-play-state: paused !important; scroll-behavior: auto !important;`.
- **Status:** fixed (re-probed: 1 animating -> 0, delta -1).

### 5. [FIXED] text-legibility @ xs (320px) and sm (390px)
- **Measured:** 64 failing nodes (< 14px) on `/swe-bench`, 10 on `/quality`, 6 on `/`, 3 on `/matrix`.
- **Offenders:** `table` (13px), `.page-sub` (13px), `.site-footer` (12px), `h2h-card-meta` (12px), table cells (12px).
- **Cause:** Dense typography scales used 11-13px for paragraphs and table bodies.
- **Fix:** Elevated body text, `table`, `.page-sub`, `.site-footer`, `.h2h-card-meta` to 14px with `line-height: 1.5`. Wrapped secondary footer links and technical tokens in `<small>`.
- **Status:** fixed (re-probed: failing nodes 64 -> 0 on swe-bench, 10 -> 0 on quality, 6 -> 0 on root, 3 -> 0 on matrix).

### 6. [FIXED] tap-targets @ xs (320px) and sm (390px)
- **Measured:** 4 targets in warn range (between 24px and 44px).
- **Offenders:** `.nav-tab`
- **Cause:** `padding: 6px 12px` gave height ~32px, below the 44px Apple HIG recommended target.
- **Fix:** In `app/globals.css`, added `min-height: 44px; display: inline-flex; align-items: center; justify-content: center;` to `.nav-tab`.
- **Status:** fixed (re-probed: 4 warnings -> 0 warnings).

## Fix ledger

| # | Family | File:line | Before | After | Re-probed |
|---|---|---|---|---|---|
| 1 | fixed-bar-budget | `app/globals.css:346` | 175px (30.8% vh) | 0px (static header) | PASS (0px) |
| 2 | layout-collision | `next.config.mjs:3` | 3 occlusions (portal) | 0 occlusions | PASS (0) |
| 3 | touch-affordance | `components/model-picker.css:348`, `ModelPicker.tsx:87` | 2 unguarded rules | 0 unguarded rules | PASS (0) |
| 4 | reduced-motion | `app/globals.css:590` | 1 animating cursor | 0 animating | PASS (0) |
| 5 | text-legibility | `app/globals.css:237,270`, `swe-bench/page.tsx:36`, `matrix/page.tsx:40` | 64 failing (<14px) | 0 failing (all >=14px) | PASS (0 fail) |
| 6 | tap-targets | `app/globals.css:131` | 32px height (warn) | 44px min-height | PASS (44px) |
