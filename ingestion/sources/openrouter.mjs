/**
 * OpenRouter models catalog source.
 *
 * The live API returns { data: [...] } with no per-model page URL. The fetchImpl
 * transform (deterministic, declared here) flattens the array and constructs each
 * model's public page URL so the declarative adapter can map a valid `url` field.
 * Fixtures mirror the TRANSFORMED shape (a flat array), not the raw envelope.
 */
export const ADAPTER_URL = "https://openrouter.ai/api/v1/models";

export function makeFetchImpl() {
  return async (url, opts = {}) => {
    const res = await fetch(url, {
      ...opts,
      headers: { Accept: "application/json", "User-Agent": "model-bench-ingest" },
    });
    if (!res.ok) return res; // pass the real failure Response through
    const j = await res.json();
    const items = (Array.isArray(j.data) ? j.data : []).map((m) => ({
      ...m,
      page_url: `https://openrouter.ai/${m.id}`,
    }));
    return new Response(JSON.stringify(items), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
}

/** Transform used for fixture capture from a raw API envelope. */
export function transformEnvelope(envelope) {
  return (Array.isArray(envelope?.data) ? envelope.data : []).map((m) => ({
    ...m,
    page_url: `https://openrouter.ai/${m.id}`,
  }));
}
