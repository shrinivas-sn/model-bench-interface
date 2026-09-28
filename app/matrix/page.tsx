import { getScores } from "@/lib/data";
import { ModelMatrix } from "@/components/ModelMatrix";

export default function MatrixPage() {
  const data = getScores();

  return (
    <>
      <header className="page-head">
        <h1 className="page-title">All models</h1>
        <p className="page-sub">
          Every LiveBench row with its capability means, the OpenRouter id it matched to, input
          price per million tokens and context window.
        </p>
        <p className="page-purpose">
          Answers: where does a given model actually sit across the whole field, and which
          benchmark names could not be matched to the catalog?
        </p>
      </header>
      <ModelMatrix models={data.livebench} capabilities={data.capabilities} />
    </>
  );
}
