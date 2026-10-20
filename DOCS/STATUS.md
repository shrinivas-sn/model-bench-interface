# Project status

**As of 20/10/2026.** Repo `E:/model-bench`, branch `main`.

## Current state
- **Robust effort/model pipeline 20/10** (`575ca01`, `cfa788d`, `e6ffeea`):
  - One effort list (`normalization/effort.mjs`: max…low, default, minimal, none).
    AA "(Reasoning)" = default, "(Non-reasoning)" = none, "(Minimal)" = minimal,
    "(X, Default Fallback)" = X (owner decisions).
  - `model_key` joins sources on the OpenRouter id, else the model's own name (`normalization/model-key.mjs`).
  - The picker adds important models LiveBench hasn't scored, by data rule:
    on Terminal-Bench, or AA-scored + OpenRouter-priced + LiveBench-tracked lab + released ≤ 180 days.
  - No model names in code (default pair = top LiveBench overall + best other company).
  - Result: 66 picker models (18 new), 30 with ≥ 2 measured levels; Opus 5.5 has all 5.
  - AA block: time to first token lower = better; a missing index reads "Not published by AA".
  - Daily workflow deploys to Cloudflare once the `CLOUDFLARE_API_TOKEN` secret exists (skips until then).
  - Gates: 121/121 tests, fixtures 5/5, tsc 0, build ok, verify:ui 107/107.
- **Effort-levels plan done and closed 20/10** (archived in `DOCS/WORK/2026-10-20/WORK.md`).
  All of it is on `main`, pushed:
  - **LiveBench ingest fixed.** LiveBench 2 serves `https://livebench.ai/data/<YYYYMMDD>/{table,cost}.csv`;
    the release ids are in its bundle. Manual ingest run 39382018552 was green on release 2026-10-14
    (48 models). The new release renames `long_horizon`→`long_agentic` ("Long Agentic") and
    `design_layout`→`design`; the categories map is added.
  - **Effort coverage** (`normalization/effort-coverage.mjs`, report in `DOCS/WORK/2026-10-20/`):
    3 models with ≥ 2 measured levels (claude-fable-5.1, claude-opus-5, gpt-6-astra, all Terminal-Bench);
    LiveBench 2026-10-14 has 0 effort rows. `none` is now the lowest level.
  - **Every head-to-head score shows its effort:** `scoreAtEffort` in `lib/compare.mjs`.
    Each side shows the chip, "effort not stated" or "Not measured at {level}" with buttons for the measured levels.
    The matrix uses the same wording.
  - Gates: 111/111 tests, fixtures 5/5, tsc 0, build ok, verify:ui 101/101.
- adapter-ingestion **0.8.0** csv kind available (still on `^0.6.0`). It could replace `csv.mjs` and the cost
  `fetchImpl`, but the scores unpivot still needs code. Optional.

## Pending
- **Owner actions**:
  - O3: Connect Cloudflare Workers Builds so daily data commits redeploy.
  - `probe/` is gitignored, so `verify-ui.mjs` (with the new effort checks) exists only on this machine.
    Decide whether to track it.
- Not deployed yet: the new code reaches the site via `npm run deploy`, or via the daily job once the token is set.
- Known limits:
  - A model with no stated effort on any source shows its numbers as "effort not stated", with no buttons
    (e.g. MiniMax-M3, Step 5 Preview).
  - Names that differ beyond punctuation are not joined: `muse-wonder-1.0` (LiveBench) vs "Muse Wonder" (AA)
    shows twice; `gemini-3.1-pro` vs AA "Gemini 3.1 Pro Preview" stays separate.
    These are never guessed; `normalization/manual-aliases.json` is the place for reviewed aliases.

## Next up (start here)
1. Owner: create a Cloudflare API token (Workers Scripts: Edit) and run `gh secret set CLOUDFLARE_API_TOKEN`
   (and `gh secret set CLOUDFLARE_ACCOUNT_ID`). Then `gh workflow run ingest.yml` and confirm the deploy step ran.
2. Option: reviewed aliases for the two duplicate/separate pairs above.
