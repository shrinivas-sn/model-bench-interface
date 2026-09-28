"use client";

import { useEffect, useState } from "react";

import { formatAge } from "@/lib/status.mjs";

/**
 * Relative ages must be computed on the client: this site is a static export,
 * so anything rendered at build time would freeze ("3 hours ago" forever).
 * The absolute date renders first (identical on server and client, so no
 * hydration mismatch), then swaps to the relative form once mounted.
 */
export function RelativeTime({
  iso,
  prefix = "",
}: {
  iso: string | null | undefined;
  prefix?: string;
}) {
  const absolute = iso ? `${iso.slice(0, 10)} ${iso.slice(11, 16)}Z` : "never";
  const [label, setLabel] = useState(absolute);

  useEffect(() => {
    if (!iso) return;
    const update = () => setLabel(formatAge(iso));
    update();
    const id = window.setInterval(update, 60_000);
    return () => window.clearInterval(id);
  }, [iso]);

  if (!iso) return <span>{absolute}</span>;
  return (
    <time dateTime={iso} title={absolute}>
      {prefix}
      {label}
    </time>
  );
}
