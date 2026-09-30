/**
 * LiveBench score calculations — identical to the livebench.ai site.
 *
 * Rules:
 *  - Category score = arithmetic mean of all present, numeric task scores in that category.
 *    Categories with no present tasks are omitted.
 *  - Overall score = arithmetic mean of category averages. If ANY category is missing,
 *    overall is null.
 *  - Rounding is applied only at output (display/serialization time), to 2 decimals.
 */

/**
 * Compute average for each category in categoryMap from raw task scores.
 *
 * @param {Record<string, number>} tasks
 * @param {Record<string, string[]>} categoryMap
 * @returns {Record<string, number>}
 */
export function categoryAverages(tasks, categoryMap) {
  const result = {};
  if (!tasks || !categoryMap) return result;

  for (const [cat, taskNames] of Object.entries(categoryMap)) {
    let sum = 0;
    let count = 0;
    for (const t of taskNames) {
      const val = tasks[t];
      if (typeof val === "number" && !Number.isNaN(val)) {
        sum += val;
        count += 1;
      }
    }
    if (count > 0) {
      result[cat] = sum / count;
    }
  }
  return result;
}

/**
 * Compute overall score as the mean of category averages.
 * Returns null if any category in categoryNames is missing from averages.
 *
 * @param {Record<string, number>} averages
 * @param {string[]} categoryNames
 * @returns {number | null}
 */
export function overallScore(averages, categoryNames) {
  if (!averages || !categoryNames || categoryNames.length === 0) return null;
  let sum = 0;
  for (const cat of categoryNames) {
    const val = averages[cat];
    if (typeof val !== "number" || Number.isNaN(val)) {
      return null;
    }
    sum += val;
  }
  return sum / categoryNames.length;
}

/**
 * Round a number to 2 decimal places. null/undefined stays null.
 *
 * @param {number | null | undefined} x
 * @returns {number | null}
 */
export function round2(x) {
  if (x == null || typeof x !== "number" || Number.isNaN(x)) return null;
  return Number(x.toFixed(2));
}

/**
 * Ensure all given task names belong to at least one category.
 *
 * @param {string[]} taskNames
 * @param {Record<string, string[]>} categoryMap
 * @throws {Error} If any task is not in any category
 */
export function assertTasksCategorised(taskNames, categoryMap) {
  const allCategorised = new Set();
  for (const tasks of Object.values(categoryMap || {})) {
    for (const t of tasks) {
      allCategorised.add(t);
    }
  }

  const uncategorised = [];
  for (const t of taskNames || []) {
    if (!allCategorised.has(t)) {
      uncategorised.push(t);
    }
  }

  if (uncategorised.length > 0) {
    throw new Error(
      `LiveBench tasks without a category: ${uncategorised.join(
        ", "
      )} — update normalization/categories.mjs from categories_<release>.json`
    );
  }
}
