import { readFileSync } from "node:fs";
import { join } from "node:path";

type SourceStatus = {
  outcome: string;
  canary: string;
  fetched_at: string;
};

function readFreshness(): Record<string, SourceStatus> | null {
  try {
    const raw = JSON.parse(readFileSync(join(process.cwd(), "data", "freshness.json"), "utf8"));
    return raw.sources ?? null;
  } catch {
    return null;
  }
}

function summarize(sources: Record<string, SourceStatus>) {
  const statuses = Object.values(sources);
  if (!statuses.length) return { label: "no data", tone: "err" as const, when: null };
  if (statuses.some((s) => s.outcome === "error"))
    return { label: "source error", tone: "err" as const, when: statuses[0].fetched_at };
  if (statuses.some((s) => s.outcome === "stale"))
    return { label: "canary stale", tone: "stale" as const, when: statuses[0].fetched_at };
  return { label: "fresh", tone: "ok" as const, when: statuses[0].fetched_at };
}

function age(iso: string | null) {
  if (!iso) return "";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

export function FreshnessBadge() {
  const sources = readFreshness();
  const s = sources
    ? summarize(sources)
    : { label: "not ingested", tone: "stale" as const, when: null };
  return (
    <span className={`badge badge-${s.tone}`} title={s.when ? `fetched ${age(s.when)}` : undefined}>
      <span aria-hidden>●</span> data {s.label}
    </span>
  );
}
