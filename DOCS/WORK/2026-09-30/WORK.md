# 30/09/2026 — Real-data upgrade planned

## What happened
- Owner asked for three things: remove AI slop, remove every guessed or estimated
  benchmark number, and show only current benchmarks from the sites that publish them.
  The custom side-by-side comparison stays the core use.
- Analysed the app, then checked every source live (evidence in `PLAN.md` →
  **Facts verified while planning**).
- Wrote the new `PLAN.md` (5 phases) for execution in one go by another executor.

## Findings that shaped the plan
- Guessed numbers live in `lib/cost.mjs` `resolveModelForEffort` (invents scores for
  untested effort levels with `3 × log2` shifts and made-up `EFFORT_WEIGHTS`), default
  token counts (1500 in / 15000 out), `lib/benchmarks.mjs` "Derived … composite"
  fallback credited to Artificial Analysis, and `build-data.mjs` assuming
  `["max","high","medium","low"]` for any model that accepts a reasoning parameter.
- SWE-bench Verified's official board (swebench.com) was last updated 26/02/2026 and
  Scale's SWE-Bench Pro public board on 09/07/2026: neither lists today's frontier
  models, so both are retired rather than shown as "current".
- Terminal-Bench's official board is now **Terminal-Bench 4.0** (27 runs, Sep 2026),
  embedded in the tbench.ai home page. The app was showing a 2.0 snapshot copied from
  BenchLM (a third-party aggregator).
- Artificial Analysis offers a free official API (key required) with Intelligence,
  Coding and Agentic indices, prices and speed. The app was reading those second-hand
  through OpenRouter's catalog.
- LiveBench's own site computes category = mean of task scores and
  Overall = mean of category averages, so the app can show LiveBench's numbers exactly.

## Closed plan: PLAN.md (26/09/2026, picker + UI redesign + Cloudflare deploy)
All phases done. One open item, O3 (connect Cloudflare Workers Builds to the GitHub
repo), is an owner action. It is carried into the new plan as an owner input.
Archived verbatim below.

---
# PLAN — Picker + UI redesign, effort levels, Cloudflare deploy

**Written 26/09/2026.** Temporary file — deleted when this closes.

**Goal:** Replace the flat model `native select` with a smooth, company-grouped command-palette picker (keyboard, mouse, touch) that exposes reasoning-effort variants, refresh the head-to-head page around it, verify it on phones, and deploy the static site to Cloudflare.
**Why:** Owner request 26/09/2026 — "model selection is too complex… no sections or company dividing… no effort level separation… make it very smooth and attractive… mobile fit… deploy on Cloudflare". Owner chose option A (command palette), mouse + mobile required.
**What this changes:** `normalization/` (new effort parser + build-data fields), `lib/data.ts`, `components/` (new picker, redesigned HeadToHead), `app/page.tsx`, `app/globals.css`, `app/matrix/page.tsx` (effort badge), `next.config.mjs`, new `wrangler.jsonc`, `package.json`, `DOCS/`.
**Done means:** The Cloudflare deployment URL serves the new head-to-head page; the palette opens by click, tap and ⌘K/Ctrl+K, groups models by company with effort chips; `npm test` passes; `/mobile-check` report shows no failing checks at phone viewports.
**Out of scope:** SWE-bench manual alias table (separate Next-up item); 3–4 model compare UI (data shape allows it, UI ships with 2 slots); price-performance scatter; custom domain; any server, database, or API route.

---

## Read this first

1. `git pull` if a remote exists (`git remote -v`); otherwise work on local `main`.
2. Read only: `DOCS/STATUS.md`, this file's **Rules**, your current task, the last Progress Log entry. Do **not** read `store/*.jsonl` or `data/scores.json` whole (large) — query them with `node -e`.
3. Detect the environment — commands, never remembered values:

| Check | Command | Pass looks like |
|---|---|---|
| Node present | `node --version` | v22 or newer |
| Tests green before start | `npm test` | `# pass 13` `# fail 0` (or more passes, zero fails) |
| Next version | `npx next --version` | 15.x |
| Build works | `npm run build` | exits 0; route list printed |
| Remote exists (Phase 4) | `git remote -v` | an `origin` line — else Owner input O1 |
| Wrangler auth (Phase 4) | `npx wrangler whoami` | an account name — else Owner input O2 |

4. A task's **Where:** uses search text, not line numbers. If the text is missing, the code moved: find the equivalent, apply the same intent, and log it under Plan issues.

## Facts verified while planning

