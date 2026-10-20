# PLAN — Effort levels that really work: data first, then the view

**Written 19/10/2026.** Temporary file — deleted when this closes.

**Goal:** for every model, the app shows each benchmark score at the reasoning-effort level it
was actually measured at. Switching effort changes the numbers wherever a source measured
that level, and says plainly where no source did.
**Why:** owner, 19/10/2026: "make that app full work on effort levels; still that app is not
properly showing the benchmarks based on effort level". The 17/10 fix (`dbc44c8`) stopped
fake effort buttons. But the data behind the switch is thin:
- LiveBench is broken since 19/10 (HTTP 404);
- its last good release had no effort variants;
- Artificial Analysis is not connected;
- only 3 models have multi-effort Terminal-Bench runs.
**What this changes:** `ingestion/sources/livebench.mjs`, `normalization/effort.mjs`,
`lib/picker.mjs`, `lib/compare.mjs`, `components/HeadToHead.tsx`, `components/BenchBlock.tsx`,
`components/EffortChip.tsx`, tests under `ingestion/test/` and `normalization/test/`,
`probe/verify-ui.mjs`, `DOCS/`.
**Done means:** the 5 checks in Phase 4's checkpoint all pass on `main`, and the deployed site
shows them. In short:
- LiveBench ingests again in the daily job;
- every effort level the data holds is reachable in the UI;
- every score carries its measured effort;
- a level with no measurement says so;
- `verify:ui` covers the effort journey.
**Out of scope:** estimated or scaled scores (DECISIONS 30/09: published numbers only); new
benchmark sources; the "effort-progression delta visualizer" (STATUS Next up 1, listed as an
option); the canary history file; moving the Artificial Analysis key to an adapter env header.

---

## Read this first

1. `git -C E:/model-bench pull --ff-only`. Work on branch `feat/effort-levels` (Task 0.1).
   The plan was written on 19/10/2026: before Task 1.1, re-run the Facts table's `curl`
   probes and `gh run list --workflow ingest.yml --limit 3`. LiveBench may have changed
   again; log any difference under Plan issues.
2. Read only: `DOCS/STATUS.md`, `DOCS/CONTEXT/DECISIONS.md` (lines from 30/09/2026 on), this
   file's rules, your current task, the last Progress Log entry. Do not read whole: `store/*.jsonl`,
   `data/scores.json` (query them with `node -e`), `out/`, `.next/`.
3. Detect the environment:

| Check | Command | Pass looks like |
|---|---|---|
| Node | `node --version` | v22 or newer |
| Branch | `git -C E:/model-bench branch --show-current` | `feat/effort-levels` (after Task 0.1) |
| Clean tree | `git -C E:/model-bench status --short` | empty, or only this task's files (`PLAN.md` is untracked) |
| Engine version | `node -p "require('./node_modules/@shrinivas-sn/adapter-ingestion/package.json').version"` | `0.6.0` or newer |
| Chrome for verify:ui | `npm run verify:ui` after `npm run build` | it finds Chrome, or prints where it looked |
| AA key (Phase 2.3 only) | `node -e "console.log(!!process.env.ARTIFICIAL_ANALYSIS_API_KEY)"` | `true` |

4. A task's **Where:** uses search text, not line numbers. If the text is missing, the code
   moved: find the equivalent, apply the same intent, and log it under Plan issues.

## Facts verified while planning

