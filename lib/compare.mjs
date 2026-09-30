/**
 * Pure helpers for the compare (head-to-head) page.
 *
 * Ties published benchmark runs and API evaluation records to the user's picked
 * model variant, strictly without synthetic scaling or unproven best-of attribution.
 */

/**
 * Filter and sort benchmark rows for a given canonical model ID and variant effort.
 *
 * @template T
 * @param {Array<T>} rows
 * @param {string|null} canonicalId
 * @param {string|null} effort
 * @param {string} effortKey
 * @returns {{ exact: T|null, all: Array<T> }}
 */
export function runsForVariant(rows, canonicalId, effort, effortKey) {
  if (!rows || !canonicalId) {
    return { exact: null, all: [] };
  }

  const all = rows.filter((r) => r.canonical_id === canonicalId);

  const scoreVal = (r) => {
    if (r.accuracy != null) return Number(r.accuracy);
    if (r.intelligence_index != null) return Number(r.intelligence_index);
    return -Infinity;
  };

  all.sort((a, b) => scoreVal(b) - scoreVal(a));

  let exact = null;
  if (effort != null) {
    const target = String(effort).toLowerCase();
    exact =
      all.find(
        (r) =>
          r[effortKey] != null &&
          String(r[effortKey]).toLowerCase() === target
      ) || null;
  }

  return { exact, all };
}

/**
 * Compute difference between two numeric scores, rounded to 2 decimal places.
 *
 * @param {number|null} a
 * @param {number|null} b
 * @returns {number|null}
 */
export function scoreDelta(a, b) {
  if (a == null || b == null) return null;
  return Number((a - b).toFixed(2));
}