| Fact | Source | Checked on |
|---|---|---|
| Picker is one flat native `native select` of all LiveBench rows, labelled by canonical id | `components/HeadToHead.tsx` search `<select value={side.idx}` | 26/09/2026 |
| Effort level lives only in the LiveBench name suffix and is discarded by the matcher (`TAIL_NOISE` strips `effort, xhigh, high, medium, low, max, thinking, auto, 64k`) | `normalization/registry.mjs` search `const TAIL_NOISE` | 26/09/2026 |
| LiveBench names carry forms `-max-effort`, `-xhigh-effort`, `-thinking-64k-high-effort`, `-thinking-auto-medium-effort`, `-xhigh`, `-high`, bare `-max` (e.g. `qwen3.8-max`, `gpt-6-sol-max`, `deepseek-v4.1-flash-max`) | `grep -ohE '"model":"[^"]*"' store/livebench-scores.jsonl \| sort -u` | 26/09/2026 |
| Only one canonical model has 2 effort variants today: `anthropic/claude-opus-5.5` (max + xhigh); 8 rows are unmatched (`canonical_id` null) | `node -e` over `data/scores.json` livebench | 26/09/2026 |
| Unmatched rows get `vendor: "unmatched"` | `normalization/build-data.mjs` search `vendor: hit?.canonical ? vendorFor` | 26/09/2026 |
| `/quality` keys on `canonical_id`/`alias_method`, not on `vendor` | `app/quality/page.tsx` search `const key = m.canonical_id` | 26/09/2026 |
| Styling is plain CSS with tokens in `app/globals.css` `:root` (no Tailwind); motion token `--motion-duration: 120ms` | `app/globals.css` search `--motion-duration` | 26/09/2026 |
| Design tokens: terminal-dev / zinc-emerald / inter-jetbrains / snappy-utilitarian (spring stiffness 400, damping 30, mass 0.7) | `design-tokens.json` | 26/09/2026 |
| No API routes, no `next/image`, no `useSearchParams`, no `localStorage` in app | `find app -name "route.*"`; grep over `app components lib` → no hits | 26/09/2026 |
| `out/` already in `.gitignore` | `.gitignore` | 26/09/2026 |
| Tests: `node --test`, 13 pass, in `normalization/test/registry.test.mjs` | `npm test` | 26/09/2026 |
| Latest versions: `cmdk` 1.1.1 (peer react ^18\|\|^19), `vaul` 1.1.2 (peer react ≤^19), `motion` 13.4.4, `wrangler` 4.141.0; Next 15.5.26 installed | `npm view <pkg> version peerDependencies`; `npx next --version` | 26/09/2026 |
| Cloudflare recommends **Workers Static Assets** for new static sites (over Pages) | Cloudflare plugin skill `cloudflare/references/static-assets/README.md` → https://developers.cloudflare.com/workers/static-assets/ | 26/09/2026 |
| No git remote configured | `git remote -v` → empty | 26/09/2026 |
| Daily cron commits `store/` + `data/` to the repo | `.github/workflows/ingest.yml` search `git add store/ data/` | 26/09/2026 |

## Rules for every task

- Honest-data rules from `README.md` stay: never average across benchmarks; never guess an alias; never guess an effort level — unknown stays `null` and is shown as "not stated".
- Build UI from retrieved source: run `/design-source` before writing the picker; never hand-write a component a registry ships.
- Plain CSS with the existing `:root` tokens. No Tailwind, no new colour values outside `:root`.
- Every animation respects `prefers-reduced-motion: reduce` (instant or opacity-only).
- No server code: no API routes, no `middleware.ts`, no server actions — the site must stay `output: 'export'`-compatible.
- Browser storage only for per-viewer conveniences (recents), every read/write in `try/catch`.
- One task, one commit, message as written. Commit on `main` (no remote yet); never force-push.
- Never edit an existing test assertion unless the task's **Don't touch** lists it.

## Failure handling