| Fact | Source | Checked on |
|---|---|---|
| The daily ingest job fails since 19/10 (also 16/10, 17/10): `livebench-scores` and `livebench-cost` → `E_HTTP_STATUS` 404; openrouter and terminal-bench ok | `gh run list --workflow ingest.yml`; `gh run view <id> --log-failed` | 19/10/2026 |
| The same 404 happens on adapter-ingestion 0.2.0 and 0.6.0, so it is not the engine | scratch runs of the keyless sources on store copies, both versions: identical stage counts | 19/10/2026 |
| LiveBench moved its CSVs. `https://livebench.ai/table_<YYYY_MM_DD>.csv` → 404 for every date tried; `https://livebench.ai/v1/table_2026_06_25.csv` and `/v1/cost_2026_06_25.csv` → 200 `text/csv`. The site bundle fetches `./v1/table_${date}.csv?v=…`, `./v1/cost_${date}.csv`, `./v1/categories_${date}.json`, and also `./data/${id}/table.csv` (what `id` is was not found) | `curl` probes; bundle `https://livebench.ai/static/js/main.cc3fb0ac.js` (name changes per deploy) | 19/10/2026 |
| `/v1/` has no 2026-09-02, 2026-09-10 or 2026-07-22 file (404). The app's data is LiveBench 2026-09-02, fetched before the move | `curl`; `data/scores.json` `release` | 19/10/2026 |
| `ingestion/sources/livebench.mjs` builds URLs in `scoresUrl`/`costUrl` (old root path), and `discoverLatestRelease` checks candidates with `scoresUrl`; on failure `run-all.mjs` falls back to `RELEASE = "2026-06-25"` | `ingestion/sources/livebench.mjs` search `export const RELEASE` | 19/10/2026 |
| LiveBench `/v1/table_2026_06_25.csv`: 71 rows, 46 carry an effort-like suffix (`claude-opus-4-7-xhigh-effort`, `claude-sonnet-4-6-thinking-auto-medium-effort`, `gemini-3.5-flash-high`, `gpt-5.2-2025-12-11-high`). The bundle has 126 display names with an effort word | `curl` + `grep` | 19/10/2026 |
| Data now (`data/scores.json`, 18/10): LiveBench 49 rows, 0 with `effort`; Terminal-Bench 35 runs, `reasoning_effort` = max 16, xhigh 5, high 7, medium 3, low 3, none 1; multi-effort only `openai/gpt-6-astra`, `anthropic/claude-fable-5.1`, `anthropic/claude-opus-5`; Artificial Analysis 0 rows (`connected: false`); OpenRouter catalog 206 models list `supported_efforts` (a config flag, not a measurement) | `node -e` over `data/scores.json` | 19/10/2026 |
| No GitHub Actions secret is set (so `ARTIFICIAL_ANALYSIS_API_KEY` is empty in CI and `run-all.mjs` skips AA) | `gh secret list` → empty; `.github/workflows/ingest.yml` | 19/10/2026 |
| `EFFORT_LEVELS = ["max","xhigh","high","medium","low"]`; Terminal-Bench also has `none` | `normalization/effort.mjs`; TB counts above | 19/10/2026 |
| `parseEffort` reads `-<level>-effort`, `-xhigh`, `-high`, `-medium`, `-low` (bare `-max` = product tier) | `normalization/effort.mjs` | 19/10/2026 |
| `getAvailableEfforts(model, tbRuns, aaRuns, allModels)` = LiveBench sibling efforts ∪ TB `reasoning_effort` ∪ AA `effort` for the same canonical id/family (measured only, since 17/10) | `lib/picker.mjs` search `export function getAvailableEfforts` | 19/10/2026 |
| Gates: `npm test` 97/97; `npm run verify:fixtures` 5/5 PASS; `npx tsc --noEmit` 0; `verify:ui` serves `./out` with puppeteer-core and installed Chrome (needs `npm run build`) | `package.json` scripts; `probe/verify-ui.mjs` header; runs on 19/10 | 19/10/2026 |
| Product rules: published numbers only; effort levels shown only when tested; per-benchmark comparison, never averaged; UI changes verified in a browser; LiveBench = newest release | `DOCS/CONTEXT/DECISIONS.md` (26/09, 28/09, 30/09 entries) | 19/10/2026 |

## Rules for every task

- **Published numbers only.** Never estimate, scale, interpolate or borrow a score from
  another effort level. A level nobody measured shows as not measured.
- **Never break what works:** openrouter and terminal-bench ingest, the picker journey, the
  17/10 measured-only rule, URLs with `effort_a`/`effort_b` params.
- **Test first** (`node --test`); UI changes also pass `npm run verify:ui` in a real browser.
- **Existing tests are read-only** except where a task's may-change list names one.
- **One task, one commit** on `feat/effort-levels`, ending with the session's attribution lines.
- **Push, merge and deploy only on the owner's yes.**
- `store/` and `data/` are committed only by the daily ingest job. `npm run build` and
  `npm run build:data` rewrite `data/scores.json` locally. After any build, run
  `git restore data/ store/` before committing, so a task commit never contains data changes.

## Failure handling

