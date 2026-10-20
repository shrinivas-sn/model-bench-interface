import React from "react";

export function EffortChip({
  effort,
  onClick,
  active,
}: {
  effort: string | null;
  onClick?: (e: React.MouseEvent) => void;
  active?: boolean;
}) {
  const chipClass = effort
    ? `effort-chip effort-chip-${effort}`
    : "effort-chip effort-chip-null";
  const label = effort || "effort not stated";

  if (onClick) {
    return (
      <span
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick(e as unknown as React.MouseEvent);
          }
        }}
        className={`${chipClass} picker-chip-clickable ${active ? "picker-chip-active" : ""}`}
      >
        {label}
      </span>
    );
  }

  return <span className={chipClass}>{label}</span>;
}

/** Result of `scoreAtEffort` in lib/compare.mjs. */
export type AtEffort<Row = unknown> = {
  status: "measured" | "not-measured" | "effort-not-stated";
  value: number | null;
  row: Row | null;
  measuredEffort: string | null;
  measuredLevels: string[];
};

/**
 * Says which effort a shown score was measured at: its chip, "effort not stated",
 * or "Not measured at {level}" with buttons for the levels that were measured.
 */
export function EffortStatus({
  slot,
  at,
  picked,
  onPick,
}: {
  slot: "A" | "B";
  at: AtEffort;
  picked: string | null;
  onPick: (level: string) => void;
}) {
  return (
    <span
      className="effort-status"
      data-slot={slot}
      data-status={at.status}
      data-value={at.value ?? ""}
    >
      <span className="h2h-legend-swatch" data-slot={slot} aria-hidden />
      <span className="effort-status-slot">{slot}</span>
      {at.status === "measured" ? (
        <EffortChip effort={at.measuredEffort} />
      ) : at.status === "effort-not-stated" ? (
        <EffortChip effort={null} />
      ) : at.measuredLevels.length === 0 ? (
        <span className="unknown">Not on this leaderboard</span>
      ) : (
        <>
          <span className="unknown">Not measured at {picked ?? "this level"}</span>
          <span className="dim">· measured at:</span>
          {at.measuredLevels.map((lvl) => (
            <button
              key={lvl}
              type="button"
              className={`h2h-effort-btn effort-chip-${lvl}`}
              data-slot={slot}
              data-level={lvl}
              onClick={() => onPick(lvl)}
              title={`Switch Model ${slot} reasoning effort to ${lvl}`}
            >
              {lvl}
            </button>
          ))}
        </>
      )}
    </span>
  );
}

export function EffortStatusRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="bench-effort-status">
      <span className="h2h-stat-label">Measured at</span>
      {children}
    </div>
  );
}
