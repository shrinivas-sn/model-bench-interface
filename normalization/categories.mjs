/**
 * LiveBench task -> category mapping (categories_<release>.json)
 * and the canonical capability axes the playground uses for radar views.
 *
 * Capability axes are decided here, not per-view, so every view aggregates the same way.
 */
export const LIVEBENCH_CATEGORIES_BY_RELEASE = {
  "2026-06-25": {
    Reasoning: ["theory_of_mind", "zebra_puzzle", "spatial", "logic_with_navigation"],
    Coding: ["code_generation", "code_completion"],
    "Agentic Coding": ["javascript", "typescript", "python"],
    Mathematics: ["AMPS_Hard", "integrals_with_game", "math_comp", "olympiad"],
    "Data Analysis": ["consecutive_events", "tablejoin", "tablereformat"],
    Language: ["connections", "plot_unscrambling", "typos"],
    IF: ["paraphrase", "simplify", "story_generation", "summarize"],
  },
  "2026-09-02": {
    "Long-Horizon": ["long_horizon"],
    Reasoning: ["reasoning"],
    Coding: ["coding"],
    Browser: ["browser"],
    "Data Analysis": ["data_analysis"],
    Research: ["research"],
    Design: ["design_layout"],
  },
  "2026-10-14": {
    "Long Agentic": ["long_agentic"],
    Reasoning: ["reasoning"],
    Coding: ["coding"],
    Browser: ["browser"],
    "Data Analysis": ["data_analysis"],
    Research: ["research"],
    Design: ["design"],
  },
};

/** Default / latest category mapping. */
export const LIVEBENCH_CATEGORIES = LIVEBENCH_CATEGORIES_BY_RELEASE["2026-10-14"];

/** Get the category map for a specific release, with fallback to latest. */
export function categoriesForRelease(release) {
  return (release && LIVEBENCH_CATEGORIES_BY_RELEASE[release]) || LIVEBENCH_CATEGORIES;
}

/** Canonical capability axes for radar/aggregation views. */
export const CAPABILITY_AXES = [
  "Agentic Coding",
  "Coding",
  "Reasoning",
  "Mathematics",
  "Data Analysis",
  "Language",
  "Instruction Following",
  "Long-Horizon",
  "Long Agentic",
  "Browser",
  "Research",
  "Design",
];

export function livebenchCategoryFor(task, release) {
  const map = release ? categoriesForRelease(release) : null;
  if (map) {
    for (const [cat, tasks] of Object.entries(map)) {
      if (tasks.includes(task)) return cat;
    }
    return null;
  }
  for (const [cat, tasks] of Object.entries(LIVEBENCH_CATEGORIES)) {
    if (tasks.includes(task)) return cat;
  }
  for (const rMap of Object.values(LIVEBENCH_CATEGORIES_BY_RELEASE)) {
    for (const [cat, tasks] of Object.entries(rMap)) {
      if (tasks.includes(task)) return cat;
    }
  }
  return null;
}

/** Map a LiveBench category name to a canonical capability axis. */
export function capabilityForLivebenchCategory(cat) {
  if (cat === "IF") return "Instruction Following";
  return CAPABILITY_AXES.includes(cat) ? cat : cat;
}