| Situation | Do this |
|---|---|
| LiveBench returns 404 or HTML for a URL a task expects | Re-read the live bundle (Task 1.1 method) before changing code; log a Plan issue. |
| `npm run build` is slow or times out | Run it in the background with a 10-minute limit; never skip `verify:ui` for a UI task. |
| `verify:ui` cannot find Chrome | Report the path it tried; ask the owner; continue non-UI tasks. |
| `npx tsc --noEmit` fails | Fix the types in the changed file; never add `any` to silence a real mismatch. |
| A live source rate-limits (429) | Wait and retry once; then continue with fixtures and log it. |
| Anything else fails | Fix and retry at most three times. Then set the work aside (stash or WIP branch), record the real output in the Progress Log, and continue with the next independent task. |
| The plan itself looks wrong | Follow **Plan issues** below — decide by impact, never freeze the whole plan. |
| Owner-only actions | The AA API key (local and as a GitHub secret), push, merge, deploy. Ask once, continue other tasks. |

---

## Phase 0 — Branch and baseline

**Purpose:** a known-green start.
**Starts when:** the owner says go.
**Re-check first:** none.

### Task 0.1 — Branch and baseline

**Goal:** branch `feat/effort-levels` from `origin/main`, gates recorded.
**Why:** later counts compare with this.
**Where:** `E:/model-bench` (search text: n/a — repo root)
**Do:**
- [ ] `git fetch origin && git switch -c feat/effort-levels origin/main`.
- [ ] `npm ci`; `npm test`; `npm run verify:fixtures`; `npx tsc --noEmit`. Record the results.
**Test first:** n/a — no change.
**Verify:** `npm test` → 97 pass, 0 fail; fixtures 5/5 PASS; tsc exit 0.
**Don't touch:** any file.
**If it fails:** a red baseline stops Phase 0; report it to the owner.
**Commit:** none — no change.

### Checkpoint — Phase 0

- [ ] Full verification: the three commands above, as recorded.
- [ ] Commit made for every task in this phase (none needed).
- [ ] Status file updated: "Effort-levels plan in progress (`PLAN.md`); Phase 0 done".
- [ ] Progress Log entry added.

A new session may start here.

---

## Phase 1 — LiveBench ingests again

**Purpose:** the daily job gets LiveBench data again, from the newest release LiveBench publishes.
**Starts when:** Phase 0 is done.
**Re-check first:** `curl -s -o /dev/null -w '%{http_code}' https://livebench.ai/v1/table_2026_06_25.csv` → `200`. If not, redo Task 1.1 from scratch.

### Task 1.1 — Find where the newest LiveBench release lives

**Goal:** a written answer: the URL pattern and the newest release with a working table and cost CSV.
**Why:** `/v1/` only has 2026-06-25, yet the app showed 2026-09-02 yesterday. Coding the `/v1/` path alone could quietly move the app back to an older release.
**Where:** `https://livebench.ai/` and the `static/js/main.*.js` it loads (search text: `table_${` and `./data/${`)
**Do:**
- [ ] Download the bundle the homepage names. Find how it builds the release list and what `${id}` in `./data/${id}/table.csv` is (the variable is set where `./data/` appears).
- [ ] Probe every candidate (each release date in both `YYYY_MM_DD` and `YYYY-MM-DD`, the `./data/<id>/` form, `/v1/`). A candidate counts only when the body starts with `model,`.
- [ ] Write the result into the Progress Log: pattern(s), newest working release, and whether it has effort-suffixed rows (`cut -d, -f1 | grep -ciE 'effort|-(high|low|medium|max|xhigh)$'`).
**Test first:** n/a — investigation; Task 1.2 encodes the result in tests.
**Verify:** Manual: two `curl` commands (table and cost) for the chosen release print CSV starting with `model,`.
**Don't touch:** code.
**If it fails:** if 2026-06-25 under `/v1/` is the only working release, Task 1.2 uses `/v1/` and logs a Plan issue that the app moves from 2026-09-02 to 2026-06-25 data. Flag the owner, because that is older data. Continue.
**Commit:** none — investigation.

### Task 1.2 — Point the LiveBench source at the new location

