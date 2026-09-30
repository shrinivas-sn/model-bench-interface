/**
 * Terminal-Bench leaderboard source (tbench.ai, currently Terminal-Bench 4.0).
 *
 * Extracts the Next.js React Server Component (Flight) payload embedded in the
 * initial HTML response and decodes the active leaderboard and run records.
 */

export const ADAPTER_URL = "https://www.tbench.ai/";
export const PAGE_URL = "https://www.tbench.ai/";

/**
 * Decode Next.js flight data embedded in HTML scripts:
 * self.__next_f.push([1,"..."])
 *
 * @param {string} html
 * @returns {string}
 */
export function decodeFlight(html) {
  if (!html || typeof html !== "string") return "";
  const marker = 'self.__next_f.push([1,"';
  let idx = 0;
  const chunks = [];

  while (true) {
    const pos = html.indexOf(marker, idx);
    if (pos === -1) break;
    const start = pos + marker.length;
    let end = start;
    while (end < html.length) {
      if (html[end] === "\\") {
        end += 2; // skip escaped character
      } else if (html[end] === '"') {
        break;
      } else {
        end += 1;
      }
    }
    const raw = html.slice(start, end);
    try {
      chunks.push(JSON.parse('"' + raw + '"'));
    } catch {
      // ignore malformed chunk
    }
    idx = end + 1;
  }

  return chunks.join("");
}

/**
 * Read and parse a JSON object starting at text[start] (where text[start] is '{').
 * Handles nested braces outside JSON strings with escape tracking.
 *
 * @param {string} text
 * @param {number} start
 * @returns {object}
 */
export function readJsonObjectAt(text, start) {
  if (!text || text[start] !== "{") {
    throw new Error(`Expected '{' at index ${start}`);
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const char = text[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === "{") {
        depth++;
      } else if (char === "}") {
        depth--;
        if (depth === 0) {
          return JSON.parse(text.slice(start, i + 1));
        }
      }
    }
  }

  throw new Error("Unterminated JSON object");
}

/**
 * Extract the active leaderboard object and its runs from decoded flight payload.
 *
 * @param {string} payload
 * @returns {{ title: string, runs: object[] } | null}
 */
export function extractLeaderboard(payload) {
  if (!payload || typeof payload !== "string") return null;

  const lbMarker = '"leaderboard":{"id":"';
  const lbPos = payload.indexOf(lbMarker);
  if (lbPos === -1) return null;

  const objStart = lbPos + '"leaderboard":'.length;
  let board;
  try {
    board = readJsonObjectAt(payload, objStart);
  } catch {
    return null;
  }

  if (!board || !board.id || !board.title) return null;

  const boardId = board.id;
  const runs = [];
  const seenIds = new Set();
  const runMarker = `"leaderboard_id":"${boardId}"`;
  let idx = 0;

  while (true) {
    const pos = payload.indexOf(runMarker, idx);
    if (pos === -1) break;

    const startObj = payload.lastIndexOf('{"id":"', pos);
    if (startObj !== -1) {
      try {
        const run = readJsonObjectAt(payload, startObj);
        if (run && run.id && run.status === "display" && !seenIds.has(run.id)) {
          seenIds.add(run.id);
          runs.push(run);
        }
      } catch {
        // skip unparseable run
      }
    }
    idx = pos + runMarker.length;
  }

  return { title: board.title, runs };
}

/**
 * Transform leaderboard and runs to flat adapter record items.
 *
 * @param {{ title: string, runs: object[] }} board
 * @returns {object[]}
 */
export function toItems(board) {
  if (!board || !Array.isArray(board.runs)) return [];
  return board.runs.map((run) => ({
    source_id: run.id,
    page_url: PAGE_URL,
    leaderboard_title: board.title,
    model_label: run.metadata?.model_display?.label ?? null,
    model_org: run.metadata?.model_org?.label ?? null,
    agent_label: run.metadata?.agent_display?.label ?? null,
    agent_org: run.metadata?.agent_org?.label ?? null,
    reasoning_effort: run.metadata?.reasoning_effort ?? null,
    accuracy: run.metrics?.accuracy,
    ci95_half_width: run.metrics?.accuracy_ci95_half_width ?? null,
    n_trials: run.metrics?.n_trials ?? run.n_trials ?? null,
    total_cost_usd: run.metrics?.total_cost_usd ?? null,
    date: run.metadata?.date ?? null,
  }));
}

/**
 * Create a custom fetch implementation for adapter-ingestion.
 */
export function makeFetchImpl() {
  return async (url, opts = {}) => {
    const res = await fetch(url, {
      ...opts,
      headers: {
        ...opts.headers,
        "User-Agent": "model-bench-ingest",
      },
    });

    if (!res.ok) return res;

    const text = await res.text();
    const flight = decodeFlight(text);
    const board = extractLeaderboard(flight);

    if (!board) {
      return new Response(
        JSON.stringify({ error: "terminal-bench leaderboard not found in page" }),
        {
          status: 502,
          headers: { "content-type": "application/json" },
        }
      );
    }

    const items = toItems(board);
    return new Response(JSON.stringify(items), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
}
