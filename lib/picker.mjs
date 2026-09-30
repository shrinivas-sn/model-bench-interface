import { EFFORT_LEVELS } from "../normalization/effort.mjs";

export { EFFORT_LEVELS };

export const RECENTS_KEY = "mb.recentModels";
export const MAX_RECENTS = 5;

/**
 * Format a family_id into a clean display label.
 * e.g. "anthropic/claude-opus-5.5" -> "Claude Opus 5.5"
 * e.g. "openai/gpt-5.4" -> "GPT-5.4"
 * e.g. "qwen3-8-max" -> "Qwen 3.8 Max"
 * e.g. "inkling" -> "Inkling"
 */
export function formatFamilyLabel(familyId) {
  if (!familyId) return "";
  const bare = familyId.includes("/") ? familyId.split("/").slice(1).join("/") : familyId;
  return bare
    .split("-")
    .map((word) => {
      if (/^\d+(\.\d+)?$/.test(word)) return word;
      if (/^gpt/i.test(word)) return word.toUpperCase();
      if (/^glm/i.test(word)) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ")
    .replace(/(\d+)\s+(\d+)/g, "$1.$2"); // e.g. "3 8" -> "3.8"
}

/**
 * Group LiveBench models by company (display_vendor), then by family_id,
 * ordering effort variants by EFFORT_LEVELS (strongest first).
 *
 * @param {Array<import('./data').LivebenchModel>} models
 * @param {Record<string, string>} vendorDisplay
 */
export function groupModels(models, vendorDisplay = {}) {
  const byVendor = new Map();

  for (const model of models) {
    const vendor = model.display_vendor || "other";
    if (!byVendor.has(vendor)) byVendor.set(vendor, new Map());
    const familyMap = byVendor.get(vendor);

    const familyId = model.family_id || model.canonical_id || model.benchmark_name;
    if (!familyMap.has(familyId)) familyMap.set(familyId, []);
    familyMap.get(familyId).push(model);
  }

  const effortRank = (effort) => {
    if (!effort) return 999;
    const idx = EFFORT_LEVELS.indexOf(effort);
    return idx >= 0 ? idx : 999;
  };

  const groups = [];

  for (const [vendor, familyMap] of byVendor) {
    const families = [];
    let modelCount = 0;

    for (const [familyId, variants] of familyMap) {
      modelCount += variants.length;

      // Sort variants: strongest effort first, then benchmark_name
      variants.sort((a, b) => {
        const diff = effortRank(a.effort) - effortRank(b.effort);
        if (diff !== 0) return diff;
        return a.benchmark_name.localeCompare(b.benchmark_name);
      });

      const primary = variants[0];
      const familyLabel = formatFamilyLabel(familyId);
      const vendorName = vendorDisplay[vendor] || vendor;

      // Overall category score for the primary variant
      const overallScore = primary.overall ?? null;

      // Best pricing available
      const pricing = variants.find((v) => v.pricing?.input_per_million != null)?.pricing || null;

      // Search keywords
      const keywords = [
        familyLabel,
        familyId,
        vendorName,
        vendor,
        ...variants.map((v) => v.benchmark_name),
        ...variants.map((v) => v.effort).filter(Boolean),
        ...variants.filter((v) => v.thinking).map(() => "thinking"),
      ]
        .join(" ")
        .toLowerCase();

      families.push({
        family_id: familyId,
        family_label: familyLabel,
        vendor,
        vendor_name: vendorName,
        variants,
        primary,
        overall_score: overallScore,
        pricing,
        keywords,
      });
    }

    // Sort families alphabetically by label
    families.sort((a, b) => a.family_label.localeCompare(b.family_label));

    groups.push({
      vendor,
      vendor_name: vendorDisplay[vendor] || (vendor.charAt(0).toUpperCase() + vendor.slice(1)),
      model_count: modelCount,
      families,
    });
  }

  // Sort groups: model_count descending, with "other" strictly last
  groups.sort((a, b) => {
    if (a.vendor === "other") return 1;
    if (b.vendor === "other") return -1;
    const diff = b.model_count - a.model_count;
    if (diff !== 0) return diff;
    return a.vendor_name.localeCompare(b.vendor_name);
  });

  return groups;
}

/**
 * All searchable text for one family, lowercased and pre-split.
 * Kept separate so the scorer stays a pure function of plain data.
 */
function familyHaystack(family) {
  const label = (family.family_label || "").toLowerCase();
  return {
    label,
    words: label.split(/[\s.]+/).filter(Boolean),
    id: (family.family_id || "").toLowerCase(),
    keywords: (family.keywords || "").toLowerCase(),
    vendor: (family.vendor_name || family.vendor || "").toLowerCase(),
    efforts: family.variants.map((v) => (v.effort || "").toLowerCase()).filter(Boolean),
    names: family.variants.map((v) => (v.benchmark_name || "").toLowerCase()),
  };
}

function scoreToken(token, h) {
  if (!token) return 0;
  if (h.label === token) return 100;
  if (h.label.startsWith(token)) return 90;
  if (h.words.some((w) => w.startsWith(token))) return 78;
  if (h.efforts.includes(token)) return 74;
  if (h.names.some((n) => n.startsWith(token))) return 72;
  if (h.id.includes(`/${token}`) || h.id.startsWith(token)) return 70;
  if (h.names.some((n) => n.includes(token))) return 58;
  if (h.vendor.includes(token)) return 55;
  if (h.keywords.includes(token)) return 45;
  return -1;
}

/**
 * Search across every family in every vendor group.
 *
 * Every whitespace-separated token must match something (AND semantics), so
 * "opus max" finds Opus with a max-effort variant instead of every Opus and
 * every max-effort model. The result is ranked: name matches beat keyword and
 * vendor matches, ties break on the family's overall category mean.
 *
 * @returns {Array<{family: any, vendor: string, vendor_name: string, score: number}>}
 */
export function searchFamilies(groups, query) {
  const tokens = String(query ?? "")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (!tokens.length) return [];

  const hits = [];
  for (const group of groups) {
    for (const family of group.families) {
      const h = familyHaystack(family);
      let score = Infinity;
      for (const token of tokens) {
        const s = scoreToken(token, h);
        if (s < 0) {
          score = -1;
          break;
        }
        score = Math.min(score, s);
      }
      if (score < 0) continue;
      hits.push({ family, vendor: group.vendor, vendor_name: group.vendor_name, score });
    }
  }

  hits.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.family.overall_score ?? -1) - (a.family.overall_score ?? -1);
  });

  return hits;
}

