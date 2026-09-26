# WORK — 26/09/2026

## Plan

1. Brainstorm the Model Bench product: analyze LLM benchmarks (Claude, GPT, Gemini, others)
   via `@shrinivas-sn/adapter-ingestion`, normalize into a canonical store, and serve an
   interactive playground for choosing the best model per work type.
2. Lock the decisions that shape everything downstream (stack, sources, core view,
   freshness model) with the owner.
3. Initialize the project properly on the E: drive with the canonical DOCS structure
   (docs-structure-standard) from day one.
4. Analyze the owner's Jev data layer (`E:\OSC\api-projects\pipeline\`) — specifically the
   design chain — and make a final verdict on using it for this project's frontend, with
   no-AI-slop as a hard requirement.

## Execution

### Decisions locked (owner via multiple-choice)

- **Stack:** Next.js web app (over Vite SPA, Electron).
- **Sources:** JSON-first only — OpenRouter `/api/v1/models` (also the model-registry
  backbone), SWE-bench `experiments` repo, LiveBench repo data. Web search confirmed both
  benchmark sources publish raw JSON on GitHub.
- **Core view:** head-to-head compare (2–3 models side by side, delta highlighting, radar).
- **Freshness:** GitHub Actions cron, `concurrency: ingest-<host>` per job.

### Jev data layer analysis (final verdict)

Read: `pipeline/README.md`, `PLAN-jev-workflow.md`, `decide/` (decide.js contract, schemas),
`design/ui-design-chain-gate.js`, `design/scaffold-frontend.js`, `design/catalog/index.js`,
`decide/schemas/ui-design-chain.json`.

What it is: a System-1 decision layer (`decide()` via classifier.dev, `@receptron/laya`
local fallback) with a design decision point that maps project context → archetype /
palette / typography / motion, resolved against a 196-pick modular catalog (palettes,
typography, heroes, navs, cards, stats, footers, motion curves/patterns, checklists), and
emits `design-tokens.json` + CSS variables with WCAG-AA palettes and review checklists.

**Verdict: adopt the design gate + catalog; skip the wholesale scaffold.**

- Adopt: `ui-design-chain-gate.js` as the design-token authority. It is generic (context =
  name/slug/one_liner/domain/audience), pre-tested (82+ pipeline tests), confidence-gated
  with conservative fallback, and directly enforces the no-slop requirement structurally.
- Skip: `scaffold-frontend.js` generation — its pages are GST-HSN-specific and it emits
  React+Vite, not Next.js. Its patterns (tokens → CSS variables, catalog checklists,
  zero-slop constraints) are adopted instead.
- Deferred: `slop-prelint-gate.js` for generated copy; builder pipeline's other gates
  (dedupe/prescreen/awesome-list) don't apply — this is a personal tool, not a public API.

Full rationale in `CONTEXT/DECISIONS.md`.

### Project initialization

- `E:\model-bench` created, `git init` on `main`.
- DOCS structure created: this file, `DOCS/README.md` index, `DOCS/STATUS.md`,
  `DOCS/CONTEXT/DECISIONS.md`.
- Note: an earlier session attempt created the repo but its files did not persist; recreated
  fresh this session with identical decisions recorded.

### Build-out (earlier this session)

- Scaffolded the Next.js app consuming the Jev design tokens; 4 playground views.
- Wrote 4 declarative adapters (openrouter, swe-bench-verified, livebench-scores,
  livebench-cost) with `fetchImpl` transforms and captured fixtures; added
  `verify-fixtures.mjs` gating trust at parse ratio ≥ 0.8.
- Probed and pinned the real source endpoints (leaderboards.json for SWE-bench;
  LiveBench site CSVs) — see README provenance table.
- Normalization layer: `registry.mjs` (canonical OpenRouter ids + progressive alias
  matcher with honest method reporting), `categories.mjs` (task→category→capability),
  `build-data.mjs` → `data/scores.json` + data-quality report.
- GitHub Actions cron `.github/workflows/ingest.yml` (02:30 UTC daily).

### Session continuation — verification + fixes

- Ran the full gate: `npm test` 13/13 pass; `npm run verify:fixtures` → all 4 adapters
  parse fixtures at ratio 1.00; `npm run build` clean after clearing a stale `.next`
  cache (`PageNotFoundError` on page-data collection — resolved by `rm -rf .next`).
- Fresh live ingest confirmed: openrouter 458, swe-bench-verified 180,
  livebench-scores 1,449 rows, livebench-cost 63 — all canaries OK.
- **Bug fixed:** `.gitignore` excluded `store/` and `data/` while the ingest workflow's
  commit step does `git add store/ data/` — on CI that add would fail ("paths ignored"),
  breaking the daily refresh. Removed both from `.gitignore` (kept `runs/` ignored —
  transient run logs; `store/` + `data/` are meant to accumulate history in git).
- Updated `DOCS/STATUS.md` from "no code exists yet" to the true state (MVP built and
  verified, with current match rates and pending items).

### Phase 1 & 2 UI Redesign — Execution

- **Phase 1 Task 1.1:** Created `normalization/effort.mjs` and `normalization/test/effort.test.mjs`.
  Implemented `EFFORT_LEVELS` and `parseEffort(name)` honoring the honesty constraint: only explicit forms count; bare `-max` returns `null` (not stated). All 26 tests pass. Committed (`3dba4d6`).
- **Phase 1 Task 1.2:** Exported `stripEffort(name)` from `effort.mjs` with tests (27/27 pass).
  Updated `normalization/build-data.mjs` to emit `effort`, `thinking`, `family_id`, and `display_vendor` on LiveBench rows, and `vendor_display` at root. Updated `LivebenchModel` and `ScoresData` types in `lib/data.ts`. Tested with `build:data`, `npx tsc --noEmit`, and `next build` static export. Committed (`2d57dd3`).
- **Phase 2 Task 2.1 (Component Source Retrieval via design-source):**
  - Queried shadcn registry for `command` (on `cmdk`) and `drawer` (on `vaul`).
  - Packages installed: `cmdk@1.1.1` and `vaul@1.1.2`, verified with React 19 compatibility (`npm ls cmdk vaul` clean).
  - Source adaptation: registry Tailwind utilities (`bg-popover`, `border-border`, etc.) adapted to plain CSS using `:root` design tokens (`--bg-canvas`, `--bg-card`, `--bg-hover`, `--border`, `--primary`, `--text-main`, `--text-muted`, `--motion-duration`). Dialog layout for desktop (≥640px) and Vaul bottom-sheet drawer for mobile (<640px) with `prefers-reduced-motion` fallbacks.

## Artifacts

- `DOCS/README.md` — work-log index
- `DOCS/STATUS.md` — current state, pending, next steps
- `DOCS/CONTEXT/DECISIONS.md` — all decisions incl. Jev verdict
- `ingestion/` adapters + fixtures + sources; `normalization/` registry + build + effort;
  `app/` + `components/` playground; `design-tokens.json`; `.github/workflows/ingest.yml`

## Next

1. Complete Phase 2 Task 2.2 (`components/ModelPicker.tsx`, `components/model-picker.css`, pure `groupModels` helper in `lib/picker.mjs` with unit tests).
2. Wire picker into `components/HeadToHead.tsx` with query param state (`?a=...&b=...`).

