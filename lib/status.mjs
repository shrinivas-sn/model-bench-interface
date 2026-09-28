/**
 * Freshness summary — pure, so the header strip and the tests agree on the
 * same numbers. Keep this file dependency-free: it is imported by a server
 * component and by `node --test` directly.
 */

export const STALE_AFTER_DAYS = 2;

/** "3 hours ago" / "today" / "1 day ago" / "5 days ago" / "" */
export function formatAge(iso, now = Date.now()) {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const ms = now - then;
  if (ms < 0) return "just now";
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

/** Whole days since the newest fetch; null when there is no usable timestamp. */
export function ageInDays(iso, now = Date.now()) {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return null;
  return Math.max(0, Math.floor((now - then) / 86_400_000));
}

/**
 * Collapse per-source ingest outcomes into one line the user can act on.
 *
 * A source that reports `ok` but is older than STALE_AFTER_DAYS days is
 * downgraded to stale: the daily cron is the thing that keeps this data
 * current, so silence for that long means the cron is broken, not that the
 * data is fine.
 *
 * @param {Record<string, {outcome?: string, fetched_at?: string}>} sources
 */
export function summarizeFreshness(sources, now = Date.now()) {
  const entries = Object.entries(sources ?? {});
  if (!entries.length) {
    return { tone: "stale", label: "no data", healthy: 0, total: 0, fetchedAt: null, ageDays: null };
  }

  const failed = entries.filter(([, s]) => s?.outcome === "error" || s?.outcome === "failed");
  const stale = entries.filter(([, s]) => s?.outcome === "stale");
  const healthy = entries.length - failed.length - stale.length;

  const stamps = entries
    .map(([, s]) => s?.fetched_at)
    .filter(Boolean)
    .sort();
  const fetchedAt = stamps.length ? stamps[stamps.length - 1] : null;
  const ageDays = ageInDays(fetchedAt, now);

  let tone = "ok";
  let label = "up to date";
  if (failed.length) {
    tone = "err";
    label = failed.length === entries.length ? "sources failed" : `${failed.length} source failed`;
  } else if (stale.length) {
    tone = "stale";
    label = `${stale.length} source stale`;
  } else if (ageDays != null && ageDays >= STALE_AFTER_DAYS) {
    tone = "stale";
    label = `not refreshed in ${ageDays} days`;
  }

  return { tone, label, healthy, total: entries.length, fetchedAt, ageDays };
}

/** "LiveBench 2026-06-25 + SWE-bench + OpenRouter" -> compact provenance line. */
export function summarizeRelease(release) {
  if (!release || typeof release !== "string") return "";
  return release
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" · ");
}
