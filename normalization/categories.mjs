/**
 * LiveBench task -> category mapping (categories_2026_06_25.json, captured 26/09/2026)
 * and the canonical capability axes the playground uses for radar views.
 *
 * Capability axes are decided here, not per-view, so every view aggregates the same way.
 */
export const LIVEBENCH_CATEGORIES = {
  Reasoning: ["theory_of_mind", "zebra_puzzle", "spatial", "logic_with_navigation"],
  Coding: ["code_generation", "code_completion"],
  "Agentic Coding": ["javascript", "typescript", "python"],
  Mathematics: ["AMPS_Hard", "integrals_with_game", "math_comp", "olympiad"],
  "Data Analysis": ["consecutive_events", "tablejoin", "tablereformat"],
  Language: ["connections", "plot_unscrambling", "typos"],
  IF: ["paraphrase", "simplify", "story_generation", "summarize"],
};

/** Canonical capability axes for radar/aggregation views. */
export const CAPABILITY_AXES = [
  "Agentic Coding",
  "Coding",
  "Reasoning",
  "Mathematics",
  "Data Analysis",
  "Language",
  "Instruction Following",
];

export function livebenchCategoryFor(task) {
  for (const [cat, tasks] of Object.entries(LIVEBENCH_CATEGORIES)) {
    if (tasks.includes(task)) return cat;
  }
  return null;
}

/** Map a LiveBench category name to a canonical capability axis. */
export function capabilityForLivebenchCategory(cat) {
  if (cat === "IF") return "Instruction Following";
  return CAPABILITY_AXES.includes(cat) ? cat : null;
}
