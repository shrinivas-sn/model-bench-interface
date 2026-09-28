/**
 * Model registry: canonical model IDs (OpenRouter-style), vendor, and per-source
 * alias matching. Wrong aliasing silently corrupts every comparison, so matching is
 * rule-based, ordered, and failure-honest: every match records its method, and a
 * name that cannot be matched stays unmatched and is REPORTED, never guessed.
 */
import { capabilityForLivebenchCategory } from "./categories.mjs";

export const VENDORS = [
  { id: "anthropic", match: /anthropic|claude/i, display: "Anthropic" },
  { id: "openai", match: /openai|gpt|o[1345](-|$)/i, display: "OpenAI" },
  { id: "google", match: /google|gemini/i, display: "Google" },
  { id: "xai", match: /x-ai|xai|grok/i, display: "xAI" },
  { id: "deepseek", match: /deepseek/i, display: "DeepSeek" },
  { id: "qwen", match: /qwen|alibaba/i, display: "Qwen" },
  { id: "meta", match: /^meta\/|llama/i, display: "Meta" },
  { id: "mistral", match: /mistral|magistral|devstral/i, display: "Mistral" },
  { id: "moonshot", match: /moonshot|kimi/i, display: "Moonshot" },
  { id: "minimax", match: /minimax/i, display: "MiniMax" },
];

export function vendorFor(id) {
  for (const v of VENDORS) if (v.match.test(id)) return v.id;
  return "other";
}

