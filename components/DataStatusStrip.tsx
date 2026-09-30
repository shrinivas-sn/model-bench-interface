import { readFileSync } from "node:fs";
import { join } from "node:path";
import Link from "next/link";

import { getScores } from "@/lib/data";
import { summarizeFreshness, summarizeRelease } from "@/lib/status.mjs";
import { RelativeTime } from "@/components/RelativeTime";

type SourceStatus = { outcome?: string; canary?: string; fetched_at?: string };

function readFreshnessSources(): Record<string, SourceStatus> | null {
  try {
    const raw = JSON.parse(readFileSync(join(process.cwd(), "data", "freshness.json"), "utf8"));
    return raw.sources ?? null;
  } catch {
    return null;
  }
}

/**
 * One line at the top of every page answering "are these numbers current?".
 * It reads the ingest report, not the app data, so it can go stale
 * independently of what the tables show — which is the point.
 */
export function DataStatusStrip() {
  const sources = readFreshnessSources();
  const s = summarizeFreshness(sources ?? {});
  const scores = getScores();
  const counts = scores.data_quality.counts;

  return (
    <div className="data-strip" data-tone={s.tone} role="status">
      <div className="data-strip-inner">
        <span className="data-strip-dot" aria-hidden />
        <span>
          Benchmarks updated <strong><RelativeTime iso={s.fetchedAt} /></strong>
        </span>
        <span className="data-strip-sep" aria-hidden>
          ·
        </span>
        <span>
          {s.healthy}/{s.total} sources ingested
        </span>
        <span className="data-strip-sep" aria-hidden>
          ·
        </span>
        <span>{summarizeRelease(scores.release)}</span>
        <span className="data-strip-sep" aria-hidden>
          ·
        </span>
        <span className="mono">
          {counts.livebench_models} models · {counts.terminal_bench_runs} Terminal-Bench runs
        </span>
        {s.tone !== "ok" && (
          <>
            <span className={`badge badge-${s.tone}`}>{s.label}</span>
            <Link href="/quality">See what is wrong →</Link>
          </>
        )}
      </div>
    </div>
  );
}