**Goal:** `scoresUrl`, `costUrl` and `discoverLatestRelease` use the pattern from Task 1.1.
**Why:** this is the 404.
**Where:** `ingestion/sources/livebench.mjs` (search text: `export function scoresUrl`, `export function costUrl`, `export async function discoverLatestRelease`)
**Do:**
- [ ] Change the two URL builders to the Task 1.1 pattern. Keep `RELEASE` as the fallback, set to the newest working release found.
- [ ] `discoverLatestRelease`: candidates come from the bundle as today, are checked with the new `scoresUrl`, and only a body starting with `model` counts (as today).
- [ ] If the bundle now names releases another way (Task 1.1), read them that way. Keep the try-newest-first loop and the `null` return on any failure.
**Test first:** `ingestion/test/livebench-release.test.mjs` (may-change list: its URL expectations only). New cases:
- `scoresUrl("2026-06-25")` and `costUrl` equal the Task 1.1 URLs;
- `discoverLatestRelease` with a stubbed `fetchImpl` (homepage → bundle with dates A > B; table A → 404; table B → `model,…`) returns B;
- a stub where every table is HTML returns `null`.
**Verify:** `npm test` → all pass; live: `node -e "import('./ingestion/sources/livebench.mjs').then(async m=>console.log(await m.discoverLatestRelease()))"` prints the Task 1.1 release.
**Don't touch:** `transformScoresCsv`/`transformCostCsv`, other sources, `store/`.
**If it fails:** if discovery returns `null` live while the stub tests pass, log the live bundle shape as a Plan issue and keep the fallback.
**Commit:** `fix(livebench): fetch CSVs from LiveBench's new location`

### Task 1.3 — Prove the ingest works end to end (no tracked file changes)

**Goal:** a full `run-all.mjs`-style run against copies of the stores gives `ok` for both LiveBench jobs.
**Why:** the fix must work through adapter-ingestion and the adapters, not just in unit tests.
**Where:** a scratch script outside the repo, modelled on `ingestion/run-all.mjs` (search text: `const JOBS = [`)
**Do:**
- [ ] Copy `store/*.jsonl` to a scratch folder. Run the 4 keyless jobs with `paths` pointing there and `runsDir` in scratch.
- [ ] Record each job's `report.outcome` and `report.stages`.
- [ ] Run `npm run verify:fixtures`.
**Test first:** n/a — live integration check of Task 1.2.
**Verify:** `livebench-scores` and `livebench-cost` → `ok` with `parsed` > 0; openrouter and terminal-bench as in the baseline; `git status --short` shows no change under `store/` or `data/`.
**Don't touch:** tracked `store/`, `data/`.
**If it fails:** an `E_RECORD_INVALID` or `stale` canary means the CSV columns changed: compare with `ingestion/fixtures/livebench-scores/`. Log it and fix the transform under a new Task 1.4 card added via Plan issues.
**Commit:** none — verification only.

### Task 1.4 — Categories for the new release (added 20/10/2026, see Plan issue 4)

**Goal:** `build:data` builds from a 2026-10-14 store, and fetches an unmapped release's categories from the new path.
**Why:** the new release renamed two tasks; without a map `assertTasksCategorised` throws and the daily job stays red.
**Where:** `normalization/categories.mjs` (search text: `LIVEBENCH_CATEGORIES_BY_RELEASE`); `normalization/build-data.mjs` (search text: `categoriesMap = categoriesForRelease`)
**Do:**
- [x] Add the `2026-10-14` map from live `data/20261014/categories.json`; make it the default; add "Long Agentic" to `CAPABILITY_AXES`.
- [x] The fallback fetch uses `categoriesUrl(release)` from `ingestion/sources/livebench.mjs`.
**Test first:** `normalization/test/categories.test.mjs` (append): the 2026-10-14 map categorises all 7 tasks and is the default.
**Verify:** `npm test` pass; `build:data` on the Task 1.3 store copies writes 48 LiveBench rows, then `git restore data/ store/`.
**Don't touch:** the 2026-06-25 and 2026-09-02 maps.
**Commit:** `fix(categories): map LiveBench 2026-10-14 tasks; fetch categories from new path`

### Checkpoint — Phase 1

- [ ] Full verification: `npm test`; `npm run verify:fixtures`; `npx tsc --noEmit`; the Task 1.3 run.
- [ ] Commit made for every task in this phase.
- [ ] Status file updated: "LiveBench fixed (new URL pattern, release found in Task 1.1); daily job can be green again after merge".
- [ ] Progress Log entry added.

A new session may start here.

---

## Phase 2 — Effort data coverage

**Purpose:** know, per model, which effort levels have a published score from which source, and get every one into `data/scores.json`.
**Starts when:** Phase 1 is done.
**Re-check first:** the LiveBench release chosen in Task 1.1 and whether its rows carry effort suffixes. If they do not, LiveBench contributes no effort variants. Task 2.2 then only guards the parser, and Artificial Analysis (Task 2.3) becomes the main effort source.

### Task 2.1 — Effort coverage report