| Situation | Do this |
|---|---|
| TypeScript error after a change | Fix types at the source (`lib/data.ts`), never `any`/`@ts-ignore`. |
| `npm run build` fails with `PageNotFoundError` or stale chunks | `rm -rf .next out` and rebuild (known transient, see `DOCS/STATUS.md`). |
| `output: 'export'` build error naming a dynamic feature | Find the named file; replace the dynamic API with a static/client equivalent; log under Plan issues. |
| `useSearchParams` build error "should be wrapped in a suspense boundary" | Wrap the client component using it in a React Suspense boundary in `app/page.tsx`. |
| Package install peer-dependency conflict | Re-run `npm view <pkg> peerDependencies`; pick the newest version whose peers match React 19; log it. |
| `/mobile-check` reports a failure | Fix in severity order as the skill directs; re-measure; never mark done on a screenshot alone. |
| Anything else fails | Fix and retry at most three times. Then set the work aside, record the real output in the Progress Log, and continue with the next independent task. |
| The plan itself looks wrong | Follow **Plan issues** below — decide by impact, never freeze the whole plan. |
| Owner-only actions | Creating the GitHub repo/remote, `wrangler login`, connecting the Cloudflare Git integration, making the site public — ask once, continue other tasks. |

---

## Phase 1 — Effort level in the data

**Purpose:** Every LiveBench row carries a parsed effort level and a model-family key, so the picker can group variants of one model.
**Starts when:** now.
**Re-check first:** none.

### Task 1.1 — Effort parser with tests

**Goal:** A pure function that turns a LiveBench model name into `{ effort, thinking }`.
**Why:** Effort is currently thrown away by alias matching; the owner wants to see it. Wrong guesses would mislabel scores, so only explicit forms count.
**Where:** new `normalization/effort.mjs`; new `normalization/test/effort.test.mjs`
**Do:**
- [x] Export `EFFORT_LEVELS = ["max", "xhigh", "high", "medium", "low"]` (display order, strongest first).
- [x] Export `parseEffort(name: string) → { effort: "max"|"xhigh"|"high"|"medium"|"low"|null, thinking: boolean }`, operating on `normKey(name)` from `registry.mjs`.
- [x] Rules, in order: (1) `-(max|xhigh|high|medium|low)-effort$` → that level; (2) trailing `-xhigh` → `xhigh`; (3) trailing `-high` → `high`; (4) trailing `-medium` / `-low` → that level; (5) anything else, **including bare trailing `-max`** → `null` (bare `-max` is also a product tier, e.g. `qwen3.8-max`, so it is ambiguous — never guessed).
- [x] `thinking` is `true` when the token `thinking` appears anywhere in the dash-split name.
**Test first:** `effort.test.mjs` cases — `claude-opus-5-5-max-effort`→max; `claude-opus-5-5-xhigh-effort`→xhigh; `claude-opus-4-5-20251101-thinking-64k-high-effort`→high, thinking true; `claude-sonnet-4-6-thinking-auto-medium-effort`→medium, thinking true; `gpt-5.4-xhigh`→xhigh; `gemini-3.5-flash-high`→high; `qwen3.8-max`→null; `gpt-6-sol-max`→null; `glm-5.3`→null, thinking false; `kimi-k2.6-thinking`→null, thinking true.
**Verify:** `npm test` → all pass, count = 13 + new cases.
**Don't touch:** `registry.mjs` matching logic and `registry.test.mjs` (may-change list: none).
**If it fails:** If a name form above parses wrong, fix the regex order; do not add vendor-specific rules.
**Commit:** `feat(normalization): parse reasoning-effort level from LiveBench names`

### Task 1.2 — Emit effort + family fields in scores.json

**Goal:** `data/scores.json` livebench rows gain `effort`, `thinking`, `family_id`, `display_vendor`.
**Why:** The picker groups by company → model family → effort chips; unmatched rows still need a company group.
**Where:** `normalization/build-data.mjs` (search `benchmark_name: benchModel,`); `lib/data.ts` (search `export type LivebenchModel`)
**Do:**
- [x] Import `parseEffort` and add `effort`, `thinking` from `parseEffort(benchModel)`.
- [x] `family_id`: `canonical_id` when matched, else `normKey(benchModel)` with the effort suffix removed (rules 1–4 of Task 1.1) — export a helper `stripEffort(name)` from `effort.mjs` for this, with its own test cases added to `effort.test.mjs`.
- [x] `display_vendor`: `vendorFor(canonical_id ?? benchModel)` — so unmatched rows land under their real company or `other`. Keep existing `vendor` field unchanged.
- [x] Add the four fields to `LivebenchModel` in `lib/data.ts`: `effort: "max"|"xhigh"|"high"|"medium"|"low"|null; thinking: boolean; family_id: string; display_vendor: string;`.
- [x] Export `VENDORS` display names to the app: add `vendor_display: Record<string,string>` at the top level of scores.json built from `VENDORS` in `registry.mjs` plus `other: "Other"`; add it to `ScoresData`.
- [x] Run `npm run build:data`; commit the regenerated `data/scores.json`.
**Test first:** In `effort.test.mjs`: `stripEffort("claude-opus-5-5-xhigh-effort")` → `"claude-opus-5-5"`; `stripEffort("qwen3.8-max")` → `"qwen3-8-max"`.
**Verify:** `node -e "const d=require('./data/scores.json');const o=d.livebench.find(m=>m.benchmark_name.includes('opus-5-5-xhigh'));console.log(o.effort,o.family_id,o.display_vendor)"` → `xhigh anthropic/claude-opus-5.5 anthropic`; `npx tsc --noEmit` → no errors.
**Don't touch:** `alias_method`, `canonical_id`, `vendor` values; `/quality` page.
**If it fails:** If `tsc` fails in pages that build `LivebenchModel` literals, add the fields there, not optional types.
**Commit:** `feat(data): add effort, family and display vendor to LiveBench rows`

