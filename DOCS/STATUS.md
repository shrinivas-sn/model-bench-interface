# Project status

**As of 20/10/2026.** Repo `E:/model-bench`, branch `main`.

## Current state
- **Artificial Analysis connected 20/10** (secret set; free endpoint returns 706 models; cap raised to 2000, `2079f91`).
  - Owner decision: an AA name like "Claude Opus 5.5 (Max, Default Fallback)" counts as max effort,
    and the full name is shown (`8fff2ae`).
  - Pickable models with ≥ 2 effort buttons went from 3 to 22 of 48; Opus 5.5 now has all 5.
  - "Not measured at {level}" is now reachable and browser-checked; verify:ui 104/104.
- **Live at https://model-bench.shrinu.workers.dev** (Next.js 15 static export on Cloudflare Workers).
  Deployed 20/10 (version d399fc2a; LiveBench 2026-10-14 live).
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
- Not yet deployed: the AA data and parser fix are on `main` but the live site predates them (owner runs `npm run deploy`).
- Pre-existing AA block issues seen 20/10, not fixed:
  - "Time to first token": a higher value is coloured as leading, but lower is better.
  - A missing index reads "Not on this leaderboard".

## Next up (start here)
1. Owner: `npm run deploy`, then check Opus 5.5 low vs max on the live site.
2. Option: fix the AA block's "time to first token" colouring (lower is better) and its missing-index wording.
3. Later (option): effort-progression delta visualizer.