/** Canonical key form: lowercase, whitespace/dots -> dashes, collapse separators. */
export function normKey(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[\s.]+/g, "-")
    .replace(/[^a-z0-9\-\/]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Tail tokens that mark reasoning-effort/variant noise when stripping from the end. */
const TAIL_NOISE = new Set([
  "effort", "xhigh", "high", "medium", "low", "max", "thinking", "auto", "64k", "preview", "instruct", "reasoner", "exp",
]);

const EIGHT_DIGIT = /^\d{8}$/;

/**
 * Progressive candidate forms of a benchmark model name, most-exact first.
 * One strip operation per step; each form records HOW it was produced so match
 * reporting is honest: { form, how } with how in "exact" | "suffix" | "date".
 */
export function candidateForms(sourceName) {
  const base = normKey(sourceName);
  const out = [{ form: base, how: "exact" }];
  let s = base;
  const push = (next, how) => {
    if (next && next !== s && !out.some((f) => f.form === next)) out.push({ form: next, how });
    s = next || s;
  };
  for (;;) {
    const parts = s.split("-");
    if (parts.length <= 3) {
      // still allow an 8-digit date if the whole tail is one token
      if (parts.length >= 1 && EIGHT_DIGIT.test(parts[parts.length - 1])) {
        push(parts.slice(0, -1).join("-"), "date");
        continue;
      }
      break;
    }
    const last = parts[parts.length - 1];
    const y = parts[parts.length - 3];
    const m = parts[parts.length - 2];
    if (
      /^\d{1,2}$/.test(last) &&
      /^\d{1,2}$/.test(m) &&
      /^\d{4}$/.test(y)
    ) {
      // ISO tail ...-YYYY-MM-DD spans three tokens
      push(parts.slice(0, -3).join("-"), "date");
    } else if (EIGHT_DIGIT.test(last)) {
      push(parts.slice(0, -1).join("-"), "date");
    } else if (TAIL_NOISE.has(last)) {
      push(parts.slice(0, -1).join("-"), "suffix");
    } else {
      break;
    }
  }
  return out;
}

/** "anthropic/claude-opus-4.5-20260115" -> "anthropic/claude-opus-4.5" (null if no date). */
export function slugAliasFor(id) {
  const s = String(id || "").toLowerCase();
  const m = s.match(/^([a-z0-9.\-]+\/[a-z0-9.\-]+?)-\d{6,8}$/);
  return m ? m[1] : null;
}

/**
 * Build the alias index from the OpenRouter catalog. For each model, indexes:
 *   norm(full id) | norm(slug w/o date) | norm(bare name after vendor/)
 *   | norm(display title) | norm(title minus leading vendor token)
 *   plus systematic subfamily/version permutations (claude-4.5-opus <-> claude-opus-4.5)
 */
export function buildAliasIndex(openrouterModels) {
  const index = new Map(); // normKey -> canonical id
  const put = (key, id) => {
    if (!key) return;
    if (!index.has(key)) index.set(key, id);
  };
  for (const m of openrouterModels) {
    const id = m.source_id || m.id;
    if (!id) continue;
    put(normKey(id), id);
    const slug = slugAliasFor(id);
    if (slug) {
      put(normKey(slug), id);
      const bare = slug.includes("/") ? slug.split("/").slice(1).join("/") : slug;
      put(normKey(bare), id);
    }
    const bareId = id.includes("/") ? id.split("/").slice(1).join("/") : id;
    const bareNorm = normKey(bareId);
    put(bareNorm, id);

    // Systematic transposition of version/subfamily naming (e.g. claude-opus-4.5 <-> claude-4.5-opus, gemini-pro-1.5 <-> gemini-1.5-pro)
    const mClaude = bareNorm.match(/^claude-(opus|sonnet|haiku|fable)-(.*)$/);
    if (mClaude) put(`claude-${mClaude[2]}-${mClaude[1]}`, id);
    const mClaudeRev = bareNorm.match(/^claude-(.*?)-(opus|sonnet|haiku|fable)$/);
    if (mClaudeRev) put(`claude-${mClaudeRev[2]}-${mClaudeRev[1]}`, id);

    const mGemini = bareNorm.match(/^gemini-(pro|flash|flash-lite)-(.*)$/);
    if (mGemini) put(`gemini-${mGemini[2]}-${mGemini[1]}`, id);
    const mGeminiRev = bareNorm.match(/^gemini-(.*?)-(pro|flash|flash-lite)$/);
    if (mGeminiRev) put(`gemini-${mGeminiRev[2]}-${mGeminiRev[1]}`, id);

    const title = m.title || m.name;
    if (title) {
      const t = normKey(title);
      put(t, id);
      const stripped = t.replace(/^[a-z0-9]+-/, ""); // title minus leading vendor token
      put(stripped, id);
      const mTitleClaude = stripped.match(/^claude-(opus|sonnet|haiku|fable)-(.*)$/);
      if (mTitleClaude) put(`claude-${mTitleClaude[2]}-${mTitleClaude[1]}`, id);
      const mTitleClaudeRev = stripped.match(/^claude-(.*?)-(opus|sonnet|haiku|fable)$/);
      if (mTitleClaudeRev) put(`claude-${mTitleClaudeRev[2]}-${mTitleClaudeRev[1]}`, id);
    }
  }
  return index;
}

/**
 * Resolve a benchmark model name to a canonical id.
 * Returns { canonical, method } | null.
 * method in exact | suffix-stripped | date-stripped — describes the strip operation
 * that produced the matching form (honest reporting, not marketing).
 */
export function resolveAlias(aliasIndex, sourceName) {
  const forms = candidateForms(sourceName);
  const methodFor = { exact: "exact", suffix: "suffix-stripped", date: "date-stripped" };
  for (const { form, how } of forms) {
    if (!form) continue;
    if (aliasIndex.has(form)) {
      return { canonical: aliasIndex.get(form), method: methodFor[how] };
    }
    // bare-name form (no vendor prefix) against index keys that contain "/"
    if (!form.includes("/")) {
      const vendored = Array.from(aliasIndex.keys()).find(
        (k) => k.includes("/") && (k === form || k.endsWith(`/${form}`))
      );
      if (vendored) {
        return { canonical: aliasIndex.get(vendored), method: methodFor[how] };
      }
    }
  }
  return null;
}

/** Map a LiveBench category name to a canonical capability axis. */
export function capabilityAxisForCategory(cat) {
  return capabilityForLivebenchCategory(cat);
}
