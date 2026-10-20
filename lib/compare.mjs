/**
 * Pure helpers for the compare (head-to-head) page.
 *
 * Ties published benchmark runs and API evaluation records to the user's picked
 * model variant, strictly without synthetic scaling or unproven best-of attribution.
 */
import { EFFORT_LEVELS } from "../normalization/effort.mjs";

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

const AT_EFFORT_SOURCES = {
  livebench: { effortKey: "effort", valueOf: (r) => r.overall },
  terminal_bench: { effortKey: "reasoning_effort", valueOf: (r) => r.accuracy },
  artificial_analysis: { effortKey: "effort", valueOf: (r) => r.intelligence_index },
};

const levelRank = (e) => {
  const i = EFFORT_LEVELS.indexOf(e);
  return i === -1 ? EFFORT_LEVELS.length : i;
};

/**
 * The one rule for "this model's score on this source at effort X".
 * Published numbers only: a level nobody measured is "not-measured" (value null)
 * and lists the levels that were measured; a row with no stated effort is still
 * the published number, returned as "effort-not-stated".
 *
 * @param {object|null} model  LiveBench row the user picked (canonical_id, family_id)
 * @param {"livebench"|"terminal_bench"|"artificial_analysis"} source
 * @param {string|null} effort
 * @param {{ livebench?: object[], terminal_bench?: object[], artificial_analysis?: object[] }} data
 * @returns {{ status: "measured"|"not-measured"|"effort-not-stated", value: number|null, row: object|null, measuredEffort: string|null, measuredLevels: string[] }}
 */
export function scoreAtEffort(model, source, effort, data) {
  const cfg = AT_EFFORT_SOURCES[source];
  const notMeasured = (levels) => ({
    status: "not-measured",
    value: null,
    row: null,
    measuredEffort: null,
    measuredLevels: levels,
  });
  if (!model || !cfg) return notMeasured([]);

  const rows = data?.[source] || [];
  let mine;
  if (source === "livebench") {
    const fam = model.family_id || null;
    const can = model.canonical_id || null;
    mine = rows.filter(
      (r) => (fam && r.family_id === fam) || (can && r.canonical_id === can) || r === model
    );
  } else {
    mine = model.canonical_id ? rows.filter((r) => r.canonical_id === model.canonical_id) : [];
  }
  if (!mine.length) return notMeasured([]);

  const val = (r) => {
    const v = cfg.valueOf(r);
    return v == null ? -Infinity : Number(v);
  };
  // Same order the UI already uses for several runs at one level: best first.
  mine = [...mine].sort((a, b) => val(b) - val(a));
  const effortOf = (r) => (r[cfg.effortKey] == null ? null : String(r[cfg.effortKey]).toLowerCase());
  const found = (row) => {
    const e = effortOf(row);
    return {
      status: e ? "measured" : "effort-not-stated",
      value: cfg.valueOf(row) ?? null,
      row,
      measuredEffort: e,
      measuredLevels: [],
    };
  };

  const target = effort == null ? null : String(effort).toLowerCase();
  if (target == null) {
    // Nothing picked: prefer the row the user picked, else the best one, labelled as it is.
    return found(mine.includes(model) ? model : mine[0]);
  }
  const exact = mine.find((r) => effortOf(r) === target);
  if (exact) return found(exact);
  const bare = mine.find((r) => effortOf(r) == null);
  if (bare) return found(bare);
  const levels = [...new Set(mine.map(effortOf).filter(Boolean))].sort(
    (a, b) => levelRank(a) - levelRank(b)
  );
  return notMeasured(levels);
}
