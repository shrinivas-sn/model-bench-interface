import { getScores } from "@/lib/data";
import { ModelMatrix } from "@/components/ModelMatrix";

export default function MatrixPage() {
  const data = getScores();

  return (
    <>
      <header className="page-head">
        <h1 className="page-title">All models</h1>
        <p className="page-sub">
          Every model LiveBench has tested in its latest release. Sort by LiveBench overall or by price.
        </p>
      </header>
      <ModelMatrix models={data.livebench} capabilities={data.capabilities} />
    </>
  );
}
