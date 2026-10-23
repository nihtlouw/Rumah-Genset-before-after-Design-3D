interface DimProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** perpendicular offset of the dimension line from the measured points (cm). positive = left of direction */
  offset?: number;
  label?: string;
  color?: string;
  fontSize?: number;
  /** put text on the other side of the line */
  flip?: boolean;
  dashed?: boolean;
}

/** Architectural dimension line in SVG (units = cm). */
export function Dim({
  x1,
  y1,
  x2,
  y2,
  offset = 0,
  label,
  color = '#0f172a',
  fontSize = 16,
  flip = false,
  dashed = false,
}: DimProps) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const ox = nx * offset;
  const oy = ny * offset;
  const ax1 = x1 + ox;
  const ay1 = y1 + oy;
  const ax2 = x2 + ox;
  const ay2 = y2 + oy;
  const over = 8 * Math.sign(offset || 1);
  const tick = 6;
  let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (angle >= 90 || angle < -90) angle += 180;
  // text goes on the side pointing away from the measured object (= offset direction)
  const dirSign = (offset !== 0 ? Math.sign(offset) : -1) * (flip ? -1 : 1);
  const gap = fontSize * 0.45 + 4;
  const mx = (ax1 + ax2) / 2 + nx * dirSign * gap;
  const my = (ay1 + ay2) / 2 + ny * dirSign * gap;
  const text = label ?? `${Math.round(len)}`;
  return (
    <g className="dim" stroke={color} fill="none" strokeWidth={1.2}>
      {/* extension lines */}
      <line x1={x1} y1={y1} x2={ax1 + nx * over} y2={ay1 + ny * over} strokeWidth={0.8} opacity={0.7} />
      <line x1={x2} y1={y2} x2={ax2 + nx * over} y2={ay2 + ny * over} strokeWidth={0.8} opacity={0.7} />
      {/* dimension line */}
      <line x1={ax1} y1={ay1} x2={ax2} y2={ay2} strokeDasharray={dashed ? '6 4' : undefined} />
      {/* ticks */}
      <line
        x1={ax1 - (ux + nx) * tick * 0.7}
        y1={ay1 - (uy + ny) * tick * 0.7}
        x2={ax1 + (ux + nx) * tick * 0.7}
        y2={ay1 + (uy + ny) * tick * 0.7}
        strokeWidth={2}
      />
      <line
        x1={ax2 - (ux + nx) * tick * 0.7}
        y1={ay2 - (uy + ny) * tick * 0.7}
        x2={ax2 + (ux + nx) * tick * 0.7}
        y2={ay2 + (uy + ny) * tick * 0.7}
        strokeWidth={2}
      />
      <circle cx={ax1} cy={ay1} r={1.6} fill={color} stroke="none" />
      <circle cx={ax2} cy={ay2} r={1.6} fill={color} stroke="none" />
      <text
        x={mx}
        y={my}
        fill={color}
        stroke="none"
        fontSize={fontSize}
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        fontWeight={600}
        textAnchor="middle"
        dominantBaseline="middle"
        transform={`rotate(${angle} ${mx} ${my})`}
      >
        {text}
      </text>
    </g>
  );
}

export function HatchDefs() {
  return (
    <defs>
      <pattern id="hatch" patternUnits="userSpaceOnUse" width="7" height="7" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="7" stroke="#1e293b" strokeWidth="2.2" />
      </pattern>
      <pattern id="hatchNew" patternUnits="userSpaceOnUse" width="7" height="7" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="7" stroke="#b91c1c" strokeWidth="2.2" />
      </pattern>
      <pattern id="hatchLight" patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="10" stroke="#94a3b8" strokeWidth="1" />
      </pattern>
      <pattern id="concrete" patternUnits="userSpaceOnUse" width="12" height="12">
        <circle cx="3" cy="4" r="1" fill="#94a3b8" />
        <circle cx="9" cy="9" r="1.2" fill="#94a3b8" />
      </pattern>
      <pattern id="grid50" patternUnits="userSpaceOnUse" width="50" height="50">
        <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e2e8f0" strokeWidth="0.8" />
      </pattern>
      <pattern id="roofHatch" patternUnits="userSpaceOnUse" width="14" height="14" patternTransform="rotate(-45)">
        <line x1="0" y1="0" x2="0" y2="14" stroke="#64748b" strokeWidth="1" />
      </pattern>
      <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#0f172a" />
      </marker>
    </defs>
  );
}