/**
 * The effort choices a family actually has, strongest first.
 * `hasChoice` is false only when there is a single variant — the UI can then
 * skip the effort stage entirely rather than showing a one-button step. It is
 * deliberately `variants.length`, not the count of variants *with* an effort:
 * a family holding one effort variant plus one "not stated" variant still has
 * a real choice, and hiding it would make that variant unreachable.
 */
export function effortOptions(family) {
  const variants = family?.variants ?? [];
  return {
    variants,
    hasChoice: variants.length > 1,
    defaultName: variants[0]?.benchmark_name ?? "",
  };
}

/** "$10", "$2.5", "$0.15", "free", "—". Never renders an unknown price as $0. */
export function formatPerMillion(value) {
  if (value == null || !Number.isFinite(value)) return "—";
  if (value === 0) return "free";
  const rounded =
    value < 10 ? Number(value.toFixed(2)) : value < 100 ? Number(value.toFixed(1)) : Math.round(value);
  return `$${rounded}`;
}

/** Input/output pair, e.g. "$10 / $50". */
export function formatPricePair(input, output) {
  if (input == null && output == null) return "—";
  return `${formatPerMillion(input)} / ${formatPerMillion(output)}`;
}

/** Read the stored recent picks. Never throws — storage may be unavailable. */
export function readRecents(storage, max = MAX_RECENTS) {
  try {
    if (!storage) return [];
    const raw = storage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((n) => typeof n === "string" && n.length > 0).slice(0, max);
  } catch {
    return [];
  }
}

/** Push a pick to the front of the recent list. Returns the new list. */
export function writeRecents(storage, name, max = MAX_RECENTS) {
  if (!storage || typeof name !== "string" || !name) return [];
  try {
    const next = [name, ...readRecents(storage, max).filter((n) => n !== name)].slice(0, max);
    storage.setItem(RECENTS_KEY, JSON.stringify(next));
    return next;
  } catch {
    return [];
  }
}

/**
 * The pair to show before the visitor has chosen anything: their two most
 * recent picks when both still exist, otherwise the two strongest defaults.
 * Always returns two distinct benchmark names.
 */
export function defaultPair(models, recents = []) {
  const has = (name) => models.some((m) => m.benchmark_name === name);
  const viableRecents = recents.filter(has);

  const byName = (n) => models.find((m) => m.benchmark_name === n)?.benchmark_name;
  const byFragment = (frag) => models.find((m) => m.benchmark_name.includes(frag))?.benchmark_name;

  const fallbackA =
    byName("claude-opus-5-5-max-effort") || byFragment("opus-5") || models[0]?.benchmark_name || "";
  let fallbackB =
    byName("gpt-5.5-xhigh") ||
    byFragment("gpt-5") ||
    (models[1] || models[0])?.benchmark_name ||
    "";
  if (fallbackB === fallbackA) {
    fallbackB = models.find((m) => m.benchmark_name !== fallbackA)?.benchmark_name || fallbackA;
  }

  const a = viableRecents[0] || fallbackA;
  let b = viableRecents[1] || (viableRecents[0] && viableRecents[0] !== fallbackB ? fallbackB : fallbackB);
  if (b === a) b = models.find((m) => m.benchmark_name !== a)?.benchmark_name || a;

  return [a, b];
}
