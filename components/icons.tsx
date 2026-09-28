import type { SVGProps } from "react";

/**
 * Inline SVG icons. Emoji were used here before (a magnifier, a caret, a swap
 * arrow) — they render differently per OS, are read aloud by screen readers,
 * and date the interface. These inherit `currentColor` and size from `size`.
 */
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 16, ...rest }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    focusable: false,
    ...rest,
  };
}

export function SearchIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="7" cy="7" r="4.25" />
      <path d="M10.2 10.2 14 14" />
    </svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m4 6.5 4 4 4-4" />
    </svg>
  );
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M13 8H3" />
      <path d="m7 4-4 4 4 4" />
    </svg>
  );
}

export function SwapIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 5h8" />
      <path d="m9.5 2.5 3 2.5-3 2.5" />
      <path d="M12 11H4" />
      <path d="M6.5 8.5 3.5 11l3 2.5" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m3.5 8.5 3 3 6-7" />
    </svg>
  );
}
