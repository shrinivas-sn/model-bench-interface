import { getScores } from "@/lib/data";
import { SweBenchTable } from "@/components/SweBenchTable";

export default function SweBenchPage() {
  const data = getScores();

  return (
    <>
      <header className="page-head">
        <h1 className="page-title">SWE-bench Verified runs</h1>
        <p className="page-sub">
          Agent + model systems ranked by % of 500 human-verified GitHub issues resolved. The same
          model appears under many agents — which is exactly why the harness and the model are
          reported separately.
        </p>
        <p className="page-purpose">
          Answers: when a model is wired into a real coding agent, what does it actually resolve —
          and which harness got the most out of it?
        </p>
      </header>
      <SweBenchTable rows={data.swe_bench} />
    </>
  );
}
