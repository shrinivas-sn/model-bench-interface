import { Suspense } from "react";
import { getScores } from "@/lib/data";
import { HeadToHead } from "@/components/HeadToHead";

export default function Page() {
  const data = getScores();
  return (
    <>
      <header className="page-head">
        <h1 className="page-title">Head-to-head compare</h1>
        <p className="page-sub">
          Model A against model B on LiveBench capability axes, SWE-bench Verified best runs and
          OpenRouter pricing. Pick a company, then a model, then its reasoning effort.
        </p>
        <p className="page-purpose">
          Answers one question: given these two models, which is stronger on the capabilities you
          care about, and what does that cost per million tokens?
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
