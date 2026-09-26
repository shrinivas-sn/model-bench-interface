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
  const label = effort || "not stated";

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