**Goal:** a repeatable coverage script, and its first report.
**Why:** "not properly showing" has to become a measurable list: which models should have which buttons.
**Where:** `normalization/effort-coverage.mjs` (new); output `DOCS/WORK/{today}/effort-coverage.md`
**Do:**
- [ ] Run `npm run build:data` (it rewrites `data/scores.json` from the current `store/`), run the script, then `git restore data/`. For each `canonical_id`, list the measured efforts per source:
  - LiveBench: rows with `effort`;
  - Terminal-Bench: `reasoning_effort`;
  - Artificial Analysis: `effort`.
- [ ] Print the totals: models with ≥ 2 measured levels; models with exactly 1; TB `none` runs; effort strings not in `EFFORT_LEVELS`.
- [ ] Write the report to the DOCS path.
**Test first:** `normalization/test/effort-coverage.test.mjs`: a 3-model fixture (LB high+low; TB max only; nothing) → exact expected coverage object.
**Verify:** `npm test` → pass; the report exists and its totals equal a `node -e` count over `data/scores.json`.
**Don't touch:** UI, `data/` in git.
**If it fails:** a source key differs from the facts table → use the real key and log it.
**Commit:** `feat(normalization): effort coverage report`

### Task 2.2 — Every LiveBench effort name parses

**Goal:** `parseEffort` reads every effort form in the chosen LiveBench release, and rejects what is not an effort.
**Why:** a name the parser misses leaves its family without that button.
**Where:** `normalization/effort.mjs` (search text: `export function parseEffort`); `normalization/test/effort.test.mjs`
**Do:**
- [ ] Collect every first-column name with an effort word from the Task 1.1 release CSV. Do the same for the 2026-06-25 `/v1/` CSV, which is known to have 46.
- [ ] Add each as a test vector with its expected `{ effort, thinking }`, for example:
  - `claude-sonnet-4-6-thinking-auto-medium-effort` → medium, thinking true;
  - `gemini-3.5-flash-high` → high;
  - `claude-opus-4-5-20251101-thinking-64k-high-effort` → high, thinking true.
- [ ] Change the parser only for vectors that fail. Bare `-max` stays `null` (product tier).
- [ ] Decide `none`/`minimal`: add them to `EFFORT_LEVELS` only if a source uses them. Terminal-Bench uses `none`; it ranks below `low`.
**Test first:** the vectors above (failing ones first).
**Verify:** `npm test` → pass; Task 2.1 report rerun shows no "effort string not in EFFORT_LEVELS".
**Don't touch:** `stripEffort` behaviour for names that already pass.
**If it fails:** an ambiguous name (for example a version number that looks like an effort) → leave it `null` and list it in the Progress Log; never guess.
**Commit:** `fix(effort): parse every LiveBench effort form; rank none below low`

### Task 2.3 — Artificial Analysis connected (owner key)

**Goal:** AA rows with their per-effort names ingest locally and in the daily job.
**Why:** AA lists separate entries per effort ("Claude Opus 5.5 (max)"), so it is the widest effort source. It is off today because no key is set.
**Where:** `ingestion/sources/artificial-analysis.mjs` (search text: `export const KEY_ENV`); `.github/workflows/ingest.yml` (search text: `ARTIFICIAL_ANALYSIS_API_KEY`)
**Do:**
- [ ] Owner sets the key locally, and as the repository secret `ARTIFICIAL_ANALYSIS_API_KEY` (Owner inputs).
- [ ] With the key, run the AA job alone against a store copy. Record `outcome`, `stages`, and how many rows have a non-null `effort` (`splitEffort`).
- [ ] Rerun the Task 2.1 report with AA included.
**Test first:** n/a — no code change expected. If `splitEffort` misses a live name form, add the vector to `ingestion/test/artificial-analysis.test.mjs` first.
**Verify:** AA job `ok`, `parsed` > 0, effort rows > 0; coverage report shows more models with ≥ 2 levels than before.
**Don't touch:** the key itself (never printed, never committed).
**If it fails:** no key yet → mark this task waiting on the owner, and continue Phase 3 with LiveBench + Terminal-Bench data.
**Commit:** none unless a parser vector was added: `fix(aa): parse more effort name forms`

### Checkpoint — Phase 2

- [ ] Full verification: `npm test`; fixtures; tsc; coverage report written.
- [ ] Commit made for every task in this phase.
- [ ] Status file updated: "Effort coverage: the Task 2.1 totals, per source".
- [ ] Progress Log entry added.

A new session may start here.

---

## Phase 3 — The view shows effort honestly

