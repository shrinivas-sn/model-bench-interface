# 30/09/2026 — Real-data upgrade executed

## What happened
- Owner asked for three things: remove AI slop, remove every guessed or estimated benchmark number, and show only current benchmarks from the sites that publish them.
- Wrote and executed `PLAN.md` (5 phases, 16 tasks) in one continuous sequence.
- All 5 phases completed and verified:
  - **Phase 1**: Honest data layer — provider-stated effort lists only, LiveBench categories and Overall computed per published methodology (`livebench-scores.mjs`).
  - **Phase 2**: Current official sources — official Terminal-Bench 4.0 decoded from Next.js RSC flight payload on `tbench.ai`, key-gated official Artificial Analysis API adapter with fallback, automatic LiveBench release auto-discovery, manual alias table (`normalization/manual-aliases.json`).
  - **Phase 3**: Compare page rebuilt on real publisher numbers only with `BenchBlock.tsx` and pure `runsForVariant` helper; deleted synthetic effort scaling, workload estimator, radar chart, and second-hand composites; default pair updated to `claude-fable-5-1-max-effort` vs `gpt-6-astra-max`.
  - **Phase 4**: Retired stale SWE-bench Verified (official board inactive since 26/02/2026); plain copy across page headers, layout metadata, and `README.md`; slop scan clean with `:focus-visible` added to interactive links; durable decisions recorded in `DOCS/CONTEXT/DECISIONS.md`.
  - **Phase 5**: Browser UI verification via `probe/verify-ui.mjs` against Chrome (layout, overflow-x, tap targets, AA contrast, livebench block, terminal-bench block, https source links, honest text check, full 3-stage picker journey, mobile bottom sheet, picked effort tag check, reduced-motion) — 96/96 checks passing.

## Verification results
- Unit tests: 91/91 passing (`npm test`).
- Fixtures: 5/5 passing (`npm run verify:fixtures`).
- TypeScript: `npx tsc --noEmit` clean (0 errors).
- Static build: Next.js 15 export clean (`/`, `/_not-found`, `/matrix`, `/quality`).
- Browser UI probe: 96/96 passing (`npm run verify:ui`).

---

## Archived Plan: PLAN.md (30/09/2026, Published numbers only)