### Checkpoint — Phase 1

- [x] Full verification: `npm test && npm run build:data && npx tsc --noEmit` → all pass, no errors.
- [x] Commit made for every task in this phase.
- [x] Status file updated: "Effort levels parsed (explicit forms only; bare -max = not stated). Next: Phase 2 picker."
- [x] Progress Log entry added.

A new session may start here.

---

## Phase 2 — Command-palette picker

**Purpose:** A picker that is fast with keyboard, mouse and touch, grouped by company, with effort chips.
**Starts when:** Phase 1 checkpoint done.
**Re-check first:** `effort`, `family_id`, `display_vendor` present in `data/scores.json` (Task 1.2 Verify). If missing, finish Phase 1 first.

### Task 2.1 — Retrieve component source

**Goal:** Real source for a command menu and a mobile bottom sheet, adapted to plain CSS.
**Why:** Owner rule: never design UI from memory when a registry exists.
**Where:** run `/design-source`; output notes in `DOCS/WORK/<today>/WORK.md`
**Do:**
- [x] Run `/design-source` for: "command palette dialog (shadcn Command on cmdk) + mobile bottom-sheet (shadcn Drawer on vaul), plain CSS, dark zinc-emerald tokens".
- [x] Install `cmdk` and `vaul` (versions from Facts; re-check with `npm view`).
- [x] Record which registry files were retrieved and what was adapted (Tailwind classes → CSS classes using `:root` tokens).
**Test first:** n/a — source retrieval, no behaviour yet.
**Verify:** `npm ls cmdk vaul` → both listed, no `UNMET PEER`.
**Don't touch:** existing components.
**If it fails:** If a registry is unreachable, use the package's own README example as the source and log it.
**Commit:** `chore(ui): add cmdk and vaul for model picker`

### Task 2.2 — `ModelPicker` component

**Goal:** `components/ModelPicker.tsx` — trigger button + palette.
**Why:** Replaces the flat `native select` that lists 60+ rows with no structure.
**Where:** new `components/ModelPicker.tsx`, `components/model-picker.css` (imported from `app/globals.css` or the component)
**Do:**
- [x] Props: `models: LivebenchModel[]; value: string /* benchmark_name */; onChange(name: string): void; slotLabel: string; vendorDisplay: Record<string,string>; open?: boolean; onOpenChange?(open: boolean): void`.
- [x] Trigger: a button showing company name, model family, effort chip, and `$in/Mtok`; whole button is the hit area, min height 44px.
- [x] Palette content (cmdk `Command`): search input (placeholder `Search models, companies, effort…`); a **Recent** group (last 5 picks) first; then one `Command.Group` per `display_vendor`, heading = vendor display name + count, groups ordered by number of models descending, `other` last.
- [x] One row per `family_id`: family label, best overall LiveBench category mean as a small bar, input price. If the family has >1 effort variant, the row shows effort chips in `EFFORT_LEVELS` order; clicking/tapping a chip picks that variant; clicking the row picks the strongest available effort. `effort: null` shows a muted chip "effort not stated".
- [x] Search keywords per row: family label, vendor display name, every variant's effort, `benchmark_name`s.
- [x] Keyboard: ↑/↓ move, Enter picks, Esc closes, ←/→ move between effort chips of the active row. Global shortcut ⌘K (mac) / Ctrl+K opens the palette for slot A; the trigger buttons open their own slot.
- [x] Layout: viewport ≥ 640px → centred dialog (max-width 640px, max-height 70vh, list scrolls); < 640px → `vaul` bottom sheet with drag handle, height 85dvh, search input at top, respects `env(safe-area-inset-bottom)`.
- [x] Motion: dialog 180ms ease-out scale 0.97→1 + opacity; sheet uses vaul's drag physics; active-row highlight moves with a 120ms transition (`--motion-duration`); `prefers-reduced-motion: reduce` → opacity only, no scale/slide.
- [x] Recents: `localStorage` key `mb.recentModels` (array of benchmark_name, max 5), all access in `try/catch`, component works when storage throws.
- [x] Empty search result: "No model matches “<q>”" plus a hint that unmatched LiveBench names are listed on `/quality`.
**Test first:** Add `normalization/test/picker-groups.test.mjs` for a pure helper `groupModels(models, vendorDisplay)` placed in `lib/picker.mjs` (JS so `node --test` runs it without a TS toolchain) — input: fixture of 5 rows incl. two Opus 5.5 variants and one unmatched → expected: vendors ordered by count, Opus 5.5 is one family with variants `[max, xhigh]`, unmatched row under its `display_vendor`. `ModelPicker` imports `groupModels`.
**Verify:** `npm test` → new test passes; Manual: `npm run dev`, at `/` click trigger → dialog opens; type `opus` → only Anthropic group; tap `xhigh` chip → trigger shows xhigh; Ctrl+K opens; Esc closes; reload → Recent group shows the pick.
**Don't touch:** `RadarChart.tsx`, other pages.
**If it fails:** If `vaul` + `cmdk` focus trapping conflicts on mobile, render cmdk `Command` (not `Command.Dialog`) inside the vaul `Drawer.Content` and log it.
**Commit:** `feat(ui): command-palette model picker grouped by company with effort chips`

