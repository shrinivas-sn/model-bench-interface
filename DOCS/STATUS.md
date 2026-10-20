# Project status

**As of 20/10/2026.** Repo `E:/model-bench`, branch `main`.

## Current state
- **Live at https://model-bench.shrinu.workers.dev** (Next.js 15 static export on Cloudflare Workers).
  The live site still runs the pre-20/10 build until `npm run deploy` is run (see Next up).
- **Effort-levels plan done and closed 20/10** (archived in `DOCS/WORK/2026-10-20/WORK.md`).
  All of it is on `main`, pushed (`b5f6e8c`):
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
  - Deploy: `git pull --ff-only` (the ingest bot's 20/10 data commit), then `npm run deploy`.
    Both were blocked for Claude by the session's permission check.
  - O1: Artificial Analysis API key as GitHub secret `ARTIFICIAL_ANALYSIS_API_KEY` (still empty 20/10).
    It is the widest effort source; with it, run the AA job and re-run the coverage report (old Task 2.3).
  - O3: Connect Cloudflare Workers Builds so daily data commits redeploy.
  - `probe/` is gitignored, so `verify-ui.mjs` (with the new effort checks) exists only on this machine.
    Decide whether to track it.
- "Not measured at {level}" is unit-tested but not reachable with today's data.
  It appears once AA or LiveBench adds effort levels.

## Next up (start here)
1. Owner: `git pull --ff-only && npm run deploy`, then open the site and try claude-opus-5 at low vs max.
2. When O1 lands: run the AA ingest and `node normalization/effort-coverage.mjs data/scores.json <out.md>`.
3. Later (option): effort-progression delta visualizer.
