import { test } from "node:test";
import assert from "node:assert/strict";
import {
  categoryAverages,
  overallScore,
  round2,
  assertTasksCategorised,
} from "../livebench-scores.mjs";

test("categoryAverages computes mean for each category from present tasks", () => {
  const tasks = { a: 80, b: 60, c: 90 };
  const categoryMap = { X: ["a", "b"], Y: ["c", "d"] };
  assert.deepEqual(categoryAverages(tasks, categoryMap), { X: 70, Y: 90 });
});

test("categoryAverages omits categories when no tasks are present", () => {
  const tasks = { a: 80 };
  const categoryMap = { X: ["a"], Y: ["z"] };
  assert.deepEqual(categoryAverages(tasks, categoryMap), { X: 80 });
});

test("overallScore computes arithmetic mean across all required categories", () => {
  assert.equal(overallScore({ X: 70, Y: 90 }, ["X", "Y"]), 80);
});

test("overallScore returns null if any required category is missing", () => {
  assert.equal(overallScore({ X: 70 }, ["X", "Y"]), null);
});

test("round2 rounds number to 2 decimal places and handles null", () => {
  assert.equal(round2(71.23456), 71.23);
  assert.equal(round2(null), null);
  assert.equal(round2(undefined), null);
});

test("assertTasksCategorised throws if any task is uncategorised", () => {
  assert.throws(
    () => assertTasksCategorised(["a", "q"], { X: ["a"] }),
    (err) => {
      assert(err instanceof Error);
      assert(err.message.includes("q"));
      return true;
    }
  );
  assert.doesNotThrow(() => assertTasksCategorised(["a"], { X: ["a", "b"] }));
});
