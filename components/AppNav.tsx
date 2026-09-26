"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Head-to-Head" },
  { href: "/matrix", label: "Benchmark Matrix" },
  { href: "/swe-bench", label: "SWE-bench" },
  { href: "/quality", label: "Data Quality" },
];

export function AppNav() {
  const pathname = usePathname();
  return (
    <nav className="nav-tabs" aria-label="Primary">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className="nav-tab" data-active={pathname === t.href}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