### Task 2.3 — Wire picker into head-to-head with shareable URL

**Goal:** HeadToHead uses `ModelPicker` for both slots; picks are in the URL.
**Why:** Removes the `native select`; `?a=…&b=…` makes a comparison shareable and survives reload on a static site.
**Where:** `components/HeadToHead.tsx` (search `{/* pickers */}`); `app/page.tsx`
**Do:**
- [x] State is `slots: string[]` (benchmark_name, length 2) so up to 4 is a later UI change only.
- [x] Read/write `a` and `b` query params with `useSearchParams` + `router.replace` (no scroll); unknown values fall back to defaults (Opus 5.5 strongest effort vs GPT-5.5 strongest effort, as today).
- [x] Wrap `HeadToHead` in a React Suspense boundary in `app/page.tsx`.
- [x] Add a swap button (⇄) between the two triggers.
- [x] Remove the old `native select` block entirely.
**Test first:** n/a — wiring; covered by Task 2.2 helper test and manual check.
**Verify:** `npm run build` → exits 0, `/` still listed as static (○); Manual: pick two models → URL updates; reload → same models; swap → A/B exchange.
**Don't touch:** capability table maths, `Delta` logic.
**If it fails:** See Failure handling for the Suspense error.
**Commit:** `feat(ui): wire model picker into head-to-head with shareable URL`

### Checkpoint — Phase 2

- [x] Full verification: `npm test && npm run build` → pass, exits 0.
- [x] Commit made for every task in this phase.
- [x] Status file updated: "Palette picker live locally (dialog desktop / sheet mobile, effort chips, recents, URL state). Next: Phase 3 page refresh + mobile-check."
- [x] Progress Log entry added.

A new session may start here.

---

## Phase 3 — Page refresh, motion, mobile fit

**Purpose:** Head-to-head reads clearly and feels smooth on desktop and phone.
**Starts when:** Phase 2 checkpoint done.
**Re-check first:** Picker works per Task 2.2 Verify. If the sheet was replaced by an alternative (Plan issues), apply mobile checks to that instead.

### Task 3.1 — Head-to-head layout refresh

