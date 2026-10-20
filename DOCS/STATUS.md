# Project status

**As of 20/10/2026.** Repo `E:/model-bench`, branch `main`.

## Current state
- **Live at https://model-bench.shrinu.workers.dev** (Next.js 15 static export on Cloudflare Workers).
- 17/10: measured-only effort switch committed (`dbc44c8`; detail in `DOCS/WORK/archive.md`).
- 19/10: adapter-ingestion moved `^0.2.0` → `^0.6.0` (`2446b1f`, pushed). No code change:
  97/97 tests, fixtures 5/5, identical stage counts on 0.2.0 vs 0.6.0 (store copies).
- **Daily ingest red since 19/10** (also 16/10, 17/10): both LiveBench jobs `E_HTTP_STATUS` 404.
  Cause: LiveBench moved CSVs to `https://livebench.ai/v1/table_<YYYY_MM_DD>.csv`
  (and `cost_…`); only 2026-06-25 exists there, not the 2026-09-02 the app shows.
  `ingestion/sources/livebench.mjs` still builds the old root URLs. Not fixed yet.
- 20/10: adapter-ingestion **0.8.0** released: `access.kind: "csv"` (header row, one record per
  row) and `{ "template": "..." }` map rule (builds `url`/ids from columns). model-bench 97/97 +
  fixtures 5/5 on 0.8.0 (`--no-save`, restored; still on `^0.6.0`). Could replace
  `ingestion/sources/csv.mjs` + the cost `fetchImpl`; the scores unpivot still needs code.
  `/v1/table_2026_06_25.csv` and `/v1/cost_2026_06_25.csv` answered 200 on 20/10.
- **Effort levels are thin because data is missing**: LiveBench 0/49 rows with effort,
  Terminal-Bench multi-effort for 3 models, Artificial Analysis not connected (no secret).

## Plan
- **`PLAN.md` (written 19/10/2026, not started)**: effort levels that really work.
  Phase 1 LiveBench fix; Phase 2 effort coverage + parser + AA; Phase 3 every score
  labelled with its effort / "Not measured at {level}"; Phase 4 ship. plan-check exit 0.

## Pending
- **Owner inputs**:
  - O1: Artificial Analysis API key as GitHub secret `ARTIFICIAL_ANALYSIS_API_KEY` (`gh secret list` empty on 19/10).
  - O3: Connect Cloudflare Workers Builds to the repo so daily data commits redeploy.
- Verification limit: `npm run build` / `verify:ui` not run this session.

## Next up (start here)
1. Owner says go → execute `PLAN.md` from Task 0.1 (branch `feat/effort-levels`); first
   re-run its Facts `curl` probes, LiveBench may have changed again.
2. Later (option, not in plan): effort-progression delta visualizer.
