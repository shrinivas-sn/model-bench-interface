import { EFFORT_LEVELS } from "../normalization/effort.mjs";

export { EFFORT_LEVELS };

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
 * @returns {Array<{
 *   vendor: string;
 *   vendor_name: string;
 *   model_count: number;
 *   families: Array<{
 *     family_id: string;
 *     family_label: string;
 *     vendor: string;
 *     vendor_name: string;
 *     variants: Array<import('./data').LivebenchModel>;
 *     primary: import('./data').LivebenchModel;
 *     overall_score: number | null;
 *     pricing: any;
 *     keywords: string;
 *   }>;
 * }>}
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

      // Overall category mean for the primary variant
      let overallScore = null;
      if (primary.categories) {
        const vals = Object.values(primary.categories).filter((v) => typeof v === "number");
        if (vals.length > 0) {
          overallScore = Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1));
        }
      }

      // Best pricing available
      const pricing = variants.find((v) => v.pricing?.prompt != null)?.pricing || null;

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