**Purpose:** every score says which effort it was measured at, switching effort changes numbers where a measurement exists, and a missing level is stated, never blank or borrowed.
**Starts when:** Phase 2 is done (Task 2.3 may still wait for the key).
**Re-check first:** read `components/HeadToHead.tsx` (search `getAvailableEfforts`), `components/BenchBlock.tsx`, `lib/compare.mjs`. Note how a benchmark block picks its row for the selected effort. If a block already shows a single-effort score under another level without a label, that is the main bug Task 3.1 fixes.

### Task 3.1 — One selection rule for "score at effort X", in `lib/`

**Goal:** `scoreAtEffort(model, source, effort, data)` → `{ value, measuredEffort, status }` with `status` one of `"measured"`, `"not-measured"`, `"effort-not-stated"`.
**Why:** the rule must be testable in Node, not spread across 7 component call sites.
**Where:** `lib/compare.mjs` (new export); `normalization/test/compare.test.mjs` (append)
**Do:**
- [ ] `measured`: a row of that source for the model with exactly `effort`.
- [ ] `effort-not-stated`: the source has one row for the model with `effort` null (LiveBench bare names). Return its value, with `measuredEffort: null`. It is the published number, but the UI must label it "effort not stated".
- [ ] `not-measured`: rows exist at other levels only. `value: null`, plus `measuredLevels` sorted strongest first.
- [ ] No row at all → `value: null`, `status: "not-measured"`, `measuredLevels: []`.
**Test first:** append cases:
- TB opus-5 at `low` → measured;
- TB single-max model at `low` → not-measured, `measuredLevels: ["max"]`;
- LiveBench bare row at `high` → effort-not-stated, with its value;
- unknown model → not-measured, `[]`.
**Verify:** `npm test` → pass.
**Don't touch:** `getAvailableEfforts` (the 17/10 rule stays).
**If it fails:** if a source has two rows at the same effort (two agents on TB), pick the one the UI shows today, and log which rule that is.
**Commit:** `feat(compare): scoreAtEffort, one rule for score-at-effort`

### Task 3.2 — Head-to-head and benchmark blocks use it

**Goal:** each benchmark block shows the `scoreAtEffort` result with its label.
**Why:** this is what the owner sees.
**Where:** `components/HeadToHead.tsx` (search text: `getAvailableEfforts(`); `components/BenchBlock.tsx`; `components/EffortChip.tsx`
**Do:**
- [ ] `measured` → the score and an `EffortChip` for `measuredEffort`.
- [ ] `effort-not-stated` → the score and a neutral chip "effort not stated".
- [ ] `not-measured` → "Not measured at {level}". When `measuredLevels` is non-empty, follow it with "· measured at:" and one button per level that switches that side's effort (updates `effort_a`/`effort_b`).
- [ ] Keep the existing layout, colours and 44px targets (DECISIONS 28/09).
**Test first:** extend `probe/verify-ui.mjs` (may-change list: add checks only). Pick the test models from the Task 2.1 report. The names below were right on 19/10; if a model has gone from the data, use any model with ≥ 2 Terminal-Bench levels and any single-level model, and log the swap.
- the claude-opus-5 head-to-head at `low` then `max` shows two different Terminal-Bench numbers, each with its chip;
- a single-run model at `low` shows "Not measured at low" and a "max" button that switches;
- a LiveBench bare model shows "effort not stated".
**Verify:** `npm run build` then `npm run verify:ui` → all checks pass, including the new ones; `npx tsc --noEmit` → 0; then `git restore data/`.
**Don't touch:** picker search and grouping; matrix sorting.
**If it fails:** a check fails in the browser but logic tests pass → fix the component, not the test.
**Commit:** `feat(ui): every score shows the effort it was measured at`

### Task 3.3 — Matrix and quality pages label effort the same way

**Goal:** `/matrix` and `/quality` use the same chips and the same "effort not stated" wording.
**Why:** one meaning across the app.
**Where:** `components/ModelMatrix.tsx` (search text: `EffortChip effort={m.effort}`); `app/quality/page.tsx` (search text: `reasoning-effort tags`)
**Do:**
- [ ] A null effort shows the neutral "effort not stated" chip, not nothing.
- [ ] Terminal-Bench `none` shows as "none" (ranked below low).
**Test first:** `verify:ui` check: a matrix row with null effort shows the neutral chip.
**Verify:** build + `npm run verify:ui` → pass.
**Don't touch:** matrix columns.
**If it fails:** as Task 3.2.
**Commit:** `feat(ui): consistent effort labels on matrix and quality`

