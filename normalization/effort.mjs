import { normKey } from "./registry.mjs";

export const EFFORT_LEVELS = ["max", "xhigh", "high", "medium", "low"];

const EFFORT_SUFFIX_RE = /-(max|xhigh|high|medium|low)-effort$/;
const XHIGH_RE = /-xhigh$/;
const HIGH_RE = /-high$/;
const MEDIUM_LOW_RE = /-(medium|low)$/;

/**
 * Parse reasoning-effort level and thinking indicator from a LiveBench model name.
 * Rule: only explicit forms count. Bare trailing `-max` is a product tier, so it
 * remains null (effort not stated).
 *
 * @param {string} name
 * @returns {{ effort: "max"|"xhigh"|"high"|"medium"|"low"|null, thinking: boolean }}
 */
export function parseEffort(name) {
  const key = normKey(name);
  if (!key) {
    return { effort: null, thinking: false };
  }

  const tokens = key.split("-");
  const thinking = tokens.includes("thinking");

  let effort = null;
  const matchExplicit = key.match(EFFORT_SUFFIX_RE);
  if (matchExplicit) {
    effort = matchExplicit[1];
  } else if (XHIGH_RE.test(key)) {
    effort = "xhigh";
  } else if (HIGH_RE.test(key)) {
    effort = "high";
  } else {
    const matchMedLow = key.match(MEDIUM_LOW_RE);
    if (matchMedLow) {
      effort = matchMedLow[1];
    }
  }

  return { effort, thinking };
}

/**
 * Strip explicit reasoning effort suffixes from a model name according to rules 1-4.
 * Bare trailing `-max` is preserved (not an effort suffix).
 *
 * @param {string} name
 * @returns {string}
 */
export function stripEffort(name) {
  const key = normKey(name);
  if (!key) return "";
  if (EFFORT_SUFFIX_RE.test(key)) {
    return key.replace(EFFORT_SUFFIX_RE, "");
  }
  if (XHIGH_RE.test(key)) {
    return key.replace(XHIGH_RE, "");
  }
  if (HIGH_RE.test(key)) {
    return key.replace(HIGH_RE, "");
  }
  if (MEDIUM_LOW_RE.test(key)) {
    return key.replace(MEDIUM_LOW_RE, "");
  }
  return key;
}

/**
 * Return supported reasoning effort levels only when the provider publishes them.
 * No fallbacks or assumed levels.
 *
 * @param {object} [fields]
 * @returns {string[] | null}
 */
export function supportedEffortsFrom(fields) {
  if (
    fields &&
    Array.isArray(fields.reasoning?.supported_efforts) &&
    fields.reasoning.supported_efforts.length > 0
  ) {
    return fields.reasoning.supported_efforts;
  }
  return null;
}

