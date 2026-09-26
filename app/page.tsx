import { getScores } from "@/lib/data";
import { HeadToHead } from "@/components/HeadToHead";

export default function Page() {
  const data = getScores();
  return (
    <>
      <header style={{ marginBottom: 20 }}>
        <h1 className="page-title">Head-to-head compare</h1>
        <p className="page-sub">
          Pick two models. LiveBench capability axes (per-category means, never cross-benchmark
          averages), SWE-bench Verified best runs, and OpenRouter pricing.
        </p>
      </header>
      <HeadToHead livebench={data.livebench} swe={data.swe_bench} capabilities={data.capabilities} />
    </>
  );
}