```markdown
# PLAN — Real benchmark data only: remove estimates, add current official sources, de-slop the compare page

**Written 30/09/2026.** Closed on 30/09/2026.

**Goal:** The compare page shows only numbers published by each benchmark's own site (LiveBench, Terminal-Bench 4.0, Artificial Analysis), each with its source and date, with no estimated, scaled or derived scores anywhere, and no generic marketing copy.
**Why:** Owner request 30/09/2026: "remove the ai slop… make the data and benchmark correct from the website where they publish such data… the app is doing some guessing math… eliminate… customized model comparison is our core usage… latest benchmarks, not generic reasoning or coding". Analysis and evidence: `DOCS/WORK/2026-09-30/WORK.md`.
**What this changes:** `ingestion/` (new Terminal-Bench and Artificial Analysis sources, LiveBench release discovery, SWE-bench removed), `normalization/` (new pure modules, `build-data.mjs`), `lib/` (`compare.mjs` new; `cost.mjs` and `benchmarks.mjs` deleted), `components/` (`HeadToHead.tsx` rewritten; `CostEstimator.tsx`, `RadarChart.tsx`, `SweBenchTable.tsx` deleted), `app/` (copy, `/swe-bench` route removed), `store/`, `data/`, `probe/verify-ui.mjs`, `.github/workflows/ingest.yml`, `README.md`, `DOCS/`.
**Done means:** `npm test`, `npm run verify:fixtures`, `npx tsc --noEmit`, `npm run build` and `npm run verify:ui` all pass with 0 failures; `grep -rnE "resolveModelForEffort|EFFORT_WEIGHTS|Derived|isCalculated|swe_bench" app components lib normalization` prints nothing; and the compare page for the default pair shows a LiveBench block and a Terminal-Bench 4.0 block, each linking to its publisher.

## Plan issues
None encountered.

## Decisions
- Benchmarks shown: LiveBench, Terminal-Bench (official board), Artificial Analysis — the independently run, currently updated sources that cover today's models; plus OpenRouter for price and context.
- Lab self-reported scores from model announcements are not shown: they are not independently run and each lab uses its own setup.
- SWE-bench Verified and SWE-Bench Pro are not shown: their official boards stop at 26/02/2026 and 09/07/2026.
- LMArena not added: no official data feed, only third-party scrapes.
- LiveBench category and Overall scores are computed in the app because LiveBench's CSV has task scores only, using exactly LiveBench's published method.
- The compared unit stays a LiveBench row (model + tested effort); models missing from LiveBench cannot be picked.
- A Terminal-Bench or Artificial Analysis number is paired with the picked variant only when its effort matches exactly; otherwise all runs are listed with their effort, never a silent best-of.
- Artificial Analysis names are matched only by existing alias rules; unmatched names wait for owner review on `/quality`.
- Inter stays: recorded design pick (`design-tokens.json`).
- Default pair becomes Claude Fable 5.1 (max) vs GPT-6 Astra (max) because both appear on LiveBench and Terminal-Bench.

## Progress Log
- **30/09/2026 — Phase 1 completed.**
  - Task 1.1: `supportedEffortsFrom` exported and used; OpenRouter relayed `benchmarks` dropped; `external_benchmarks` removed; 77 tests passing.
  - Task 1.2: `livebench-scores.mjs` implemented; `categoryAverages`, `overallScore`, `round2`, `assertTasksCategorised` tested and integrated into `build-data.mjs`, `lib/picker.mjs`, `ModelMatrix.tsx`; 83 tests passing; `npx tsc --noEmit` clean.
- **30/09/2026 — Phase 2 completed.**
  - Task 2.1: `terminal-bench.mjs` (official tbench.ai source via RSC flight decoding), adapter, fixture, tests in `terminal-bench.test.mjs`; 27 runs ingested to `store/terminal-bench.jsonl`.
  - Task 2.2: `manual-aliases.json` & `manual-aliases.mjs` implemented; `store/terminal-bench-2.jsonl` removed; `TerminalBenchRun` type added in `lib/data.ts`; `build-data.mjs` maps official runs.
  - Task 2.3: `artificial-analysis.mjs` (official key-gated API source), adapter, sample fixture, tests in `artificial-analysis.test.mjs`; ingest workflow updated; `lib/data.ts` and `build-data.mjs` updated.
  - Task 2.4: `discoverLatestRelease` and URL builders in `livebench.mjs`; tests in `livebench-release.test.mjs`; `run-all.mjs` and `build-data.mjs` discover and filter to latest release; 98 unit tests passing; all fixtures pass.
- **30/09/2026 — Phase 3 completed.**
  - Task 3.1: `lib/compare.mjs` (`runsForVariant`, `scoreDelta`) and tests in `normalization/test/compare.test.mjs`.
  - Task 3.2: Rebuilt `components/HeadToHead.tsx` and `components/BenchBlock.tsx` on published numbers only; deleted `cost.mjs`, `benchmarks.mjs`, `CostEstimator.tsx`, `RadarChart.tsx` and their tests.
  - Task 3.3: Updated `defaultPair` in `lib/picker.mjs` to lead with `claude-fable-5-1-max-effort` vs `gpt-6-astra-max`; added unit test in `picker-stages.test.mjs`; 91 unit tests passing.
- **30/09/2026 — Phase 4 completed.**
  - Task 4.1: Retired SWE-bench Verified (official board stale since 26/02/2026); deleted SWE-bench routes, components, adapter, fixtures, and store; updated ingestion, data models, Nav, StatusStrip, Quality page.
  - Task 4.2: Plain copy across all page headers, layout metadata, and `README.md`; verified 0 marketing / slop phrases.
  - Task 4.3: Slop registry Tier A/B scan; removed dead CSS classes; added `:focus-visible` to interactive links; clean static build.
  - Task 4.4: Recorded durable decisions in `DOCS/CONTEXT/DECISIONS.md`.
- **30/09/2026 — Phase 5 completed.**
  - Task 5.1: Added benchmark blocks, https source link verification, honest text check, and compare journey test to `probe/verify-ui.mjs`; 96/96 browser checks passing.
  - Task 5.2: Checked origin remote and wrangler status.
  - Task 5.3: Updated `DOCS/STATUS.md`, `DOCS/README.md`, and archived `PLAN.md` in `DOCS/WORK/2026-09-30/WORK.md`.
```
