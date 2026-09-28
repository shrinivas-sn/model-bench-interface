const SIZE = 320;
const R = 110;
const CX = SIZE / 2;
const CY = SIZE / 2 + 6;

/* Series colours come from the design tokens so the radar, the paired bars and
   the card edges can never drift apart. Opacity is applied via fillOpacity
   rather than baked into a colour literal. */
const SERIES = [
  { color: "var(--series-a)", fillOpacity: 0.16 },
  { color: "var(--series-b)", fillOpacity: 0.16 },
];

function pointFor(axisIndex: number, n: number, value: number) {
  const angle = -Math.PI / 2 + (2 * Math.PI * axisIndex) / n;
  const r = (Math.min(100, Math.max(0, value)) / 100) * R;
  return [CX + r * Math.cos(angle), CY + r * Math.sin(angle)] as const;
}

export function RadarChart({
  axes,
  series,
}: {
  axes: string[];
  series: { label: string; values: Record<string, number> }[];
}) {
  const n = axes.length;
  if (n < 3) return null;

  const rings = [25, 50, 75, 100];
  const labelPos = axes.map((axis, i) => {
    const [x, y] = pointFor(i, n, 118);
    return { axis, x, y };
  });

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role="img"
      aria-label={`Radar chart: ${series.map((s) => s.label).join(" vs ")}`}
      style={{ maxWidth: 360, width: "100%" }}
    >
      {rings.map((ring) => (
        <polygon
          key={ring}
          points={axes
            .map((_, i) => {
              const [x, y] = pointFor(i, n, ring);
              return `${x.toFixed(1)},${y.toFixed(1)}`;
            })
            .join(" ")}
          fill="none"
          stroke="var(--border)"
          strokeWidth={ring === 100 ? 1.5 : 0.75}
        />
      ))}
      {axes.map((_, i) => {
        const [x, y] = pointFor(i, n, 100);
        return <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="var(--border)" strokeWidth={0.75} />;
      })}
      {series.map((s, si) => {
        const c = SERIES[si % SERIES.length];
        const pts = axes
          .map((axis, i) => {
            const [x, y] = pointFor(i, n, s.values?.[axis] ?? 0);
            return `${x.toFixed(1)},${y.toFixed(1)}`;
          })
          .join(" ");
        return (
          <polygon
            key={s.label}
            points={pts}
            fill={c.color}
            fillOpacity={c.fillOpacity}
            stroke={c.color}
            strokeWidth={1.5}
          />
        );
      })}
      {series.map((s, si) =>
        axes.map((axis, i) => {
          const [x, y] = pointFor(i, n, s.values?.[axis] ?? 0);
          const c = SERIES[si % SERIES.length];
          return <circle key={`${si}-${axis}`} cx={x} cy={y} r={2.5} fill={c.color} />;
        })
      )}
      {labelPos.map(({ axis, x, y }) => (
        <text
          key={axis}
          x={x}
          y={y}
          textAnchor={x < CX - 8 ? "end" : x > CX + 8 ? "start" : "middle"}
          dominantBaseline="middle"
          fontSize={10}
          fill="var(--text-muted)"
        >
          {axis}
        </text>
      ))}
    </svg>
  );
}
