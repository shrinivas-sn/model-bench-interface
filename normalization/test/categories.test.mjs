import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LIVEBENCH_CATEGORIES,
  LIVEBENCH_CATEGORIES_BY_RELEASE,
  categoriesForRelease,
  capabilityForLivebenchCategory,
  livebenchCategoryFor,
  CAPABILITY_AXES,
} from "../categories.mjs";
import { assertTasksCategorised } from "../livebench-scores.mjs";

test("categoriesForRelease returns category map for 2026-06-25", () => {
  const map = categoriesForRelease("2026-06-25");
  assert.ok(map.Reasoning);
  assert.ok(map.Coding);
  assertTasksCategorised(
    [
      "theory_of_mind",
      "zebra_puzzle",
      "spatial",
      "logic_with_navigation",
      "code_generation",
      "code_completion",
      "javascript",
      "typescript",
      "python",
      "AMPS_Hard",
      "integrals_with_game",
      "math_comp",
      "olympiad",
      "consecutive_events",
      "tablejoin",
      "tablereformat",
      "connections",
      "plot_unscrambling",
      "typos",
      "paraphrase",
      "simplify",
      "story_generation",
      "summarize",
    ],
    map
  );
});

test("categoriesForRelease returns category map for 2026-09-02", () => {
  const map = categoriesForRelease("2026-09-02");
  assert.ok(map["Long-Horizon"]);
  assert.ok(map.Reasoning);
  assert.ok(map.Coding);
  assert.ok(map.Browser);
  assert.ok(map["Data Analysis"]);
  assert.ok(map.Research);
  assert.ok(map.Design);
  assertTasksCategorised(
    [
      "design_layout",
      "research",
      "browser",
      "coding",
      "long_horizon",
      "data_analysis",
      "reasoning",
    ],
    map
  );
});

test("capabilityForLivebenchCategory maps categories to non-null axes", () => {
  assert.equal(capabilityForLivebenchCategory("IF"), "Instruction Following");
  assert.equal(capabilityForLivebenchCategory("Reasoning"), "Reasoning");
  assert.equal(capabilityForLivebenchCategory("Coding"), "Coding");
  assert.equal(capabilityForLivebenchCategory("Long-Horizon"), "Long-Horizon");
  assert.equal(capabilityForLivebenchCategory("Browser"), "Browser");
  assert.equal(capabilityForLivebenchCategory("Research"), "Research");
  assert.equal(capabilityForLivebenchCategory("Design"), "Design");
  for (const cat of Object.keys(LIVEBENCH_CATEGORIES)) {
    const axis = capabilityForLivebenchCategory(cat);
    assert.ok(axis != null && typeof axis === "string" && axis.length > 0);
  }
});

test("livebenchCategoryFor finds category for tasks from both releases", () => {
  assert.equal(livebenchCategoryFor("design_layout"), "Design");
  assert.equal(livebenchCategoryFor("long_horizon"), "Long-Horizon");
  assert.equal(livebenchCategoryFor("theory_of_mind"), "Reasoning");
  assert.equal(livebenchCategoryFor("code_generation"), "Coding");
  assert.equal(livebenchCategoryFor("design_layout", "2026-09-02"), "Design");
  assert.equal(livebenchCategoryFor("theory_of_mind", "2026-06-25"), "Reasoning");
});

test("categoriesForRelease returns category map for 2026-10-14 (LiveBench renamed two tasks)", () => {
  const map = categoriesForRelease("2026-10-14");
  assert.deepEqual(map["Long Agentic"], ["long_agentic"]);
  assert.deepEqual(map.Design, ["design"]);
  assertTasksCategorised(
    ["long_agentic", "reasoning", "coding", "browser", "data_analysis", "research", "design"],
    map
  );
  assert.equal(LIVEBENCH_CATEGORIES, LIVEBENCH_CATEGORIES_BY_RELEASE["2026-10-14"]);
  assert.equal(livebenchCategoryFor("long_agentic", "2026-10-14"), "Long Agentic");
  assert.ok(CAPABILITY_AXES.includes("Long Agentic"));
});
