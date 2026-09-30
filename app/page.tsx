import { Suspense } from "react";
import { getScores } from "@/lib/data";
import { HeadToHead } from "@/components/HeadToHead";

export default function Page() {
  const data = getScores();
  return (
    <>
      <header className="page-head">
        <h1 className="page-title">Compare two models</h1>
        <p className="page-sub">
          Every score comes from the leaderboard that publishes it, with a link and a date. If a
          leaderboard hasn't tested a model, the page says so. Nothing is estimated.
        </p>
      </header>
      <Suspense fallback={<div className="card dim">Loading comparison…</div>}>
        <HeadToHead
          livebench={data.livebench}
          capabilities={data.capabilities}
          terminalBench={data.terminal_bench ?? []}
          artificialAnalysis={data.artificial_analysis ?? []}
          sources={data.sources}
          vendorDisplay={data.vendor_display}
        />
      </Suspense>
    </>
  );
}