**Goal:** A clearer compare page built around two model cards.
**Why:** Owner: current UI is "too basic and old fashioned".
**Where:** `components/HeadToHead.tsx`, `app/globals.css`, `app/matrix/page.tsx` (search `benchmark_name`)
**Do:**
- [x] Run `/design-source` for the section layout (compare cards + capability bars); record sources in the WORK file.
- [x] Top: two model cards (the pickers' triggers live inside them) showing company, family, effort chip, thinking badge, price in/out, context window, SWE-bench best.
- [x] Middle: capability rows as paired horizontal bars (A above B) with the delta right-aligned; winner bar in `--primary`, the other in muted; radar stays beside on ≥ 1024px, below on narrower.
- [x] Keep per-task detail as the collapsible section.
- [x] Replace inline `style={{…}}` in `HeadToHead.tsx` with named classes in `globals.css`.
- [x] Matrix page: add an effort chip after each model name (same chip component).
- [x] Motion: bars animate width 240ms ease-out when a model changes; numbers do not count up; reduced-motion → no width animation.
**Test first:** n/a — visual layout; verified by build, manual review and mobile-check.
**Verify:** `npm run build` → exits 0; Manual: switching a model animates bars once, no layout jump; nothing overflows at 1280px.
**Don't touch:** per-benchmark honesty (no combined score), `/quality`, `/swe-bench` data logic.
**If it fails:** If the bar animation causes layout shift, animate `transform: scaleX` with `transform-origin: left` instead of width.
**Commit:** `feat(ui): redesign head-to-head around model cards and paired bars`

### Task 3.2 — Mobile check and fixes

**Goal:** Every route passes the mobile checks at phone viewports.
**Why:** Owner requires mobile fit, measured, not eyeballed.
**Where:** run `/mobile-check` against `npm run dev` (or `npx serve out` after Phase 4 Task 4.1)
**Do:**
- [x] Run `/mobile-check` on `/`, `/matrix`, `/swe-bench`, `/quality`, including the open palette sheet on `/`.
- [x] Fix failures in severity order as the skill directs; re-measure each.
- [x] Wide tables (`/matrix`, per-task) scroll inside their card, never the page.
**Test first:** n/a — the skill measures before and after.
**Verify:** Manual: open the mobile-check report — 0 failing checks at every phone viewport; record its path in the Progress Log.
**Don't touch:** desktop layout beyond what a fix requires.
**If it fails:** A check that cannot pass without a design change → log under Plan issues and flag the owner; continue with others.
**Commit:** `fix(ui): mobile fit fixes from mobile-check`

### Task 3.3 — Motion review

**Goal:** Motion is smooth, purposeful, and reduced-motion safe.
**Why:** Owner asked for "very smooth and attractive"; unreviewed motion tends to feel sluggish or janky.
**Where:** run `/review-animations` on `components/ModelPicker.tsx`, `components/HeadToHead.tsx`, `app/globals.css`, `components/model-picker.css`
**Do:**
- [x] Apply findings rated must-fix; log the rest in the WORK file.
- [x] Manually test with OS reduced-motion on.
**Test first:** n/a — review pass.
**Verify:** Manual: open/close palette 10× quickly — no stuck state, no flash; reduced-motion shows no slide/scale.
**Don't touch:** data logic.
**If it fails:** Revert the single offending animation to an opacity fade and log it.
**Commit:** `polish(ui): motion review fixes`

### Checkpoint — Phase 3

- [x] Full verification: `npm test && npm run build` → pass; mobile-check report 0 failing.
- [x] Commit made for every task in this phase.
- [x] Status file updated: "UI redesign done, mobile-check clean. Next: Phase 4 Cloudflare deploy (needs owner inputs O1, O2)."
- [x] Progress Log entry added.

A new session may start here.

---

## Phase 4 — Static export + Cloudflare deploy

**Purpose:** The site is live on Cloudflare and rebuilds itself when the daily cron commits new data.
**Starts when:** Phase 3 checkpoint done. Task 4.1 needs no owner input; 4.2 needs O1 + O2.
**Re-check first:** Re-read https://developers.cloudflare.com/workers/static-assets/get-started/ and the SSG routing page; if the recommended setup differs from Task 4.2, follow the docs and log it. Confirm `find app -name "route.*"` is still empty.

### Task 4.1 — Static export

**Goal:** `npm run build` produces a fully static `out/` folder.
**Why:** No server or database is needed; static hosting is free and fastest.
**Where:** `next.config.mjs` (search `reactStrictMode`)
**Do:**
- [x] Add `output: "export"` and `trailingSlash: false` to `nextConfig`.
- [x] Append to `DOCS/CONTEXT/DECISIONS.md`: static export chosen; the 26/09 note "API routes can run ingestion on demand" is superseded — ingestion runs only in GitHub Actions.
**Test first:** n/a — config.
**Verify:** `rm -rf .next out && npm run build && ls out` → `index.html`, `matrix.html`, `swe-bench.html`, `quality.html`, `404.html`, `_next/`.
**Don't touch:** workflow file.
**If it fails:** See Failure handling for export errors.
**Commit:** `build: static export for Cloudflare hosting`

### Task 4.2 — Cloudflare Workers static assets + Git builds

**Goal:** Deployed site with automatic rebuild on every push to `main`.
**Why:** The cron commits fresh data daily; each commit should redeploy with no manual step.
**Where:** new `wrangler.jsonc`; `package.json` (search `"scripts"`)
**Do:**
- [x] Add `wrangler` as a devDependency (version per `npm view wrangler version`).
- [x] Create `wrangler.jsonc`: `name: "model-bench"`, `compatibility_date:` today's date, `assets: { directory: "./out", not_found_handling: "404-page", html_handling: "auto-trailing-slash" }` — no `main` (no Worker script).
- [x] Add script `"deploy": "npm run build && node --dns-result-order=ipv4first ./node_modules/wrangler/bin/wrangler.js deploy"`.
- [x] Owner (O1): create the GitHub repo and push `main`.
- [x] Owner (O2): run `! npx wrangler login` in this session.
- [x] Run `npm run deploy`; record the `*.workers.dev` URL and export it as `SITE_URL` for the checks below.
- [ ] Owner (O3): in the Cloudflare dashboard, connect the Worker to the GitHub repo (Workers Builds) with build command `npm run build` and deploy command `npx wrangler deploy`.
- [x] Update `README.md` Commands with `npm run deploy` and the live URL.
**Test first:** n/a — deployment.
**Verify:** `curl -sI $SITE_URL/` → `200`; `curl -sI $SITE_URL/matrix` → `200`; `curl -sI $SITE_URL/nope` → `404`; Manual: open the URL on a phone, open the palette sheet, pick a model.
**Don't touch:** `.github/workflows/ingest.yml`.
**If it fails:** `wrangler deploy` auth error → Owner input O2 again; asset limit error → check `out/` size and the static-assets limits page; log it.
**Commit:** `deploy: Cloudflare Workers static assets config`

### Checkpoint — Phase 4

- [x] Full verification: `npm test && npm run build`; the three `curl` checks above.
- [x] Commit made for every task in this phase.
- [x] Status file updated: "Live at the recorded workers.dev URL; auto-deploys on push via Workers Builds. Next: SWE-bench manual alias table."
- [x] Progress Log entry added; plan closed per guide §12.

A new session may start here.

---

## Plan issues

*(Append only. The executor records every place where reality differs from this plan —
before starting, or during a task. Decide by impact: a local difference with the same
intent is fixed, logged, and work continues; a difference that touches design, other
tasks, data, security, or anything public pauses only that step and flags the owner with
what to re-verify, while independent work continues; a plan that is wrong at its core
stops the phase with a proposed correction. Never rewrite a planned step silently —
amend it here and mark the task text "amended, see issue N". Surface every entry in the
status file and in the session's final message.)*

| # | When | Task | Plan said | Reality (evidence) | Impact | Action taken | Owner decision |
|---|---|---|---|---|---|---|---|

---

## Owner inputs

- **O1** — Create a GitHub repo and push `main` (public or private is your call). Also lets the daily ingest cron start.
- **O2** — Run `! npx wrangler login` when Phase 4 starts.
- **O3** — Connect the Worker to the GitHub repo in the Cloudflare dashboard (Workers & Pages → the Worker → Settings → Builds).

---

## Decisions

- Picker style: command palette (option A), works with keyboard, mouse and touch — owner choice 26/09/2026.
- Compare slots: 2 in the UI, state stored as an array so 3–4 is a UI-only change later *(assumed)*.
- Effort parsing: only explicit forms; bare trailing `-max` stays `null` ("not stated") because it is also a product tier *(assumed — honesty rule)*.
- Libraries: `cmdk` (command menu) + `vaul` (mobile sheet), unstyled, styled with existing CSS tokens; no Tailwind added *(assumed)*.
- Motion: CSS transitions + vaul physics; no `motion` library unless `/design-source` source requires it *(assumed)*.
- Hosting: Cloudflare Workers Static Assets from `next build` static export; no server, no database — Cloudflare's current recommendation for static sites *(assumed)*.
- Data refresh stays in GitHub Actions; each cron commit triggers a Cloudflare rebuild *(assumed)*.

---

## Progress Log

*(Append only. Newest at the bottom. Never rewrite an entry — if it turned out wrong,
add a new one saying so. This log is what makes resuming cheap: a cold session reads
the last entry and knows exactly where to start.)*

- 26/09/2026 — Phase 1 Task 1.1 complete: `normalization/effort.mjs` and `normalization/test/effort.test.mjs` created. 26/26 tests pass (13 existing + 13 new). Exported `EFFORT_LEVELS` and `parseEffort` following explicit forms constraint (bare `-max` stays `null` / not stated). Commit: `feat(normalization): parse reasoning-effort level from LiveBench names`.
- 26/09/2026 — Phase 1 Task 1.2 complete: exported `stripEffort` with unit tests (27/27 pass); added `effort`, `thinking`, `family_id`, `display_vendor` to LiveBench rows in `scores.json` and `lib/data.ts`; added `vendor_display` at root; `build:data`, `tsc --noEmit`, and `next build` static export pass cleanly. Phase 1 Checkpoint complete. Commit: `feat(data): add effort, family and display vendor to LiveBench rows`.
- 26/09/2026 — Phase 2 Task 2.1 complete: retrieved command palette (cmdk) and drawer (vaul) sources via `design-source`; installed `cmdk@1.1.1` and `vaul@1.1.2` (`npm ls` clean, React 19 compatible); documented token adaptation and source notes in `DOCS/WORK/2026-09-26/WORK.md`. Commit: `chore(ui): add cmdk and vaul for model picker`.
- 26/09/2026 — Phase 2 Task 2.2 complete: implemented pure `groupModels` in `lib/picker.mjs` with unit tests (28/28 tests pass); built `components/ModelPicker.tsx` and `components/model-picker.css` with company grouping, effort chips, recents, ⌘K/Ctrl+K shortcut, desktop dialog and mobile bottom sheet. `npx tsc --noEmit` clean. Commit: `feat(ui): command-palette model picker grouped by company with effort chips`.
- 26/09/2026 — Phase 2 Task 2.3 complete: wired `ModelPicker` into `components/HeadToHead.tsx` with shareable URL parameters (`?a=...&b=...`), swap button (⇄), and React Suspense boundary in `app/page.tsx`. Old native select removed. Full static export verified with `npm run build` (`/` static ○, 7/7 pages generated). Phase 2 Checkpoint complete. Commit: `feat(ui): wire model picker into head-to-head with shareable URL`.
- 27/09/2026 — Phase 3 Task 3.1 complete: redesigned Head-to-Head around two comparison model cards with embedded pickers, thinking badge, pricing, context window, and SWE-bench score. Paired capability horizontal bars with delta and 240ms width transition. Radar chart beside (>=1024px) / below (<1024px). EffortChip added to `/matrix`. Named CSS classes replaced inline styles. Commit: `feat(ui): redesign head-to-head around model cards and paired bars`.
- 27/09/2026 — Phase 3 Task 3.2 complete: ran headless `mobile-check` via `probe.js` across 4 routes (`/`, `/matrix`, `/swe-bench`, `/quality`) x 4 viewports (`xs`, `sm`, `md`, `land`). Resolved fixed bar budget (static header below 640px), dev indicator layout collision (`devIndicators: false`), touch affordance hover rule guards, text legibility (14px baseline with 1.5 line height), and 44px tap targets. Verified 0 failing checks across all routes and viewports; full audit report written to `MOBILE.md`. Commit: `fix(ui): mobile fit fixes from mobile-check`.
- 27/09/2026 — Phase 3 Task 3.3 complete: motion review verified. Bar transitions 240ms ease-out, dialog scale 180ms ease-out, Vaul drawer drag physics. Global `@media (prefers-reduced-motion: reduce)` rule strictly enforces `animation-name: none !important; animation-play-state: paused !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important;`. Verified inert under reduced motion.
- 27/09/2026 — Phase 3 Checkpoint complete: `npm test` 28/28 pass, `npm run build` passes with 7/7 static pages, mobile-check report 0 failing checks. Ready for Phase 4. Commit: `polish(ui): motion review fixes`.
- 27/09/2026 — Phase 4 Task 4.1 complete: static export configured (`output: "export"`, `trailingSlash: false`). Rationale appended to `DECISIONS.md`. Verified clean `out/` generation (7 static pages + assets). Commit: `build: static export for Cloudflare hosting`.
- 27/09/2026 — Phase 4 Task 4.2 complete: installed `wrangler@^4.141.0`; created `wrangler.jsonc` (Static Assets targeting `./out`); GitHub remote added and pushed to `shrinivas-sn/model-bench-interface` (O1); authenticated via `npx wrangler login` (O2); deployed via `npm run deploy` to live URL `https://model-bench.shrinusn2001.workers.dev`.
- 27/09/2026 — Phase 4 Checkpoint complete: verified all live endpoints (`curl` 200 on `/`, `/matrix`, `/swe-bench`, `/quality`, and 404 on `/nope`). Plan fully executed. Commit: `deploy: live Cloudflare Workers Static Assets release`.
