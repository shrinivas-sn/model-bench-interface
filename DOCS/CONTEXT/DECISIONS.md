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
- **28/09/2026 — Palette overridden: five colours (graphite + amber + blue + green + red).**
  The Jev gate had resolved terminal-dev / zinc-emerald on 26/09. The owner rejected it as the
  generic emerald-on-near-black "AI product" look. The replacement is deliberately authored, not
  generated: one neutral graphite scale carries every surface, line and text tier, and only four
  hues carry meaning — amber is the accent and the Model A series, blue is Model B, green means
  healthy, red means error. Two consequences worth keeping:
  - **Effort chips are one amber ramp, not five hues.** Reasoning effort is ordinal data; five
    unrelated colours encoded no ordering at all. Chip intensity now rises with effort level.
  - **The background is not near-black and not a coloured gradient.** `#0f1216` with a
    neutral-to-neutral 180° wash, and surfaces layered by lightness so borders are not the only
    thing separating regions. `--text-faint` was raised to `#828d9c` after the browser probe
    measured the previous value at 4.18:1, below the 4.5:1 AA floor.
  Typography (Inter + JetBrains Mono) and motion (snappy-utilitarian) are unchanged.

- **28/09/2026 — All prices are USD per million tokens, normalised in `build-data.mjs`.**
  OpenRouter's API reports `pricing.prompt` in dollars **per token** (e.g. 0.00001) while
  LiveBench's cost CSV reports dollars **per million**. Both were written into the same
  `pricing.prompt` field, so the app multiplied nothing and rendered `$0.00/M` for 57 of 63
  rows. The unit is now fixed at the boundary: `build-data.mjs` emits only
  `pricing.input_per_million` / `pricing.output_per_million` (and the catalog matches), and the
  app reads only those. Any future price source must be converted before it leaves the build
  step — never in a component.

- **28/09/2026 — Model selection is a three-stage flow; the app owns search.**
  Company → model → reasoning effort, with the effort stage skipped entirely for families that
  have only one variant. Search moved off cmdk's built-in filter (`shouldFilter={false}`) to
  `searchFamilies` in `lib/picker.mjs`: every whitespace token must match (AND, not OR) and
  matches rank label > word > effort > benchmark name > vendor, so "opus max" narrows.
  Unmatched benchmark names stay searchable and reachable rather than being filtered away.
  Recents (`localStorage`, `mb.recentModels`) lead step one and supply the default A/B pair, so
  the same comparison never has to be searched twice.

- **28/09/2026 — UI changes are verified in a browser, not by reading code.**
  `probe/verify-ui.mjs` (wired as `npm run verify:ui`) serves the built `out/` folder, drives it
  with puppeteer-core against the installed Chrome, and measures: horizontal overflow, tap
  targets ≥44px, text contrast against the effective background, and the complete picker
  journey including the mobile bottom sheet at 390px. It caught a real defect that reading the
  code did not — selecting a model from a search query never reached the effort step, because a
  non-empty query kept overriding the stage. Because the site is a static export, the status
  strip uses a client `RelativeTime` component: a build-time relative age would freeze into the
  HTML.

- **27/09/2026 — Hosting: Static export for Cloudflare Workers Static Assets.**
  Added `output: "export"` and `trailingSlash: false` to `next.config.mjs`.
  The 26/09 note "API routes can run ingestion on demand" is superseded: ingestion runs exclusively
  in GitHub Actions daily cron (or local script), writing to `data/scores.json` and `data/freshness.json`.
  The frontend is completely static, with zero server runtime or database, achieving fastest load
  times and zero-cost hosting on Cloudflare Workers Static Assets.

- **30/09/2026 — Published numbers only.** No estimated, scaled or derived scores. Effort levels shown only when the benchmark tested them. Supersedes the 28/09 effort-scaling and workload estimator.
- **30/09/2026 — Sources: LiveBench (newest release), Terminal-Bench official board (tbench.ai), Artificial Analysis official API, OpenRouter for prices.** SWE-bench Verified retired: official board last updated 26/02/2026. BenchLM and OpenRouter-relayed benchmark numbers dropped: second-hand.
- **30/09/2026 — Name matching:** reviewed table normalization/manual-aliases.json; entries only after checking both names are the same model and version.
