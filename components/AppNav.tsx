"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Each destination carries a hint line, because "Benchmark Matrix" and
 * "Data Quality" name the data, not the question the view answers. The hint
 * is what makes the nav self-explanatory without a tooltip hunt.
 */
const TABS = [
  {
    href: "/",
    label: "Compare",
    hint: "two models, side by side",
    title: "Pick two models and compare capability, price and benchmark results",
  },
  {
    href: "/matrix",
    label: "All models",
    hint: "every score in one table",
    title: "LiveBench capability scores for every model, sortable as one table",
  },
  {
    href: "/quality",
    label: "Data health",
    hint: "freshness and matches",
    title: "How current the data is and how benchmark names were matched",
  },
];

export function AppNav() {
  const pathname = usePathname();
  return (
    <nav className="nav-tabs" aria-label="Primary">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className="nav-tab"
          data-active={pathname === t.href}
          title={t.title}
        >
          <span className="nav-tab-label">{t.label}</span>
          <span className="nav-tab-hint">{t.hint}</span>
        </Link>
      ))}
    </nav>
  );
}
