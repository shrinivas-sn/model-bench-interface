/**
 * SWE-bench Verified leaderboard source.
 *
 * The official leaderboard data is the single JSON file the swe-bench.github.io site
 * loads: data/leaderboards.json on branch master (verified by reading
 * swe-bench/experiments' analysis/get_leaderboard.py, which generates it).
 *
 * The file holds ALL five boards; this transform picks the "Verified" board by name
 * (order-stable, unlike an array index) and constructs each entry's provenance URL
 * into the experiments repo.
 */
export const ADAPTER_URL =
  "https://raw.githubusercontent.com/SWE-bench/swe-bench.github.io/master/data/leaderboards.json";
export const BOARD_NAME = "Verified";
export const REPO = "SWE-bench/experiments";

export function makeFetchImpl() {
  return async (url, opts = {}) => {
    const res = await fetch(url, {
      ...opts,
      headers: { Accept: "application/json", "User-Agent": "model-bench-ingest" },
    });
    if (!res.ok) return res;
    const j = await res.json();
    const board = (j.leaderboards || []).find(
      (b) => String(b.name || "").toLowerCase() === BOARD_NAME.toLowerCase()
    );
    if (!board) {
      return new Response(JSON.stringify({ error: `board ${BOARD_NAME} not found` }), {
        status: 404,
      });
    }
    const items = (board.results || []).map((r) => ({
      ...r,
      record_url: `https://github.com/${REPO}/tree/main/evaluation/verified/${r.folder}`,
    }));
    return new Response(JSON.stringify(items), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
}

/** Transform used for fixture capture from the downloaded leaderboards.json. */
export function transformLeaderboards(envelope) {
  const board = (envelope.leaderboards || []).find(
    (b) => String(b.name || "").toLowerCase() === BOARD_NAME.toLowerCase()
  );
  return (board?.results || []).map((r) => ({
    ...r,
    record_url: `https://github.com/${REPO}/tree/main/evaluation/verified/${r.folder}`,
  }));
}
