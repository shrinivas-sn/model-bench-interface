# PLAN — Real benchmark data only: remove estimates, add current official sources, de-slop the compare page

**Written 30/09/2026.** Temporary file — deleted when this closes.

**Goal:** The compare page shows only numbers published by each benchmark's own site (LiveBench, Terminal-Bench 4.0, Artificial Analysis), each with its source and date, with no estimated, scaled or derived scores anywhere, and no generic marketing copy.
**Why:** Owner request 30/09/2026: "remove the ai slop… make the data and benchmark correct from the website where they publish such data… the app is doing some guessing math… eliminate… customized model comparison is our core usage… latest benchmarks, not generic reasoning or coding". Analysis and evidence: `DOCS/WORK/2026-09-30/WORK.md`.
**What this changes:** `ingestion/` (new Terminal-Bench and Artificial Analysis sources, LiveBench release discovery, SWE-bench removed), `normalization/` (new pure modules, `build-data.mjs`), `lib/` (`compare.mjs` new; `cost.mjs` and `benchmarks.mjs` deleted), `components/` (`HeadToHead.tsx` rewritten; `CostEstimator.tsx`, `RadarChart.tsx`, `SweBenchTable.tsx` deleted), `app/` (copy, `/swe-bench` route removed), `store/`, `data/`, `probe/verify-ui.mjs`, `.github/workflows/ingest.yml`, `README.md`, `DOCS/`.
**Done means:** `npm test`, `npm run verify:fixtures`, `npx tsc --noEmit`, `npm run build` and `npm run verify:ui` all pass with 0 failures; `grep -rnE "resolveModelForEffort|EFFORT_WEIGHTS|Derived|isCalculated|swe_bench" app components lib normalization` prints nothing; and the compare page for the default pair shows a LiveBench block and a Terminal-Bench 4.0 block, each linking to its publisher.
**Out of scope:** Comparing 3–4 models at once; LMArena (no official data feed — third-party scrapes only); SWE-bench Pro (Scale's board has not listed a model newer than 09/07/2026); lab self-reported scores from model announcements; changing the font or colour tokens (the recorded design pick stays); a server, database or API route.

---

## Read this first

1. Run `git pull` (a remote exists: `git remote -v` shows `origin`). Work on `main`.
2. Read only: `DOCS/STATUS.md`, this file's **Rules**, **Failure handling**, your current task, and the last Progress Log entry. Do **not** read `store/*.jsonl`, `data/scores.json`, `ingestion/fixtures/**` or `DOCS/WORK/**` whole (large). Query data with `node -e`.
3. Detect the environment — commands, never remembered values:

| Check | Command | Pass looks like |
|---|---|---|
| Node | `node --version` | v22 or newer |
| Tests green before start | `npm test` | `# fail 0` (76 pass on 30/09/2026) |
| Fixture gate | `npm run verify:fixtures` | every line starts `PASS` |
| Build | `npm run build` | exits 0; routes `/`, `/matrix`, `/quality`, `/swe-bench` listed as `○ (Static)` |
| UI checks | `npm run verify:ui` (after a build) | last line `N/N checks passed.` (115/115 on 30/09/2026) |
| Terminal-Bench reachable | `curl -sL -A model-bench-ingest -o NUL -w "%{http_code}" https://www.tbench.ai/` (use `/dev/null` instead of `NUL` in bash) | `200` |
| Artificial Analysis key present (Task 2.3) | `node -e "console.log(Boolean(process.env.ARTIFICIAL_ANALYSIS_API_KEY))"` | `true` — else Owner input O1 |
| Wrangler logged in (Task 5.2) | `npx wrangler whoami` | an account name — else Owner input O2 |

4. A task's **Where:** uses search text, not line numbers. If the text is missing, the code moved: find the equivalent, apply the same intent, and log it under Plan issues.
5. `npm run build` also rewrites `data/scores.json` (its `generated_at` changes). Commit that file only in tasks that say so; otherwise restore it with `git checkout -- data/scores.json` before committing.

## Facts verified while planning

| Fact | Source | Checked on |
|---|---|---|
| Invented scores: `resolveModelForEffort` shifts category scores by `3.0 * log2(ratio)` and task scores by `2.5 * log2(ratio)` for effort levels LiveBench never tested, using made-up `EFFORT_WEIGHTS` (`low: 0.20` … `max: 3.20`) | `lib/cost.mjs` search `export const EFFORT_WEIGHTS` and `const logRatio` | 30/09/2026 |
| Default token counts `?? 1500` input / `?? 15000` output are used when a model has no measured tokens | `lib/cost.mjs` search `avg_input_tokens ?? 1500` | 30/09/2026 |
| `HeadToHead.tsx` is the only importer of `lib/cost.mjs`, `RadarChart`, `CostEstimator`; `lib/benchmarks.mjs` is imported only by its test (dead code) | `grep -rn "lib/cost\|lib/benchmarks\|RadarChart\|CostEstimator" app components lib normalization probe` | 30/09/2026 |
| `build-data.mjs` assumes `["max","high","medium","low"]` for any OpenRouter model whose `supported_parameters` includes `reasoning_effort` | `normalization/build-data.mjs` search `? ["max", "high", "medium", "low"]` | 30/09/2026 |
| OpenRouter's catalog relays Artificial Analysis and Design Arena numbers in a `benchmarks` field (second-hand; `coding_index`/`agentic_index` null for `anthropic/claude-opus-5.5`) | `curl -s https://openrouter.ai/api/v1/models` → 255 of 464 models have `benchmarks` | 30/09/2026 |
| The app computes a "mean of categories" in two places: `lib/picker.mjs` (search `Overall category mean`) and `components/ModelMatrix.tsx` (search `function meanOf`) | files | 30/09/2026 |
| LiveBench's own site computes **category = mean of that category's task scores (missing tasks skipped)** and **Overall = mean of the category averages**, rounded to 2 decimals for display | `https://livebench.ai/static/js/main.b9b5570a.js`: `const Se=(e,n,t)=>{…a.reduce(…)/a.length…}` and tooltip text `"Overall — mean of category averages"` | 30/09/2026 |
| LiveBench newest published release is `2026-06-25` (`table_2026_06_25.csv` = 200; `table_2026_07_22.csv` and `table_2026_09_10.csv` = 404 even though those dates appear in the bundle) | `curl -s -o /dev/null -w "%{http_code}" https://livebench.ai/table_<date>.csv` | 30/09/2026 |
| LiveBench records already carry a `release` field; score `source_id` is `<model>::<task>` | `ingestion/sources/livebench.mjs` search `release: RELEASE` | 30/09/2026 |
| Current LiveBench task → category map (7 categories) is hard-coded and matches `categories_2026_06_25.json` | `normalization/categories.mjs` search `LIVEBENCH_CATEGORIES` | 30/09/2026 |
| **Terminal-Bench's official board is now Terminal-Bench 4.0.** `https://www.tbench.ai/` (every `/leaderboard/...` URL redirects there) embeds it in the Next.js flight payload (`self.__next_f.push([1,"…"])` chunks): one object `"leaderboard":{"id":"9f966760-…","title":"Terminal-Bench 4.0",…}` and 27 run objects `{"id","leaderboard_id","rank","metadata":{"date","agent_org":{"label"},"model_org":{"label"},"agent_display":{"label"},"model_display":{"label","url"},"reasoning_effort"},"metrics":{"accuracy","n_trials","total_cost_usd","accuracy_ci95_half_width",…},"status":"display",…}`. No robots.txt (404). A `User-Agent: model-bench-ingest` request returns 200 after redirect | `curl -sL -A model-bench-ingest https://www.tbench.ai/` decoded with the algorithm in Task 2.1 | 30/09/2026 |
| Terminal-Bench 4.0 run example: GPT-6 Astra · Codex · effort `max` · accuracy 58.18 · ±2.79 · 330 trials · $3,267.18 · 2026-09-03 | same | 30/09/2026 |
| The existing matcher (`resolveAlias` with `"<model_org> <model_display>"`, then `"<model_display>"`) links 17 of 27 Terminal-Bench 4.0 runs; the 10 misses are Anthropic labels without "Claude": `Fable 5.1`, `Fable 5`, `Opus 5`, `Opus 4.8`, `Sonnet 5`. Catalog ids exist for all five: `anthropic/claude-fable-5.1`, `anthropic/claude-fable-5`, `anthropic/claude-opus-5`, `anthropic/claude-opus-4.8`, `anthropic/claude-sonnet-5` | match script run over the decoded payload and `data/scores.json` catalog | 30/09/2026 |
| The app's current Terminal-Bench numbers are a **2.0** snapshot copied from BenchLM (third-party) on 27/09/2026 | `normalization/build-data.mjs` search `BenchLM's aggregation`; file `store/terminal-bench-2.jsonl` | 30/09/2026 |
| SWE-bench Verified's official data (`raw.githubusercontent.com/SWE-bench/swe-bench.github.io/master/data/leaderboards.json`) was last updated 2026-02-26 (newest entry: Gemini 3 Pro); no current frontier model is on it | fetched and sorted by `date` | 30/09/2026 |
| Artificial Analysis free API: `GET https://artificialanalysis.ai/api/v2/language/models/free?page=N`, header `x-api-key`, 1,000 requests/day, fixed page size 200, response `{tier, intelligence_index_version, pagination:{page,page_size,total_pages,has_more}, data:[…]}`. Model: `id`, `name` (effort in brackets, e.g. `"gpt-oss-20B (high)"`), `slug`, `release_date`, `model_creator.name`, `evaluations.artificial_analysis_intelligence_index` / `_coding_index` / `_agentic_index`, `pricing.price_1m_input_tokens` / `price_1m_output_tokens`, `performance.median_output_tokens_per_second` / `median_time_to_first_token_seconds`. Individual benchmarks (GPQA, HLE…) are paid-tier only. **Attribution is required** wherever the data is shown | https://artificialanalysis.ai/data-api/docs, https://artificialanalysis.ai/api-reference | 30/09/2026 |
| Adapter rules: `access.kind` must be `json-api` (the only kind); `access.tier` integer 0–5; `map` must contain `source_id` and `url`; normalizers in use: `text`, `number`, `iso-date`, `bool` | `node_modules/@shrinivas-sn/adapter-ingestion/src/config.mjs` search `const KINDS`; `ingestion/adapters/swe-bench-verified.adapter.json` | 30/09/2026 |
| Access tiers (owner's adapter framework): 0 official API, 1 undocumented CMS API, 2 feeds/JSON-LD, 3 consistent server-rendered HTML, 4 headless browser, 5 PDF/LLM | `C:\Users\Dell\.claude\skills\generate-adapter\SKILL.md` search `Access ladder` | 30/09/2026 |
| Source pattern: each `ingestion/sources/<name>.mjs` exports `ADAPTER_URL` and `makeFetchImpl()` returning a fetch that converts the source into a flat JSON array `Response`; fixtures store that transformed shape | `ingestion/sources/swe-bench.mjs`, `ingestion/capture-fixtures.mjs` | 30/09/2026 |
| `run-all.mjs` job list: search `const JOBS = [`; `verify-fixtures.mjs` list: search `const ADAPTERS = [`; freshness counts any outcome other than `error`/`failed`/`stale` as healthy | files; `lib/status.mjs` search `const failed = entries.filter` | 30/09/2026 |
| `npm test` runs `node --test ingestion/test/*.test.mjs normalization/test/*.test.mjs`; `ingestion/test/` does not exist yet. Test counts per file: benchmarks 3, cost 8, effort 14, picker-groups 1, picker-stages 25, registry 13, status 12 (= 76) | `package.json`; `grep -cE "^\s*(test\|it)\("` per file | 30/09/2026 |
| Baseline 30/09/2026: `npm test` 76/76, `npm run build` 5 static routes, `npm run verify:ui` 115/115 | commands run | 30/09/2026 |
| `probe/verify-ui.mjs` serves `./out`, loops `const ROUTES = ["/", "/matrix", "/swe-bench", "/quality"];` and checks contrast on a selector list containing `".swe-link"` | file | 30/09/2026 |
| Default pair today: `claude-opus-5-5-max-effort` vs `gpt-5.5-xhigh` — **neither is on Terminal-Bench 4.0**. `claude-fable-5-1-max-effort` and `gpt-6-astra-max` are both on LiveBench and both on Terminal-Bench 4.0 | `lib/picker.mjs` search `export function defaultPair`; LiveBench model list; decoded Terminal-Bench runs | 30/09/2026 |
| LiveBench effort rule: bare trailing `-max` is `null` ("effort not stated") because it is also a product tier, so `gpt-6-astra-max` has `effort: null` | `normalization/effort.mjs`; decision in old plan (archived) | 30/09/2026 |
| Recorded typography pick is `inter-jetbrains` (Inter via `next/font/google`) — Inter is on the slop list, but changing it is a design pick, so it stays in this plan | `design-tokens.json`; `app/layout.tsx` | 30/09/2026 |
| Live URL in `DOCS/STATUS.md` is `https://model-bench.shrinu.workers.dev`; the archived plan's log says `https://model-bench.shrinusn2001.workers.dev`. Read the real one from `npm run deploy` output | both files | 30/09/2026 |
| Cloudflare Workers Builds (auto-redeploy on push) was never connected (old plan's O3 unchecked), so the daily data commit does not reach the live site | archived plan, `DOCS/STATUS.md` Pending | 30/09/2026 |

## Rules for every task

- **Honest-data rule (the point of this plan):** every number on screen is either copied from a publisher or is plain arithmetic on two published numbers in the same row (the A−B difference). Never estimate, scale, fill in, average across different benchmarks, or pick a "best of" without showing which run it is. Unknown stays `null` and shows as the exact text `Not on this leaderboard` (score missing) or `effort not stated` (effort missing).
- Every benchmark block names its publisher, links to it, and shows its version or release date.
- Never guess a model-name match. Matching happens only through `resolveAlias` rules or the reviewed table in `normalization/manual-aliases.json`. Add entries to that table **only** where this plan lists them. Anything else stays unmatched and appears on `/quality`.
- Never write an API key into any file, commit, log line or Progress Log entry. Read it only from `process.env.ARTIFICIAL_ANALYSIS_API_KEY`.
- Plain CSS with the existing `:root` tokens in `app/globals.css`. No Tailwind, no new colour values outside `:root`, no new fonts.
- Every animation respects `prefers-reduced-motion: reduce` (existing global rule — do not remove it).
- The site stays a static export: no API routes, no `middleware.ts`, no server actions.
- One task, one commit, using the message given. Commit on `main`. Never force-push. Push only in Task 5.2.
- Tests are read-only except assertions a task's **Don't touch** puts on its may-change list. Never weaken an assertion to make it pass.
- Before each commit: `npm test` passes. After Phase 1, `npx tsc --noEmit` passes too, except where a task says tsc is expected to fail until a later task in the same phase.

## Failure handling

| Situation | Do this |
|---|---|
| TypeScript error after a change | Fix the type at its source in `lib/data.ts`; never `any` or `@ts-ignore`. |
| `npm run build` fails with `PageNotFoundError` or stale chunks | Delete `.next` and `out` (`node -e "for (const d of ['.next','out']) require('fs').rmSync(d,{recursive:true,force:true})"`) and rebuild. |
| `verify:fixtures` prints `FAIL <name>` | Re-run `node ingestion/capture-fixtures.mjs`, then `npm run verify:fixtures`; if it still fails, compare the fixture fields with the adapter `map` paths and fix the adapter. |
| `validateAdapter` rejects the Terminal-Bench adapter because `url` repeats across records | Change the source's `page_url` to `https://www.tbench.ai/?run=<source_id>`; log it under Plan issues. |
| Terminal-Bench page returns no `"leaderboard":{` object or 0 runs | The site changed shape. Save the HTML to `ingestion/test/fixtures/tbench-home.html`, record under Plan issues what the payload now looks like, skip Tasks 2.1–2.2, and continue with 2.3 and 2.4. The compare page must then show no Terminal-Bench block (never the old 2.0 numbers). |
| Artificial Analysis returns 401/403 | Key missing or wrong: Owner input O1. Continue with other tasks; the page renders without the Artificial Analysis block. |
| Artificial Analysis returns 429 | Daily limit reached. Stop calling it for this session; use the fixture for tests; note it in the Progress Log. |
| `npm run verify:ui` fails a check | Read the failing line; fix the page, not the check — unless the check targets something this plan deliberately removed (then update the check in Task 5.1 and say so in the commit body). |
| Anything else fails | Fix and retry at most three times. Then set the work aside (`git stash`), record the real output in the Progress Log, and continue with the next independent task. Retry once at phase end. |
| The plan itself looks wrong | Follow **Plan issues** below — decide by impact, never freeze the whole plan. |
| Owner-only actions | O1 API key, O2 wrangler login, O3 Cloudflare dashboard, O4 push + deploy confirmation — ask once, continue other tasks. |

---

## Phase 1 — Honest data layer

**Purpose:** The data file stops carrying invented effort lists and second-hand scores, and LiveBench numbers are computed exactly the way LiveBench computes them.
**Starts when:** now.
**Re-check first:** none.

### Task 1.1 — Effort lists only when the provider states them; drop second-hand benchmarks

**Goal:** `data/scores.json` never lists an effort level the provider did not publish, and no longer carries OpenRouter's relayed `benchmarks` field.
**Why:** `["max","high","medium","low"]` is assumed for any reasoning model — an invention. The relayed Artificial Analysis numbers are second-hand; Task 2.3 reads them from the publisher.
**Where:** `normalization/effort.mjs` (search `export function stripEffort`); `normalization/build-data.mjs` (search `const supported_efforts =`); `ingestion/adapters/openrouter.adapter.json` (search `"benchmarks": { "path": "benchmarks" }`); `lib/data.ts` (search `export type CatalogModel`)
**Do:**
- [ ] In `effort.mjs` export `supportedEffortsFrom(fields) → string[] | null`: return `fields.reasoning.supported_efforts` when it is a non-empty array, otherwise `null`. No other fallback.
- [ ] In `build-data.mjs` replace the `supported_efforts` expression with `supportedEffortsFrom(f)`.
- [ ] In `build-data.mjs` `buildCatalog`, delete the `benchmarks: f.benchmarks || null,` property; in the LiveBench join loop delete the `if (c?.benchmarks) { m.external_benchmarks = … }` block.
- [ ] In `build-data.mjs` join loop change `m.supported_efforts = c?.supported_efforts || (m.effort ? [m.effort] : null);` to `m.supported_efforts = c?.supported_efforts ?? null;` and `m.default_effort = c?.default_effort || m.effort || null;` to `m.default_effort = c?.default_effort ?? null;`.
- [ ] Remove the `"benchmarks"` line from the OpenRouter adapter `map` (fix the trailing comma on the line above).
- [ ] In `lib/data.ts` remove `benchmarks?` from `CatalogModel` and `external_benchmarks?` from `LivebenchModel`.
- [ ] Run `npm run build:data`.
**Test first:** in `normalization/test/effort.test.mjs` add 3 tests: `supportedEffortsFrom({ reasoning: { supported_efforts: ["high","low"] } })` → `["high","low"]`; `supportedEffortsFrom({ supported_parameters: ["reasoning_effort"] })` → `null`; `supportedEffortsFrom({})` → `null`.
**Verify:** `npm test` → `# fail 0`, and the 3 new tests are listed as `ok`; `node -e "const d=require('./data/scores.json');console.log(d.catalog.some(m=>'benchmarks' in m), d.livebench.some(m=>'external_benchmarks' in m))"` → `false false`; `npm run verify:fixtures` → all `PASS`.
**Don't touch:** `lib/benchmarks.mjs` and its test (deleted in Task 3.2); `registry.mjs`. May-change list: none.
**If it fails:** If `tsc` complains about `external_benchmarks`, the only reader is `lib/benchmarks.mjs` (plain JS, not type-checked) — confirm with `grep -rn external_benchmarks app components lib`, fix any TS reader by deleting the read.
**Commit:** `fix(data): list effort levels only when the provider publishes them; drop relayed benchmarks`

### Task 1.2 — LiveBench categories and Overall, computed exactly as LiveBench does

**Goal:** Each LiveBench row carries `categories` (mean of that category's task scores) and `overall` (mean of all category averages, `null` if any category is missing), both rounded to 2 decimals only at output; the picker and the All-models table read `overall` instead of computing their own.
**Why:** LiveBench publishes these numbers this way on its site; the app currently recomputes a mean in two places with its own rounding.
**Where:** new `normalization/livebench-scores.mjs`; `normalization/build-data.mjs` (search `const catScores = {};`); `lib/data.ts` (search `export type LivebenchModel`); `lib/picker.mjs` (search `Overall category mean`); `components/ModelMatrix.tsx` (search `function meanOf`)
**Do:**
- [ ] `livebench-scores.mjs` exports `categoryAverages(tasks, categoryMap) → Record<string, number>`: for each `[category, taskNames]` of `categoryMap`, average the numeric `tasks[t]` values (skip missing/non-numeric); omit the category when none are present. No rounding.
- [ ] Export `overallScore(averages, categoryNames) → number | null`: `null` unless every name in `categoryNames` has a number in `averages`; else their mean. No rounding.
- [ ] Export `round2(x) → number | null` (`null` stays `null`; else `Number(x.toFixed(2))`).
- [ ] Export `assertTasksCategorised(taskNames, categoryMap) → void`: throw `Error("LiveBench tasks without a category: <comma list> — update normalization/categories.mjs from categories_<release>.json")` if any task is in no category.
- [ ] In `build-data.mjs` replace the inline `catScores` loop with: `const avg = categoryAverages(taskObj, LIVEBENCH_CATEGORIES)`; `categories[capabilityForLivebenchCategory(cat) || cat] = round2(avg[cat])` for each key of `avg`; `overall: round2(overallScore(avg, Object.keys(LIVEBENCH_CATEGORIES)))` on the pushed row. Call `assertTasksCategorised` once with every task seen.
- [ ] Add `overall: number | null;` to `LivebenchModel` in `lib/data.ts`.
- [ ] `lib/picker.mjs`: set `overallScore = primary.overall ?? null` and delete the local averaging block.
- [ ] `components/ModelMatrix.tsx`: delete `meanOf`; use `m.overall`. Rename the sort label that mentions "mean" to `LiveBench overall, high → low`, and the column header showing the mean to `LiveBench overall`.
- [ ] Run `npm run build:data`; commit the regenerated `data/scores.json`.
**Test first:** new `normalization/test/livebench-scores.test.mjs`: (1) `categoryAverages({a:80,b:60,c:90},{X:["a","b"],Y:["c","d"]})` → `{X:70,Y:90}`; (2) task missing from all → category omitted: `categoryAverages({a:80},{X:["a"],Y:["z"]})` → `{X:80}`; (3) `overallScore({X:70,Y:90},["X","Y"])` → `80`; (4) `overallScore({X:70},["X","Y"])` → `null`; (5) `round2(71.23456)` → `71.23`; (6) `assertTasksCategorised(["a","q"],{X:["a"]})` throws with message containing `q`.
**Verify:** `npm test` → `# fail 0`, and the 6 new tests are listed as `ok`; `node -e "const d=require('./data/scores.json');const m=d.livebench.find(x=>x.benchmark_name==='gpt-6-astra-max');console.log(m.overall, Object.keys(m.categories).length)"` → a number and `7`; `npx tsc --noEmit` → no output.
**Don't touch:** `normalization/categories.mjs` mapping values; `picker-groups.test.mjs` and `picker-stages.test.mjs` assertions. May-change list: fixture objects inside `picker-groups.test.mjs` and `picker-stages.test.mjs` may gain an `overall` property (add, never remove, existing properties) if a test needs it to keep its original meaning.
**If it fails:** If a picker test fails because fixtures have no `overall`, add `overall` to those fixture objects equal to the mean their old code produced (e.g. `categories: { coding: 80, math: 70 }` → `overall: 75`) and log it.
**Commit:** `feat(data): LiveBench category and overall scores computed exactly as livebench.ai does`

### Checkpoint — Phase 1

- [ ] Full verification: `npm test && npm run verify:fixtures && npx tsc --noEmit && npm run build` → all pass, exits 0.
- [ ] Commit made for every task in this phase.
- [ ] Status file updated: `DOCS/STATUS.md` → Current state gains "Effort lists only as published; LiveBench overall/categories computed as livebench.ai does (PLAN.md Phase 1 done 〈date〉)". Next up → "PLAN.md Phase 2".
- [ ] Progress Log entry added.

A new session may start here.

---

## Phase 2 — Current official sources

**Purpose:** Terminal-Bench 4.0 and Artificial Analysis come straight from their publishers, and LiveBench always uses its newest release.
**Starts when:** Phase 1 checkpoint done.
**Re-check first:** `curl -sL -A model-bench-ingest https://www.tbench.ai/ | grep -c "leaderboard_id"` → a number ≥ 10. If `0`, follow the Terminal-Bench row in **Failure handling**. Artificial Analysis key check from **Read this first** — if `false`, do Task 2.3's code, tests and workflow change with the fixture it describes, mark its live-capture steps "waiting on O1", and continue.

### Task 2.1 — Terminal-Bench source (official leaderboard)

**Goal:** `npm run ingest` writes the current official Terminal-Bench runs to `store/terminal-bench.jsonl`.
**Why:** The app shows a third-party copy of the old 2.0 board; the publisher's page carries 4.0 with agent, effort, confidence range and cost per run.
**Where:** new `ingestion/sources/terminal-bench.mjs`, new `ingestion/adapters/terminal-bench.adapter.json`, new `ingestion/test/terminal-bench.test.mjs`, new `ingestion/test/fixtures/tbench-home.html`; `ingestion/run-all.mjs` (search `const JOBS = [`); `ingestion/verify-fixtures.mjs` (search `const ADAPTERS = [`); `ingestion/capture-fixtures.mjs` (search `const LIMITS = {`)
**Do:**
- [ ] `terminal-bench.mjs` exports `ADAPTER_URL = "https://www.tbench.ai/"` and `PAGE_URL = "https://www.tbench.ai/"`.
- [ ] Export `decodeFlight(html) → string`: find each occurrence of the literal `self.__next_f.push([1,"`; from there read characters until an unescaped `"` (a backslash escapes the next character); `JSON.parse('"' + literal + '"')`; join all decoded chunks in page order.
- [ ] Export `readJsonObjectAt(text, start) → object`: `text[start]` is `{`; scan forward counting `{`/`}` **outside JSON strings** (track in-string and backslash-escape state) until depth returns to 0; `JSON.parse` that slice.
- [ ] Export `extractLeaderboard(payload) → { title, runs } | null`: find `"leaderboard":{"id":"`; read the object after `"leaderboard":` with `readJsonObjectAt`; its `title` and `id`. Then find every `"leaderboard_id":"<that id>"`; for each, the run object starts at the nearest preceding `{"id":"`; read it; keep runs whose `status === "display"`; de-duplicate by `id`. Return `null` if no leaderboard object.
- [ ] Export `toItems(board) → object[]`, one per run: `source_id: run.id`, `page_url: PAGE_URL`, `leaderboard_title: board.title`, `model_label: run.metadata.model_display?.label ?? null`, `model_org: run.metadata.model_org?.label ?? null`, `agent_label: run.metadata.agent_display?.label ?? null`, `agent_org: run.metadata.agent_org?.label ?? null`, `reasoning_effort: run.metadata.reasoning_effort ?? null`, `accuracy: run.metrics.accuracy`, `ci95_half_width: run.metrics.accuracy_ci95_half_width ?? null`, `n_trials: run.metrics.n_trials ?? run.n_trials ?? null`, `total_cost_usd: run.metrics.total_cost_usd ?? null`, `date: run.metadata.date ?? null`.
- [ ] Export `makeFetchImpl()` following `ingestion/sources/swe-bench.mjs`: fetch with `User-Agent: model-bench-ingest`; pass non-OK responses through; `extractLeaderboard(decodeFlight(await res.text()))`; if `null` return `new Response(JSON.stringify({ error: "terminal-bench leaderboard not found in page" }), { status: 502 })`; else a 200 JSON `Response` of `toItems(board)`.
- [ ] Adapter file, exact content:
  ```json
  {
    "version": 1,
    "host": "www.tbench.ai",
    "access": { "tier": 3, "kind": "json-api", "url": "https://www.tbench.ai/" },
    "fetch": { "method": "GET", "timeout_ms": 60000, "max_records": 500, "max_response_bytes": 20971520 },
    "records_path": "$",
    "map": {
      "source_id": { "path": "source_id" },
      "url": { "path": "page_url" },
      "title": { "path": "model_label", "normalize": "text" },
      "leaderboard_title": { "path": "leaderboard_title", "normalize": "text" },
      "model_org": { "path": "model_org", "normalize": "text" },
      "agent_label": { "path": "agent_label", "normalize": "text" },
      "agent_org": { "path": "agent_org", "normalize": "text" },
      "reasoning_effort": { "path": "reasoning_effort", "normalize": "text" },
      "accuracy": { "path": "accuracy", "normalize": "number" },
      "ci95_half_width": { "path": "ci95_half_width", "normalize": "number" },
      "n_trials": { "path": "n_trials", "normalize": "number" },
      "total_cost_usd": { "path": "total_cost_usd", "normalize": "number" },
      "run_date": { "path": "date", "normalize": "iso-date" }
    },
    "required": ["title", "accuracy", "leaderboard_title"],
    "canary": { "min_records": 10, "median_window": 5, "count_drop_ratio": 0.4, "required_field_ratio": 0.9 }
  }
  ```
- [ ] Save the live page as the test fixture: `curl -sL -A model-bench-ingest https://www.tbench.ai/ -o ingestion/test/fixtures/tbench-home.html`.
- [ ] `run-all.mjs`: import `makeFetchImpl as terminalBenchFetch` and add `{ name: "terminal-bench", adapterFile: "terminal-bench.adapter.json", fetchImpl: terminalBenchFetch() }` to `JOBS`; update the header comment's source count.
- [ ] `verify-fixtures.mjs`: add `"terminal-bench.adapter.json"` to `ADAPTERS`.
- [ ] `capture-fixtures.mjs`: add `"terminal-bench": 6` to `LIMITS` and a job that fetches `ADAPTER_URL` with the same header, runs `toItems(extractLeaderboard(decodeFlight(text)))` and slices to the limit. Run `node ingestion/capture-fixtures.mjs` (it rewrites other fixtures too — keep only the new `ingestion/fixtures/terminal-bench/sample-1.json` and restore the others with `git checkout -- ingestion/fixtures`, then re-add the new folder).
- [ ] Run `npm run ingest` and commit `store/terminal-bench.jsonl` and `data/freshness.json`.
**Test first:** `ingestion/test/terminal-bench.test.mjs`: (1) `decodeFlight('<script>self.__next_f.push([1,"a:{\\"x\\":"])</script><script>self.__next_f.push([1,"1}\\n"])</script>')` → `'a:{"x":1}\n'` (write the input so the page text contains `\"` escapes, as in the real page); (2) `readJsonObjectAt('z{"a":"}{","b":{"c":1}}tail', 1)` → `{ a: "}{", b: { c: 1 } }`; (3) with the saved `tbench-home.html`: `extractLeaderboard(decodeFlight(html))` → `title` matches `/^Terminal-Bench \d/`, `runs.length >= 10`, ids unique; (4) `toItems` on that board → every item has a number `accuracy` between 0 and 100 and a string `model_label`.
**Verify:** `npm test` → `# fail 0`, and the new Terminal-Bench tests are listed as `ok`; `npm run verify:fixtures` → `PASS terminal-bench: parsed 6/6 (ratio 1.00)`; `npm run ingest` → a line `OK   terminal-bench: ok`.
**Don't touch:** other adapters and sources; `store/terminal-bench-2.jsonl` (removed in 2.2). May-change list: none.
**If it fails:** see **Failure handling** rows for Terminal-Bench and `validateAdapter`.
**Commit:** `feat(ingest): Terminal-Bench leaderboard from tbench.ai (official, currently 4.0)`

### Task 2.2 — Reviewed alias table and Terminal-Bench rows in the data

**Goal:** `data/scores.json` has `terminal_bench` = every official run with its matched model id, and the BenchLM 2.0 snapshot is gone.
**Why:** The compare page needs runs keyed to models; five Anthropic labels need a reviewed alias because the site omits "Claude".
**Where:** new `normalization/manual-aliases.json`, new `normalization/manual-aliases.mjs`; `normalization/build-data.mjs` (search `// ---------- Terminal-Bench 2.0 ----------`); `lib/data.ts` (search `export type TerminalBenchRow`); delete `store/terminal-bench-2.jsonl`
**Do:**
- [ ] `manual-aliases.json`, exact content:
  ```json
  {
    "terminal-bench": {
      "Anthropic|Fable 5.1": "anthropic/claude-fable-5.1",
      "Anthropic|Fable 5": "anthropic/claude-fable-5",
      "Anthropic|Opus 5": "anthropic/claude-opus-5",
      "Anthropic|Opus 4.8": "anthropic/claude-opus-4.8",
      "Anthropic|Sonnet 5": "anthropic/claude-sonnet-5"
    },
    "artificial-analysis": {}
  }
  ```
- [ ] `manual-aliases.mjs` exports `resolveSourceModel({ aliasIndex, manual, source, org, label }) → { canonical, method } | null`: (1) `manual[source]?.[`${org}|${label}`]` → `{ canonical, method: "manual" }`; (2) `resolveAlias(aliasIndex, [org, label].filter(Boolean).join(" "))`; (3) `resolveAlias(aliasIndex, label ?? "")`; else `null`.
- [ ] In `build-data.mjs` replace `terminalBenchRows()` so it reads `store/terminal-bench.jsonl` with `readLatestRecords` and returns rows `{ run_id, canonical_id, alias_method, model_label, model_org, agent_label, reasoning_effort, accuracy, ci95_half_width, n_trials, total_cost_usd, run_date, leaderboard_title }` (all from `fieldsOf(rec)`; `run_id` = `f.source_id || rec.source_id`), sorted by `accuracy` descending, plus `unmatched` = labels with no match. Skip records whose `leaderboard_title` differs from the newest one present (keeps an old board out if the site moves to a new version).
- [ ] Top level of `scores.json`: `terminal_bench: rows`, `sources.terminal_bench: { title: <leaderboard_title>, url: "https://www.tbench.ai/" }`; `data_quality.counts.terminal_bench_runs` and `terminal_bench_matched`; `data_quality.unmatched.terminal_bench`.
- [ ] Replace `TerminalBenchRow` in `lib/data.ts` with:
  ```ts
  export type TerminalBenchRun = {
    run_id: string;
    canonical_id: string | null;
    alias_method: string | null;
    model_label: string;
    model_org: string | null;
    agent_label: string | null;
    reasoning_effort: string | null;
    accuracy: number;
    ci95_half_width: number | null;
    n_trials: number | null;
    total_cost_usd: number | null;
    run_date: string | null;
    leaderboard_title: string;
  };
  ```
  Add to `ScoresData`: `terminal_bench: TerminalBenchRun[]`, `sources: { livebench: { release: string; url: string }; terminal_bench: { title: string; url: string } | null; artificial_analysis: { connected: boolean; url: string; fetched_at?: string | null } }`, and the new count/unmatched keys. (`sources.livebench` is filled in Task 2.4 — until then set `{ release: "2026-06-25", url: "https://livebench.ai/" }`; `artificial_analysis` is `{ connected: false, url: "https://artificialanalysis.ai/" }` until Task 2.3.)
- [ ] `git rm store/terminal-bench-2.jsonl`.
- [ ] Update `components/HeadToHead.tsx` imports only as far as needed to compile (it is rewritten in Task 3.2): replace `TerminalBenchRow` with `TerminalBenchRun` and `resolved_pct` with `accuracy`; replace the label `Terminal-Bench 2.0` with `{row.leaderboard_title}`.
- [ ] Run `npm run build:data`; commit `data/scores.json`.
**Test first:** new `normalization/test/manual-aliases.test.mjs`: build an alias index from `[{source_id:"anthropic/claude-fable-5.1",title:"Anthropic: Claude Fable 5.1"},{source_id:"openai/gpt-6-astra",title:"OpenAI: GPT-6 Astra"}]` with `buildAliasIndex`; (1) `source:"terminal-bench", org:"Anthropic", label:"Fable 5.1"` with the JSON table → `{canonical:"anthropic/claude-fable-5.1", method:"manual"}`; (2) `org:"OpenAI", label:"GPT-6 Astra"` → canonical `openai/gpt-6-astra`, method not `manual`; (3) `org:"Anthropic", label:"Haiku 9"` → `null`.
**Verify:** `npm test` → `# fail 0`, and the 3 new alias tests are listed as `ok`; `node -e "const d=require('./data/scores.json');const q=d.data_quality;console.log(d.sources.terminal_bench.title, q.counts.terminal_bench_runs, q.counts.terminal_bench_matched, q.unmatched.terminal_bench)"` → `Terminal-Bench 4.0 27 27 []` (numbers may be higher if new runs were added; matched must equal runs unless a new label appeared — then it is listed, never guessed); `npx tsc --noEmit` → no output.
**Don't touch:** `normalization/registry.mjs` and `registry.test.mjs`. May-change list: none.
**If it fails:** If a new run label is unmatched, leave it unmatched (it shows on `/quality`) and log it under Plan issues for the owner — do not add an alias.
**Commit:** `feat(data): official Terminal-Bench runs with reviewed aliases; drop third-party 2.0 snapshot`

### Task 2.3 — Artificial Analysis source (official API, key required)

**Goal:** When `ARTIFICIAL_ANALYSIS_API_KEY` is set, ingest writes Artificial Analysis indices, prices and speed per model to `store/artificial-analysis.jsonl`; when it is not set, ingest skips it without failing.
**Why:** It is the most-checked independent index site; the app had its numbers only second-hand, missing coding and agentic indices.
**Where:** new `ingestion/sources/artificial-analysis.mjs`, new `ingestion/adapters/artificial-analysis.adapter.json`, new `ingestion/test/artificial-analysis.test.mjs`, new `ingestion/fixtures/artificial-analysis/sample-1.json`; `ingestion/run-all.mjs`; `ingestion/verify-fixtures.mjs`; `.github/workflows/ingest.yml` (search `- name: Ingest all sources`); `normalization/build-data.mjs`; `lib/data.ts`
**Do:**
- [ ] Source exports `ADAPTER_URL = "https://artificialanalysis.ai/api/v2/language/models/free"`, `PAGE_URL = "https://artificialanalysis.ai/"`, `KEY_ENV = "ARTIFICIAL_ANALYSIS_API_KEY"`.
- [ ] Export `toItem(model)` → `{ source_id: model.id, page_url: PAGE_URL, name: model.name, slug: model.slug ?? null, creator: model.model_creator?.name ?? null, release_date: model.release_date ?? null, intelligence_index: model.evaluations?.artificial_analysis_intelligence_index ?? null, coding_index: model.evaluations?.artificial_analysis_coding_index ?? null, agentic_index: model.evaluations?.artificial_analysis_agentic_index ?? null, price_in: model.pricing?.price_1m_input_tokens ?? null, price_out: model.pricing?.price_1m_output_tokens ?? null, output_tps: model.performance?.median_output_tokens_per_second ?? null, ttft_s: model.performance?.median_time_to_first_token_seconds ?? null }`.
- [ ] Export `makeFetchImpl(apiKey)`: request `${url}?page=${n}` for `n = 1, 2, …` with headers `x-api-key: apiKey`, `Accept: application/json`, `User-Agent: model-bench-ingest`; stop when `pagination.has_more` is not `true` or after page 20; pass the first non-OK response through; return a 200 JSON `Response` of all `data.map(toItem)`.
- [ ] Export `splitEffort(name) → { base, effort }`: if `name` ends with ` (<x>)` and lowercase `<x>` is one of `max`, `xhigh`, `high`, `medium`, `low`, return `{ base: name without that suffix, effort: <x> }`; otherwise `{ base: name, effort: null }`.
- [ ] Adapter: copy the Terminal-Bench adapter shape with `"host": "artificialanalysis.ai"`, `"access": { "tier": 0, "kind": "json-api", "url": "https://artificialanalysis.ai/api/v2/language/models/free" }`, map `source_id`, `url` (← `page_url`), `title` (← `name`, text), `creator`, `slug`, `release_date` (iso-date), and the 7 numeric fields (number); `"required": ["title"]`; canary `min_records: 20`.
- [ ] Fixture `ingestion/fixtures/artificial-analysis/sample-1.json`: if the key is set, capture 6 real items via a new `capture-fixtures.mjs` job (skip that job when the key is unset); if not set, write one item built from the documented example (`name: "gpt-oss-20B (high)"`, `slug: "gpt-oss-20b"`, creator `OpenAI`, indices 24.5 / 18.5 / 27.6, prices 0.06 / 0.2, `output_tps` 296.47, `ttft_s` 0.65, `release_date` `2025-08-05`, `source_id` `36f73aaf-d38a-4b56-a2b3-d04d17186910`, `page_url` `https://artificialanalysis.ai/`) and log "fixture from docs example, replace after O1" in the Progress Log.
- [ ] `run-all.mjs`: add the job only when `process.env.ARTIFICIAL_ANALYSIS_API_KEY` is non-empty; otherwise print `SKIP artificial-analysis: ARTIFICIAL_ANALYSIS_API_KEY not set` and do not add it to `freshness.sources`.
- [ ] `verify-fixtures.mjs`: add `"artificial-analysis.adapter.json"`.
- [ ] Workflow, exact replacement of the ingest step:
  ```yaml
        - name: Ingest all sources
          env:
            ARTIFICIAL_ANALYSIS_API_KEY: ${{ secrets.ARTIFICIAL_ANALYSIS_API_KEY }}
          run: npm run ingest
  ```
- [ ] `build-data.mjs`: if `store/artificial-analysis.jsonl` exists, build `artificial_analysis` rows `{ aa_id, canonical_id, alias_method, name, effort, creator, intelligence_index, coding_index, agentic_index, output_tps, ttft_s, release_date }` using `splitEffort(name)` and `resolveSourceModel({ source: "artificial-analysis", org: creator, label: base })`; set `sources.artificial_analysis = { connected: true, url: "https://artificialanalysis.ai/", fetched_at }` where `fetched_at` = `data/freshness.json` → `sources["artificial-analysis"].fetched_at` (or `null` if that file or key is missing); add counts `artificial_analysis_models` / `_matched` and `unmatched.artificial_analysis` (the `name` strings). If the store file does not exist: `artificial_analysis: []`, `connected: false`.
- [ ] Add `ArtificialAnalysisModel` (fields above; numbers `number | null`, strings `string | null` except `aa_id` and `name`) and `artificial_analysis: ArtificialAnalysisModel[]` to `lib/data.ts`.
- [ ] If the key is set: `npm run ingest`, commit `store/artificial-analysis.jsonl`; then `npm run build:data` and commit `data/scores.json`.
**Test first:** `ingestion/test/artificial-analysis.test.mjs`: (1) `toItem` on the documented example object → `intelligence_index` 24.5, `coding_index` 18.5, `agentic_index` 27.6, `price_in` 0.06, `output_tps` 296.47, `creator` "OpenAI"; (2) `toItem({ id: "x", name: "M" })` → all numeric fields `null`; (3) `splitEffort("Claude Opus 5.5 (max)")` → `{ base: "Claude Opus 5.5", effort: "max" }`; `splitEffort("GPT-6 Astra")` → effort `null`; `splitEffort("Model (Reasoning)")` → effort `null`, base unchanged; (4) `makeFetchImpl("k")` with a stubbed `globalThis.fetch` returning page 1 `{pagination:{has_more:true},data:[A]}` and page 2 `{pagination:{has_more:false},data:[B]}` → response JSON has 2 items and the stub saw header `x-api-key: k` both times (restore `fetch` after).
**Verify:** `npm test` → `# fail 0`, and the new Artificial Analysis tests are listed as `ok`; `npm run verify:fixtures` → `PASS artificial-analysis`; without the key `npm run ingest` prints the `SKIP` line and exits 0 when the other sources succeed.
**Don't touch:** the workflow's `concurrency`, `permissions`, and commit step. May-change list: none.
**If it fails:** 401/403/429 → see **Failure handling**. If the real API's field names differ from the Facts table, map what the live response has, keep the output item shape above, and log the difference under Plan issues.
**Commit:** `feat(ingest): Artificial Analysis indices, prices and speed from its official API (key-gated)`

### Task 2.4 — Always use LiveBench's newest release

**Goal:** Ingest finds LiveBench's newest published release by itself; build uses only that release's rows.
**Why:** The release date is hard-coded (`2026-06-25`); the owner wants the latest results without code edits.
**Where:** `ingestion/sources/livebench.mjs` (search `export const RELEASE`); `ingestion/run-all.mjs`; `normalization/build-data.mjs` (search `release: "livebench-2026-06-25`)
**Do:**
- [ ] In `livebench.mjs` export `scoresUrl(release)` and `costUrl(release)` (`https://livebench.ai/table_<YYYY_MM_DD>.csv`, `https://livebench.ai/cost_<YYYY_MM_DD>.csv`). Keep `RELEASE` as the fallback.
- [ ] Make `makeScoresFetchImpl(release = RELEASE)` and `makeCostFetchImpl(release = RELEASE)` write `release` (not the constant) into each item.
- [ ] Export `async discoverLatestRelease(fetchImpl = fetch) → string | null`: GET `https://livebench.ai/`; find `/static/js/main.<hash>.js`; GET it; collect unique matches of `/20\d\d[-_]\d\d[-_]\d\d/`, normalise to `YYYY-MM-DD`, sort newest first; for at most 10 of them GET `scoresUrl(date)` and return the first whose status is 200 **and** whose body starts with `model`; else `null`. Any thrown error → `null`.
- [ ] `run-all.mjs`: `const lbRelease = (await discoverLatestRelease()) ?? RELEASE;` log it; for the two LiveBench jobs set the loaded adapter's `access.url` to `scoresUrl(lbRelease)` / `costUrl(lbRelease)` before `runIngest`, and pass `lbRelease` to their fetch impls. Record `release: lbRelease` in both jobs' `freshness.sources` entries.
- [ ] `build-data.mjs`: find the newest `release` among LiveBench score records; keep only records of that release (scores and cost); set `sources.livebench = { release, url: "https://livebench.ai/" }` and top-level `release` to `` `LiveBench ${release} + ${terminalBenchTitle ?? "Terminal-Bench not available"} + OpenRouter prices` `` (append ` + Artificial Analysis` when connected).
**Test first:** in `ingestion/test/livebench-release.test.mjs`: stub fetch so the home page links `/static/js/main.abc.js`, the bundle text contains `2026-09-10`, `2026_06_25`, `2026-07-22`; `table_2026_09_10.csv` and `table_2026_07_22.csv` return 404, `table_2026_06_25.csv` returns 200 with body `model,a\nm,1` → `discoverLatestRelease(stub)` resolves `"2026-06-25"`; a stub where every table is 404 → `null`; a stub that throws → `null`.
**Verify:** `npm test` → `# fail 0`, and the 3 new release tests are listed as `ok`; `npm run ingest` → a log line naming the LiveBench release (today `2026-06-25`); `node -e "const d=require('./data/scores.json');console.log(d.sources.livebench.release, d.release)"` → `2026-06-25 LiveBench 2026-06-25 + Terminal-Bench 4.0 + OpenRouter prices` (plus ` + Artificial Analysis` if connected).
**Don't touch:** the LiveBench adapter `map`; CSV parsing. May-change list: none.
**If it fails:** If livebench.ai's bundle file name pattern changed, `discoverLatestRelease` returns `null` and ingest falls back to `RELEASE` — log the new pattern under Plan issues; do not block.
**Commit:** `feat(ingest): discover LiveBench's newest release automatically`

### Checkpoint — Phase 2

- [ ] Full verification: `npm test && npm run verify:fixtures && npx tsc --noEmit && npm run build` → all pass, exits 0.
- [ ] Commit made for every task in this phase.
- [ ] Status file updated: Current state → "Sources: LiveBench 〈release〉, Terminal-Bench 〈title〉 (official), Artificial Analysis 〈connected | waiting on API key〉, OpenRouter prices. Old BenchLM 2.0 snapshot removed." Next up → "PLAN.md Phase 3".
- [ ] Progress Log entry added.

A new session may start here.

---

## Phase 3 — Compare page on real data only

**Purpose:** The compare page shows publisher numbers side by side, per benchmark, with the exact run or variant each number came from — and nothing estimated.
**Starts when:** Phase 2 checkpoint done.
**Re-check first:** `node -e "const d=require('./data/scores.json');console.log(d.terminal_bench.length, d.sources.artificial_analysis.connected)"`. If `terminal_bench` is empty (Phase 2 fallback), build the page without the Terminal-Bench block. If `connected` is `false`, the Artificial Analysis block is not rendered at all.

### Task 3.1 — Pure helper: which published run belongs to the picked variant

**Goal:** One tested function decides, for a picked model, which Terminal-Bench runs and Artificial Analysis entries to show, and which one (if any) matches the picked effort exactly.
**Why:** Keeps the matching rule out of JSX and makes "no best-of without saying which run" testable.
**Where:** new `lib/compare.mjs`; new `normalization/test/compare.test.mjs`
**Do:**
- [ ] Export `runsForVariant(rows, canonicalId, effort, effortKey) → { exact: Row | null, all: Row[] }`: `all` = rows with `canonical_id === canonicalId` (none when `canonicalId` is null), sorted by `accuracy` if present else `intelligence_index`, descending, `null`s last; `exact` = the first row in `all` whose `row[effortKey]` equals `effort` (case-insensitive), only when `effort` is non-null; else `null`.
- [ ] Export `scoreDelta(a, b) → number | null`: `null` if either is `null`; else `Number((a - b).toFixed(2))`.
**Test first:** `compare.test.mjs`: rows `[{canonical_id:"x",reasoning_effort:"high",accuracy:50},{canonical_id:"x",reasoning_effort:"max",accuracy:58},{canonical_id:"y",reasoning_effort:"max",accuracy:40}]`: (1) `runsForVariant(rows,"x","max","reasoning_effort")` → `exact.accuracy` 58, `all.length` 2, `all[0].accuracy` 58; (2) effort `null` → `exact` null, `all.length` 2; (3) effort `"low"` → `exact` null; (4) canonical `null` → `all` empty; (5) `scoreDelta(58.18, 50.3)` → `7.88`; `scoreDelta(null, 1)` → `null`.
**Verify:** `npm test` → `# fail 0`, and the new compare tests are listed as `ok`.
**Don't touch:** `lib/picker.mjs`. May-change list: none.
**If it fails:** fix the helper; the tests are the spec.
**Commit:** `feat(compare): helper that ties published runs to the picked model variant`

### Task 3.2 — Rewrite the compare page; delete estimate code

**Goal:** `components/HeadToHead.tsx` renders two model cards and one block per benchmark from published numbers only; estimate code and its tests are deleted.
**Why:** This is the owner's core use and where the guessed numbers were shown.
**Where:** `components/HeadToHead.tsx` (whole file); new `components/BenchBlock.tsx`; `app/page.tsx` (search `<HeadToHead`); `app/globals.css` (append at the end under a comment `/* Benchmark blocks */`); delete `lib/cost.mjs`, `normalization/test/cost.test.mjs`, `lib/benchmarks.mjs`, `normalization/test/benchmarks.test.mjs`, `components/CostEstimator.tsx`, `components/RadarChart.tsx`
**Do:**
- [ ] State: keep `slots` (two `benchmark_name`s), `a`/`b` URL params, recents, swap. **Remove** `overrideEffort`, the `effort_a`/`effort_b` params, the effort select element, `getEffortListForModel`, `resolveModelForEffort`. The picked model is the LiveBench row itself (effort changes happen in `ModelPicker`'s effort chips, which only list tested variants).
- [ ] Model card (per slot, keep class `h2h-model-card`): `ModelPicker`; `EffortChip` for `m.effort` (`null` → text `effort not stated`); three stats with these exact labels: `Price in / out ($ per 1M tokens)` → `formatPricePair(m.pricing?.input_per_million, m.pricing?.output_per_million)` with a small `via OpenRouter` or `via LiveBench` from `m.pricing.source`; `Context window` → `128k` style or `—`; `LiveBench cost per question` → `$` + `m.cost.cost_per_question` to 4 decimals, or `—`. Remove the Reasoning Tok, SWE-bench best and match-method lines.
- [ ] `BenchBlock` props: `{ id: string; title: string; measures: string; sourceLabel: string; sourceUrl: string; asOf: string; children: ReactNode }`. Renders a `section` element with class `bench-block` and attribute `data-bench` set to `id`, with an `h2` title, one-line `measures` text, and a footer line `Source: <a className="bench-source" href={sourceUrl} target="_blank" rel="noreferrer">{sourceLabel}</a> · {asOf}`.
- [ ] Block 1 — `id="livebench"`, title `LiveBench`, measures `Fresh questions each release, scored 0–100. Overall is LiveBench's own average of its categories.`, sourceLabel `livebench.ai`, sourceUrl `data.sources.livebench.url`, asOf `Release ${data.sources.livebench.release}`. Rows: `Overall` first (from `overall`), then each name in `capabilities` (from `categories`). Each row reuses the existing paired-bar markup (`cap-row`, `cap-bar-*` classes) and `Delta` using `scoreDelta`; a missing value shows `Not on this leaderboard`.
- [ ] Block 2 — only if `terminal_bench` is non-empty: `id="terminal-bench"`, title = `data.sources.terminal_bench.title`, measures `An AI agent works through real tasks in a terminal. Score = % of tasks solved; ± is the 95% range the leaderboard publishes.`, sourceLabel `tbench.ai`, asOf `Runs dated up to ${newest run_date}`. For each slot call `runsForVariant(data.terminal_bench, m.canonical_id, m.effort, "reasoning_effort")`. If both slots have `exact`, show one paired-bar row labelled `At the picked effort` with values `accuracy` and `±ci95_half_width`. Under it, per slot, a list of every run in `all`: `{agent_label} · {reasoning_effort ?? "effort not stated"} · {accuracy.toFixed(1)}% ± {ci95_half_width ?? "—"} · {run_date}`; the `exact` run is marked with the text `picked effort`. A slot with no runs shows `Not on this leaderboard`.
- [ ] Block 3 — only if `data.sources.artificial_analysis.connected`: `id="artificial-analysis"`, title `Artificial Analysis`, measures `Independent indices Artificial Analysis runs on every model, plus measured speed.`, sourceLabel `Data: Artificial Analysis`, sourceUrl `https://artificialanalysis.ai/`, asOf `Fetched ${sources.artificial_analysis.fetched_at.slice(0, 10)}` (omit the date part when `fetched_at` is null). Per slot `runsForVariant(data.artificial_analysis, m.canonical_id, m.effort, "effort")`; the entry shown is `exact ?? (all.length === 1 ? all[0] : null)`; when `all.length > 1` and no `exact`, show the list of `name`s instead of numbers with the text `Artificial Analysis lists several versions of this model — pick the matching effort to compare`. Rows: `Intelligence Index`, `Coding Index`, `Agentic Index`, `Output speed (tokens/s)`, `Time to first token (s)`; each row shows the AA `name` it came from under the value.
- [ ] Keep the collapsed per-task LiveBench table (`h2h-tasks-details`) as is.
- [ ] Delete the six files listed in **Where**. Remove their imports. `app/page.tsx` passes `livebench`, `capabilities`, `terminalBench={data.terminal_bench}`, `artificialAnalysis={data.artificial_analysis}`, `sources={data.sources}`, `vendorDisplay` — no `swe` prop change yet (removed in 4.1) other than no longer used by `HeadToHead`.
- [ ] CSS: `.bench-block` uses the existing card surface/border tokens and spacing scale; a block is full width; paired bars reuse existing `cap-*` rules; lists use `--text-muted` for the secondary text. Nothing overflows at 390px wide (long agent names wrap).
**Test first:** n/a — JSX layout only; the logic is in `lib/compare.mjs` (Task 3.1); the page is checked by `verify:ui` in Task 5.1. Removing `cost.test.mjs` (8) and `benchmarks.test.mjs` (3) is expected.
**Verify:** `npm test` → `# fail 0` (the pass count drops by 11 because `cost.test.mjs` and `benchmarks.test.mjs` are deleted); `npx tsc --noEmit` → no output; `npm run build` → exits 0; `grep -rnE "resolveModelForEffort|EFFORT_WEIGHTS|Derived|isCalculated|dynamic" components lib app` → nothing; Manual: `npx serve out` (or `npm run verify:ui` once Task 5.1 is done), open `/?a=claude-fable-5-1-max-effort&b=gpt-6-astra-max` → LiveBench block with Overall + 7 rows, Terminal-Bench block with run lists for both (A has a `picked effort` run at `max`; B shows runs with no exact match because its effort is not stated).
**Don't touch:** `ModelPicker.tsx`, `model-picker.css`, `lib/picker.mjs` (except Task 3.3), `EffortChip.tsx`. May-change list: none (the two deleted test files are removed, not edited).
**If it fails:** If the page grows past what fits cleanly on a phone, keep every block and move the run lists into a collapsible details element per slot titled `All runs (N)`; log it.
**Commit:** `feat(compare): rebuild compare page on published numbers only; delete estimates, radar and cost estimator`

### Task 3.3 — Default pair with data in every block

**Goal:** A first visit compares two current models that both appear on LiveBench and Terminal-Bench.
**Why:** The current default (Opus 5.5 vs GPT-5.5) is not on Terminal-Bench 4.0, so a first visit shows an empty block.
**Where:** `lib/picker.mjs` (search `byName("claude-opus-5-5-max-effort")`)
**Do:**
- [ ] `fallbackA`: `byName("claude-fable-5-1-max-effort") || byFragment("fable-5") || byFragment("opus-5") || models[0]?.benchmark_name || ""`.
- [ ] `fallbackB`: `byName("gpt-6-astra-max") || byFragment("gpt-6") || byFragment("gpt-5") || (models[1] || models[0])?.benchmark_name || ""`.
**Test first:** in `picker-stages.test.mjs` add one test: with `MODELS` extended locally by rows named `claude-fable-5-1-max-effort` and `gpt-6-astra-max`, `defaultPair(models, [])` → `["claude-fable-5-1-max-effort", "gpt-6-astra-max"]`.
**Verify:** `npm test` → `# fail 0`, and the new `defaultPair` test is listed as `ok`.
**Don't touch:** existing `defaultPair` tests. May-change list: none.
**If it fails:** If an existing default test now fails, the fallback order is wrong — restore it and add the new names in front of the old ones only.
**Commit:** `feat(compare): default to two current models present on every leaderboard`

### Checkpoint — Phase 3

- [ ] Full verification: `npm test && npx tsc --noEmit && npm run build` → pass; the grep in Task 3.2 Verify → nothing.
- [ ] Commit made for every task in this phase.
- [ ] Status file updated: "Compare page shows LiveBench, Terminal-Bench 〈title〉 and 〈Artificial Analysis | no AA block until key〉 from publishers only; estimator, radar and effort-scaling deleted." Next up → "PLAN.md Phase 4".
- [ ] Progress Log entry added.

A new session may start here.

---

## Phase 4 — Retire stale sources, plain copy, slop pass

**Purpose:** Nothing on the site presents out-of-date boards as current, and every sentence says plainly what a number is.
**Starts when:** Phase 3 checkpoint done.
**Re-check first:** Re-run the SWE-bench freshness check: `node -e "fetch('https://raw.githubusercontent.com/SWE-bench/swe-bench.github.io/master/data/leaderboards.json').then(r=>r.json()).then(j=>console.log(j.leaderboards.find(b=>b.name==='Verified').results.map(r=>r.date).sort().pop()))"`. If the newest date is **after 2026-08-01**, stop Task 4.1 and log under Plan issues for the owner (the board may be current again); continue with 4.2–4.4.

### Task 4.1 — Retire SWE-bench Verified

**Goal:** No SWE-bench code, data, route or label remains.
**Why:** Its official board stopped updating on 26/02/2026 and lists no current model; showing it as a benchmark for today's models misleads.
**Where:** delete `app/swe-bench/`, `components/SweBenchTable.tsx`, `ingestion/sources/swe-bench.mjs`, `ingestion/adapters/swe-bench-verified.adapter.json`, `ingestion/fixtures/swe-bench-verified/`, `store/swe-bench-verified.jsonl`; edit `ingestion/run-all.mjs`, `ingestion/verify-fixtures.mjs`, `ingestion/capture-fixtures.mjs`, `normalization/build-data.mjs` (search `// ---------- SWE-bench Verified ----------`), `lib/data.ts` (search `export type SweRow` and `sweSummaryByCanonical`), `components/AppNav.tsx` (search `href: "/swe-bench"`), `app/quality/page.tsx`, `components/DataStatusStrip.tsx` (search `agent runs`), `app/page.tsx`, `probe/verify-ui.mjs` (search `const ROUTES`)
**Do:**
- [ ] Delete the files above with `git rm -r`.
- [ ] Remove the SWE-bench job, adapter entry, capture job and `LIMITS` key.
- [ ] `build-data.mjs`: delete `sweBenchRows`, the `swe_bench` output key, and the `swe_bench_*` counts/unmatched keys.
- [ ] `lib/data.ts`: delete `SweRow`, `swe_bench`, `sweSummaryByCanonical` and the SWE count/unmatched keys.
- [ ] `AppNav.tsx`: remove the `/swe-bench` entry.
- [ ] `app/quality/page.tsx`: remove SWE-bench references; `SOURCE_LABELS` becomes `openrouter: "OpenRouter catalog (prices)"`, `"livebench-scores": "LiveBench scores"`, `"livebench-cost": "LiveBench cost"`, `"terminal-bench": "Terminal-Bench leaderboard"`, `"artificial-analysis": "Artificial Analysis API"`; add two lists of unmatched names — Terminal-Bench and Artificial Analysis — rendered like the existing LiveBench unmatched list.
- [ ] `DataStatusStrip.tsx`: replace `{counts.swe_bench_systems} agent runs` with `{counts.terminal_bench_runs} Terminal-Bench runs`.
- [ ] `app/page.tsx`: remove the `swe` prop.
- [ ] `probe/verify-ui.mjs`: `const ROUTES = ["/", "/matrix", "/quality"];` and remove `".swe-link"` from the contrast selector list.
- [ ] `npm run build:data`; commit `data/scores.json`.
**Test first:** n/a — removal; the existing tests plus `tsc` and `verify:ui` prove nothing else depended on it.
**Verify:** `grep -rniE "swe[-_ ]?bench|SweRow|sweSummary|swe-link" app components lib normalization ingestion probe` → nothing; `npm test` → `# fail 0`; `npx tsc --noEmit` → no output; `npm run verify:fixtures` → all `PASS`; `npm run build` → routes `/`, `/matrix`, `/quality` only.
**Don't touch:** `DOCS/WORK/**` history. May-change list: none.
**If it fails:** A leftover import breaks `tsc` → delete the import and the code that used it; never re-add SWE-bench data.
**Commit:** `refactor: retire SWE-bench Verified (official board not updated since 26/02/2026)`

### Task 4.2 — Plain copy everywhere

**Goal:** Page headers, nav, metadata and labels say plainly what the page does, with no marketing words.
**Why:** Owner asked to remove AI slop; current copy repeats "capability axes", "Answers one question…", and names retired sources.
**Where:** `app/page.tsx` (search `page-head`); `app/layout.tsx` (search `description:`); `app/matrix/page.tsx`; `app/quality/page.tsx` (search `page-title`); `components/AppNav.tsx`; `README.md` (first paragraph)
**Do:**
- [ ] `app/page.tsx` header, exact text: `h1` `Compare two models`; `p.page-sub` `Every score comes from the leaderboard that publishes it, with a link and a date. If a leaderboard hasn't tested a model, the page says so. Nothing is estimated.` Delete the `page-purpose` paragraph.
- [ ] `app/layout.tsx` metadata description, exact text: `Compare AI models side by side on LiveBench, Terminal-Bench and Artificial Analysis — published scores only, with sources.`
- [ ] `app/matrix/page.tsx` sub-heading, exact text: `Every model LiveBench has tested in its latest release. Sort by LiveBench overall or by price.`
- [ ] `app/quality/page.tsx` sub-heading, exact text: `Which sources were fetched, when, and which model names could not be matched. Unmatched names are listed, never guessed.`
- [ ] Nav labels stay `Compare`, `All models`, `Data health`.
- [ ] `README.md`: rewrite the opening paragraph and the sources list to: LiveBench (newest release, auto-detected), Terminal-Bench (official leaderboard, tbench.ai), Artificial Analysis (official API, needs `ARTIFICIAL_ANALYSIS_API_KEY`), OpenRouter (prices, context length). State the honest-data rule from **Rules** in one sentence. Remove SWE-bench and cost-estimator mentions.
**Test first:** n/a — copy.
**Verify:** `grep -rniE "seamless|cutting-edge|unlock|empower|robust|comprehensive|real-time|next-gen|powerful|effortless|leverage|revolutionary|state-of-the-art|contamination-free|deep logic|synthesis|capability axes|answers one question" app components README.md` → nothing.
**Don't touch:** `DOCS/**`. May-change list: none.
**If it fails:** A hit inside a code identifier (not user-visible text) is fine — leave it and note it in the commit body.
**Commit:** `docs(ui): plain copy for every page, metadata and README`

### Task 4.3 — Slop scan and fixes on the changed UI

**Goal:** The files this plan touched have no Tier A/B signatures from the owner's slop registry.
**Why:** Owner asked to remove AI slop; the registry makes it measurable.
**Where:** `E:\dev-recipes\_knowledge\slop-signatures.md` (sections `## The scan`, `## Tier A`, `## Tier B`); `app/globals.css`, `components/HeadToHead.tsx`, `components/BenchBlock.tsx`, `components/DataStatusStrip.tsx`, `app/**/page.tsx`
**Do:**
- [ ] Read only those three sections of the registry.
- [ ] Run its scan patterns that apply to plain CSS/TSX (`transition-all`/`transition: all`, `animate-pulse`/infinite `animation`, `backdrop-filter` blur on content, emoji used as icons, `text-align: center` as body default, `hover` without a `:focus-visible` equivalent, `filter: invert`) over the files above.
- [ ] Fix each real hit per the registry's replacement. Leave Inter (recorded design pick, see Decisions).
- [ ] Also remove any UI text that states a number without its unit or source.
**Test first:** n/a — scan-driven.
**Verify:** re-run the same scan → only hits you logged as intentional (each with a one-line reason in the commit body); `npm run build` → exits 0.
**Don't touch:** colour tokens, font choice, `ModelPicker.tsx` motion (already reviewed 27/09/2026). May-change list: none.
**If it fails:** A fix that needs a design choice (new colour, new font, layout change) → do not make it; log it under Plan issues for the owner.
**Commit:** `fix(ui): slop-registry scan fixes on compare and data pages`

### Task 4.4 — Record the decisions

**Goal:** `DOCS/CONTEXT/DECISIONS.md` records why sources changed, so no later session re-adds them.
**Why:** Prevents re-introducing SWE-bench, BenchLM or estimates.
**Where:** `DOCS/CONTEXT/DECISIONS.md` (append at the end)
**Do:**
- [ ] Append these lines, replacing DD/MM/YYYY with the execution date:
  - `**DD/MM/YYYY (execution date) — Published numbers only.** No estimated, scaled or derived scores. Effort levels shown only when the benchmark tested them. Supersedes the 28/09 effort-scaling and workload estimator.`
  - `**DD/MM/YYYY (execution date) — Sources: LiveBench (newest release), Terminal-Bench official board (tbench.ai), Artificial Analysis official API, OpenRouter for prices.** SWE-bench Verified retired: official board last updated 26/02/2026. BenchLM and OpenRouter-relayed benchmark numbers dropped: second-hand.`
  - `**DD/MM/YYYY (execution date) — Name matching:** reviewed table normalization/manual-aliases.json; entries only after checking both names are the same model and version.`
**Test first:** n/a — documentation.
**Verify:** `grep -c "Published numbers only" DOCS/CONTEXT/DECISIONS.md` → `1`.
**Don't touch:** existing decision lines (append only).
**If it fails:** n/a.
**Commit:** `docs: record published-numbers-only decision and source changes`

### Checkpoint — Phase 4

- [ ] Full verification: `npm test && npm run verify:fixtures && npx tsc --noEmit && npm run build` → pass; Task 4.2's grep → nothing.
- [ ] Commit made for every task in this phase.
- [ ] Status file updated: "SWE-bench retired; copy rewritten; slop scan clean." Next up → "PLAN.md Phase 5".
- [ ] Progress Log entry added.

A new session may start here.

---

## Phase 5 — Verify in a browser, publish, close

**Purpose:** Prove the page works for a real visitor on desktop and phone, publish it, and leave the docs current.
**Starts when:** Phase 4 checkpoint done.
**Re-check first:** `npm run build` exits 0 (the UI check serves `./out`).

### Task 5.1 — UI checks for the new page

**Goal:** `npm run verify:ui` covers the new blocks and passes.
**Why:** Owner decision 28/09: UI changes are verified in a browser, not by reading code.
**Where:** `probe/verify-ui.mjs` (search `if (route === "/")`)
**Do:**
- [ ] Remove checks that target elements this plan deleted (effort select element, radar, cost estimator) if any exist; say which in the commit body.
- [ ] Add on `/` at desktop and at 390px: (1) at least one `.bench-block[data-bench="livebench"]`; (2) when `data/scores.json` has Terminal-Bench runs, one `.bench-block[data-bench="terminal-bench"]`; (3) every `.bench-block` contains an `a.bench-source` whose `href` starts with `https://`; (4) the page's visible text does not match `/estimat|scaled|derived|dynamic/i`; (5) no horizontal overflow at 390px (reuse the existing overflow helper).
- [ ] Add a journey: open `/?a=claude-fable-5-1-max-effort&b=gpt-6-astra-max` → the Terminal-Bench block shows the text `picked effort` at least once.
**Test first:** the new checks are the tests; run them before fixing anything they catch.
**Verify:** `npm run build && npm run verify:ui` → last line `N/N checks passed.` with N > 100.
**Don't touch:** picker journey checks. May-change list: checks for deleted elements only.
**If it fails:** see **Failure handling** (`verify:ui` row).
**Commit:** `test(ui): browser checks for published-only benchmark blocks`

### Task 5.2 — Push and deploy (owner-confirmed)

**Goal:** The live site serves the new page.
**Why:** The owner uses the live URL.
**Where:** `package.json` script `deploy`; `wrangler.jsonc`
**Do:**
- [ ] Ask the owner once (O4): "Push `main` to origin and deploy to Cloudflare now?" Continue with Task 5.3 while waiting.
- [ ] On yes: `git push origin main`.
- [ ] `npx wrangler whoami` → if not logged in, Owner input O2.
- [ ] `npm run deploy`; record the `*.workers.dev` URL it prints as `SITE_URL`.
- [ ] If the owner added the Artificial Analysis key locally but not in GitHub, remind them of O1's second half (GitHub secret) so the daily job keeps it fresh.
**Test first:** n/a — deployment.
**Verify:** `curl -s -o /dev/null -w "%{http_code}" $SITE_URL/` → `200`; `curl -s -o /dev/null -w "%{http_code}" $SITE_URL/swe-bench` → `404`; Manual: open `$SITE_URL` on a phone, pick two models, see the LiveBench and Terminal-Bench blocks with source links.
**Don't touch:** `.github/workflows/ingest.yml` beyond Task 2.3.
**If it fails:** auth error → O2; any other deploy error → record the real output, leave the site as is (the old version stays live), and flag the owner.
**Commit:** `none — deployment only`

### Task 5.3 — Docs and plan close

**Goal:** `DOCS/STATUS.md`, `DOCS/README.md` and today's `DOCS/WORK/<date>/WORK.md` describe the new state; this plan is archived and deleted.
**Why:** The next session starts from the status file, not from this plan.
**Where:** `DOCS/STATUS.md`; `DOCS/README.md` (index table); `DOCS/WORK/<execution date>/WORK.md`
**Do:**
- [ ] `DOCS/STATUS.md`: set "As of" to the execution date; Current state = live URL, sources with their versions/releases, gate results (tests, fixtures, tsc, build, verify:ui counts); Pending = open owner inputs (O1/O3 if still open) and every open Plan issue; Next up = what the owner decides next (e.g. review unmatched names on `/quality`).
- [ ] `DOCS/README.md`: add a row for the execution date summarising this plan's outcome, Status `done`, Load-bearing `yes`, Touches `ingestion/`, `normalization/`, `lib/`, `components/`, `app/`, `store/`, `data/`, Continues `30/09/2026`.
- [ ] Mark the 30/09/2026 row (plan written) `done`.
- [ ] Move this plan's Plan issues, Decisions and Progress Log verbatim into the execution date's `WORK.md`, then `git rm PLAN.md` (guide §12).
**Test first:** n/a — documentation.
**Verify:** `git status --short` → clean after commit; `DOCS/STATUS.md` first lines show the new date.
**Don't touch:** `DOCS/WORK/2026-09-26/`, `DOCS/WORK/2026-09-28/`.
**If it fails:** n/a.
**Commit:** `docs: status after published-numbers-only upgrade; close PLAN.md`

### Checkpoint — Phase 5

- [ ] Full verification: `npm test && npm run verify:fixtures && npx tsc --noEmit && npm run build && npm run verify:ui` → all pass; live URL checks from Task 5.2 (or O4 recorded as declined).
- [ ] Commit made for every task in this phase.
- [ ] Status file updated as in Task 5.3.
- [ ] Progress Log entry added (in the WORK file, since PLAN.md is closed).

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

- **O1 — Artificial Analysis API key (optional but recommended).** Create a free account at https://artificialanalysis.ai, generate an API key, then (a) set it locally for the executor session as `ARTIFICIAL_ANALYSIS_API_KEY`, and (b) add it in GitHub → repo `model-bench-interface` → Settings → Secrets and variables → Actions → New secret named `ARTIFICIAL_ANALYSIS_API_KEY`. Without it the site works and simply has no Artificial Analysis block.
- **O2 — Wrangler login** if `npx wrangler whoami` shows no account: run `! npx wrangler login`.
- **O3 — Carried from the 26/09 plan:** connect the Cloudflare Worker to the GitHub repo (Cloudflare dashboard → Workers & Pages → `model-bench` → Settings → Builds; build command `npm run build`, deploy command `npx wrangler deploy`) so the daily data commit redeploys the site.
- **O4 — Confirm push and deploy** at Task 5.2.

---

## Decisions

- Benchmarks shown: LiveBench, Terminal-Bench (official board), Artificial Analysis — the independently run, currently updated sources that cover today's models; plus OpenRouter for price and context *(assumed — owner asked for "what most users check"; verified which of those are current and official on 30/09/2026)*.
- Lab self-reported scores from model announcements are **not** shown: they are not independently run and each lab uses its own setup *(assumed)*.
- SWE-bench Verified and SWE-Bench Pro are not shown: their official boards stop at 26/02/2026 and 09/07/2026 *(assumed; Phase 4 re-checks before deleting)*.
- LMArena not added: no official data feed, only third-party scrapes *(assumed)*.
- LiveBench category and Overall scores are computed in the app because LiveBench's CSV has task scores only, using exactly LiveBench's published method *(assumed)*.
- The compared unit stays a LiveBench row (model + tested effort); models missing from LiveBench cannot be picked. Smallest change that keeps the picker *(assumed)*.
- A Terminal-Bench or Artificial Analysis number is paired with the picked variant only when its effort matches exactly; otherwise all runs are listed with their effort, never a silent best-of *(assumed)*.
- Artificial Analysis names are matched only by existing alias rules; the plan adds no Artificial Analysis manual aliases, so unmatched names wait for owner review on `/quality` *(assumed)*.
- Inter stays: it is the recorded design pick (`design-tokens.json`); changing fonts needs a design pick by the owner *(assumed)*.
- Default pair becomes Claude Fable 5.1 (max) vs GPT-6 Astra (max) because both appear on LiveBench and Terminal-Bench *(assumed)*.

---

## Progress Log

*(Append only. Newest at the bottom. Never rewrite an entry — if it turned out wrong,
add a new one saying so. This log is what makes resuming cheap: a cold session reads
the last entry and knows exactly where to start.)*

- **30/09/2026 — Phase 1 completed.**
  - Task 1.1: `supportedEffortsFrom` exported and used; OpenRouter relayed `benchmarks` dropped; `external_benchmarks` removed; 77 tests passing.
  - Task 1.2: `livebench-scores.mjs` implemented; `categoryAverages`, `overallScore`, `round2`, `assertTasksCategorised` tested and integrated into `build-data.mjs`, `lib/picker.mjs`, `ModelMatrix.tsx`; 83 tests passing; `npx tsc --noEmit` clean.