### Checkpoint — Phase 3

- [ ] Full verification: `npm test`; fixtures; tsc; `npm run build`; `npm run verify:ui` (all pass).
- [ ] Commit made for every task in this phase.
- [ ] Status file updated: "Effort view done: measured / not stated / not measured labels; verify:ui all checks pass".
- [ ] Progress Log entry added.

A new session may start here.

---

## Phase 4 — Ship (owner's yes)

**Purpose:** merged, deployed, and the daily job green.
**Starts when:** Phase 3 is done.
**Re-check first:** `git log origin/main..HEAD --oneline` lists only this plan's commits; rebase on `origin/main` if the ingest bot committed meanwhile (it touches only `store/` and `data/`).

### Task 4.1 — Review, push, merge, deploy

**Goal:** the change is live and the daily job passes.
**Why:** done means the deployed site, not the branch.
**Where:** GitHub `shrinivas-sn/model-bench-interface`; `.github/workflows/ingest.yml`
**Do:**
- [ ] Run the `myreview` skill on `git diff origin/main...HEAD`; fix confirmed findings test first.
- [ ] Ask the owner: "Push `feat/effort-levels` and merge to main?" Wait for a yes. Push; merge (the owner may need to type `gh pr merge {PR number} --merge`, see adapter-ingestion's release memory).
- [ ] Ask the owner to run the ingest workflow once (`gh workflow run ingest.yml`), or wait for the next scheduled run; confirm success.
- [ ] Deploy as the owner directs (`npm run deploy`, or Workers Builds if O3 is connected).
**Test first:** n/a — release steps.
**Verify:** `gh run list --workflow ingest.yml --limit 1` → success; Manual: open the live site, run the Task 3.2 journey (opus-5 at low vs max; a single-run model at low).
**Don't touch:** never force-push.
**If it fails:** a failing ingest after merge → read `--log-failed`, log a Plan issue, fix on a new branch.
**Commit:** one per review fix: `fix(review): {one-line summary}`; otherwise none.

### Checkpoint — Phase 4

- [ ] Full verification (the 5 done checks):
  1. latest ingest run green with both LiveBench jobs `ok`;
  2. coverage report: every model with ≥ 2 measured levels has those buttons;
  3. every score shows a chip (measured or "effort not stated");
  4. a missing level reads "Not measured at {level}";
  5. `verify:ui` covers 1–4 and passes.
- [ ] Commit made for every task in this phase.
- [ ] Status file updated: "Effort levels shipped (merge commit hash); plan closed".
- [ ] Progress Log entry added; close the plan: move it to `DOCS/WORK/{today}/`, add the `DOCS/README.md` row, delete `PLAN.md`.

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
| 1 | 20/10/2026 | 0.1 | Branch from `origin/main` | Local `main` is 2 docs commits ahead (`e831a38` adds this `PLAN.md`, `17245bc` status); `origin/main` = `2446b1f` has no `PLAN.md` | Local, same intent | Branched `feat/effort-levels` from local `main` (`17245bc`); nothing pushed | — |
| 2 | 20/10/2026 | 1 (re-check) | Facts: ingest fails since 19/10 "also 16/10, 17/10" | `gh run list`: 18/10 07:21Z run success with `LiveBench release: 2026-09-02`, both LB jobs `ok` (root URL still served then); 19/10 fails; 14–17/10 scheduled runs also failed, 17/10 manual run succeeded. Move happened between 18/10 07:21Z and 19/10 08:00Z | None on the fix | Noted; probes re-run 20/10 match Facts (`/v1/` 2026-06-25 only; root and `/v1/` 2026-09-02/09-10/07-22 → 404) | — |
| 3 | 20/10/2026 | 1.1, 1.2 | Pattern is `/v1/` or `./data/<id>/` (unknown id); discovery scans dated strings | Bundle `main.c8f94910.js`: two generations. v1 archive = `./v1/table_<YYYY_MM_DD>.csv`, list ends 2026-06-25. LiveBench 2 = `_e=["20261014"]` → `./data/20261014/{table.csv,cost.csv,categories.json}` (all 200, body `model,`). 2026-09-02 is no longer in the bundle or served. 20261014 has the same 7-category shape as 2026-09-02: 48 models (`smaug-flash` dropped), 325 scores equal, 11 changed, 0 effort rows (`qwen3.8-max` = product tier) | Task 1.2 amended (see issue 3): URLs use `data/<YYYYMMDD>/`, release stored `YYYY-MM-DD`; discovery also reads quoted `YYYYMMDD` ids; `RELEASE` = 2026-10-14. App moves 2026-09-02 → 2026-10-14 (newer) | Done in `ce9fd3d` | — |
| 4 | 20/10/2026 | 1.3 → new 1.4 | Phase 1 touches only `ingestion/sources/livebench.mjs` | 20261014 renames `design_layout`→`design`, `long_horizon`→`long_agentic`; `build:data` throws `LiveBench tasks without a category` (no map for 2026-10-14; its fallback fetches old root `categories_<date>.json` → 404). Daily job would stay red after merge | Public label: LiveBench's own category name "Long Agentic" replaces "Long-Horizon" on the site | Added Task 1.4 (below), committed `d5c5030` | Owner: confirm "Long Agentic" (LiveBench's name) is fine, or map it to the old "Long-Horizon" label |

