import { ReactNode } from "react";

type BenchBlockProps = {
  id: string;
  title: string;
  measures: string;
  sourceLabel: string;
  sourceUrl: string;
  asOf: string;
  children: ReactNode;
};

export function BenchBlock({
  id,
  title,
  measures,
  sourceLabel,
  sourceUrl,
  asOf,
  children,
}: BenchBlockProps) {
  return (
    <section className="bench-block" data-bench={id}>
      <header className="bench-block-head">
        <h2 className="bench-block-title">{title}</h2>
        <p className="bench-block-measures">{measures}</p>
      </header>
      <div className="bench-block-content">{children}</div>
      <footer className="bench-block-footer">
        Source:{" "}
        <a
          className="bench-source"
          href={sourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          {sourceLabel}
        </a>{" "}
        · {asOf}
      </footer>
    </section>
  );
}
