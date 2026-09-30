import { resolveAlias } from "./registry.mjs";

/**
 * Resolve a model label from an external source to a canonical catalog model id.
 *
 * Checks in order:
 * 1. Exact reviewed manual alias lookup by `${org}|${label}`
 * 2. Automatic alias match on combined `[org, label].join(" ")`
 * 3. Automatic alias match on `label` alone
 *
 * @param {object} params
 * @param {object} params.aliasIndex
 * @param {Record<string, Record<string, string>>} params.manual
 * @param {string} params.source
 * @param {string | null} [params.org]
 * @param {string | null} [params.label]
 * @returns {{ canonical: string, method: string } | null}
 */
export function resolveSourceModel({ aliasIndex, manual, source, org, label }) {
  if (source && manual && manual[source]) {
    const key = `${org || ""}|${label || ""}`;
    const canonical = manual[source][key];
    if (canonical) {
      return { canonical, method: "manual" };
    }
  }

  const combined = [org, label].filter(Boolean).join(" ");
  if (combined) {
    const hitCombined = resolveAlias(aliasIndex, combined);
    if (hitCombined) return hitCombined;
  }

  if (label) {
    const hitLabel = resolveAlias(aliasIndex, label);
    if (hitLabel) return hitLabel;
  }

  return null;
}