---

## Owner inputs

- **O1 (existing): Artificial Analysis API key**, locally and as the GitHub secret
  `ARTIFICIAL_ANALYSIS_API_KEY`. Without it Task 2.3 waits, and most models keep a single level.
- Yes to start (Phase 0); yes to push/merge (Task 4.1); deploy route (O3 Workers Builds or `npm run deploy`).
- If Task 1.1 finds only an older LiveBench release: accept the older data, or keep the
  stale 2026-09-02 store until LiveBench publishes a newer `/v1/` file.

---

## Decisions

- Data first, then the view: the 17/10 logic is right; the gap is missing measurements and unlabeled scores *(assumed)*.
- Keep "LiveBench = newest release" (DECISIONS 30/09); no mixing of releases to gain effort rows *(assumed)*.
- A LiveBench bare-name score is shown at every level with an "effort not stated" label, because it is still the published number, never relabelled as a level *(assumed)*.
- A level with no measurement shows "Not measured at {level}" plus buttons for the measured levels; no number is borrowed *(assumed)*.
- `none` (Terminal-Bench) is a real level, ranked below `low` *(assumed)*.
- The score-at-effort rule lives in `lib/compare.mjs` so Node tests cover it *(assumed)*.

**Options, not built:** effort-progression delta view (STATUS Next up 1); a `paths.historyFile` for canary history on CI; moving the AA key into an adapter env header (adapter-ingestion 0.6) to drop the `fetchImpl` wrapper.

---

## Progress Log

*(Append only. Newest at the bottom. Never rewrite an entry — if it turned out wrong,
add a new one saying so. This log is what makes resuming cheap: a cold session reads
the last entry and knows exactly where to start.)*

- **20/10/2026 — Phase 0 done.** Branch `feat/effort-levels` from local `main` `17245bc`
  (Plan issue 1). `npm ci` ok; engine 0.6.0; Node v22.23.2. `npm test` 97/97 pass;
  `verify:fixtures` 5/5 PASS; `npx tsc --noEmit` exit 0. Phase 1 re-check: `/v1/table_2026_06_25.csv`
  → 200 (Plan issue 2 for run history). Next: Task 1.1.
- **20/10/2026 — Phase 1 done.**
  - 1.1: newest release is LiveBench 2 `20261014` at `https://livebench.ai/data/20261014/{table.csv,cost.csv,categories.json}`.
    Release ids in the bundle are `_e=["YYYYMMDD",…]`; the v1 archive ends 2026-06-25.
    Effort-suffixed rows: 0 (Plan issue 3).
  - 1.2 `ce9fd3d`: `npm test` 100/100; live `discoverLatestRelease()` → `2026-10-14`.
  - 1.3, on store copies in scratch: openrouter ok (470 parsed); livebench-scores ok
    (fetched/parsed 336, written 336); livebench-cost ok (48/48); terminal-bench ok (35, unchanged 35).
    Canaries ok; no tracked change.
  - 1.4 `d5c5030` (Plan issue 4): `build:data` on that store → livebench 48 rows (matched 40),
    release 2026-10-14; data/store restored.
  - Checkpoint: `npm test` 101/101, fixtures 5/5, tsc 0.
  - Not run: `npm run build` / `verify:ui`; the category label change is visible on the site.
  - Phase 2 re-check answer: LiveBench contributes no effort variants. Task 2.2 only guards the parser;
    AA (Task 2.3, O1) is the main effort source.
  - Next: Task 2.1.
