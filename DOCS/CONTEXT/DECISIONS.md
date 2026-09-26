# Decisions

Append durable decisions; do not rewrite history.

- **26/09/2026 — Project created on E: drive at `E:\model-bench`.** Isolated repo,
  own git history, canonical DOCS structure from day one.
- **26/09/2026 — Stack: Next.js web app.** Owner chose it over Vite SPA and Electron;
  API routes can run ingestion on demand.
- **26/09/2026 — Sources: JSON-first only for MVP.** Owner constrained the source list
  to what `@shrinivas-sn/adapter-ingestion` supports natively (JSON GET, no auth):
  OpenRouter models API, SWE-bench experiments repo, LiveBench repo data. LMArena,
  Artificial Analysis, HuggingFace leaderboards deferred.
- **26/09/2026 — OpenRouter model IDs are the canonical registry.** Benchmark-site model
  names alias into OpenRouter IDs via per-source alias tables; wrong aliasing silently
  corrupts every comparison, so alias maps get fixture tests.
- **26/09/2026 — Per-benchmark comparison only; never average raw scores.** SWE-bench %,
  LiveBench scores and Elo are incommensurable scales. Percentile-rank or weighted
  composites are separate, clearly-labelled views if added later.
- **26/09/2026 — Head-to-head compare is the core playground view.** Owner picked it as
  the day-one view: 2–3 models side by side with delta highlighting and radar chart.
  Benchmark matrix and price-performance frontier are secondary views.
- **26/09/2026 — Data freshness: GitHub Actions cron.** 3 jobs, each with
  `concurrency: ingest-<host>` (the adapter-ingestion README's own mutual-exclusion
  pattern), committing refreshed JSONL stores.
- **26/09/2026 — Jev design layer: adopt the gate + catalog, skip the wholesale scaffold.**
  Analyzed `E:\OSC\api-projects\pipeline\design\` (ui-design-chain-gate.js,
  scaffold-frontend.js, catalog/). Final verdict:
  - **Adopt** `ui-design-chain-gate.js` + 196-pick catalog as the design-token authority:
    it resolves archetype/palette/typography/motion from project context via the Jev
    System-1 decision layer, emits WCAG-AA-checked `design-tokens.json` + CSS variables,
    and ships palette/typography/motion checklists. Run once at scaffold time with
    `domain: "ai-benchmark-analytics"`, `targetAudience: "developers"`; consume the tokens
    in the Next.js app. Dry-run fallback exists (terminal-dev / zinc-emerald /
    inter-jetbrains / snappy-utilitarian).
  - **Skip** `scaffold-frontend.js` as a generator: its pages are GST-HSN-specific
    (HSN/SAC search, chapters) and it emits React+Vite, while Model Bench is Next.js with
    different views. Adopt its *patterns* instead: tokens → CSS variables, catalog
    checklists as review gates, strict zero-slop constraints.
  - **Deferred:** `slop-prelint-gate.js` (smart-tier slop pre-check) — useful once there
    is generated copy to review. The builder pipeline's dedupe/prescreen/awesome-list
    gates don't apply — Model Bench is a personal tool, not a public-API project.
  - Rationale: reuse of the owner's own tested tooling (82+ pipeline tests), consistent
    with the anti-slop requirement (catalog picks are pre-vetted), zero invented design.- **26/09/2026 — Ingestion discipline.** Adapters are pinned once verified; editing an adapter `map` re-appends the whole source as `changed` (adapter-ingestion gotcha).
  Canary status and run reports feed the UI's freshness badges.
- **26/09/2026 — `store/` and `data/` are tracked in git; `runs/` is ignored.** The JSONL stores are the
  append-only history of the pipeline, and `data/scores.json` + `data/freshness.json` are committed by
  the daily cron — so the initial `.gitignore` excluding `store/`/`data/` was a bug (it would have
  broken the workflow's `git add store/ data/` on CI). Transient per-run logs under `runs/` stay
  untracked.
- **27/09/2026 — Hosting: Static export for Cloudflare Workers Static Assets.**
  Added `output: "export"` and `trailingSlash: false` to `next.config.mjs`.
  The 26/09 note "API routes can run ingestion on demand" is superseded: ingestion runs exclusively
  in GitHub Actions daily cron (or local script), writing to `data/scores.json` and `data/freshness.json`.
  The frontend is completely static, with zero server runtime or database, achieving fastest load
  times and zero-cost hosting on Cloudflare Workers Static Assets.
