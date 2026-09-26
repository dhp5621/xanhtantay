/**
 * SVG tree/garden that grows with the customer's level (stage 0–12).
 * The viewBox has headroom so the biggest canopy is never cropped.
 */
const STAGES = [
  // trunk, canopy, fruits, flowers, sideTrees, bird
  { trunk: 0, canopy: 0, fruits: 0, flowers: 0, side: 0, bird: false },
  { trunk: 0, canopy: 0, fruits: 0, flowers: 0, side: 0, bird: false },
  { trunk: 40, canopy: 22, fruits: 0, flowers: 0, side: 0, bird: false },
  { trunk: 62, canopy: 36, fruits: 0, flowers: 0, side: 0, bird: false },
  { trunk: 70, canopy: 42, fruits: 0, flowers: 5, side: 0, bird: false },
  { trunk: 78, canopy: 48, fruits: 5, flowers: 0, side: 0, bird: false },
  { trunk: 92, canopy: 58, fruits: 6, flowers: 0, side: 0, bird: true },
  { trunk: 92, canopy: 58, fruits: 6, flowers: 0, side: 1, bird: true },
  { trunk: 96, canopy: 60, fruits: 7, flowers: 3, side: 2, bird: true },
  { trunk: 96, canopy: 60, fruits: 7, flowers: 3, side: 3, bird: true },
  { trunk: 100, canopy: 62, fruits: 8, flowers: 4, side: 4, bird: true },
  { trunk: 100, canopy: 62, fruits: 8, flowers: 4, side: 5, bird: true },
  { trunk: 104, canopy: 64, fruits: 9, flowers: 5, side: 6, bird: true },
];
const FRUIT_POS = [[-18, -10], [14, -22], [-4, 6], [22, 4], [-26, 12], [6, -34], [-30, -22], [28, -20], [0, 22]];
const FLOWER_POS = [[-22, -28], [20, -30], [0, -40], [-32, 0], [30, 2]];

export function GrowingTree({ stage, size = 220 }: { stage: number; size?: number }) {
  const s = Math.max(0, Math.min(STAGES.length - 1, stage));
  const c = STAGES[s];
  const top = 10 - c.trunk - c.canopy * 0.4; // canopy centre y
  const W = 200, H = 210;
  const sideXs = [-62, 62, -92, 92, -118, 118];
  return (
    <svg viewBox={`-100 -170 ${W} ${H}`} width={size} height={size * H / W} role="img" aria-label={`Cây cấp ${s}`} className="m3-tree" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="soil" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--md-secondary-container)" /><stop offset="1" stopColor="var(--md-surface-container-highest)" /></linearGradient>
      </defs>
      {/* ground widens as the garden grows */}
      <ellipse cx="0" cy="28" rx={46 + c.side * 14} ry={10 + c.side} fill="url(#soil)" />
      {/* side trees (garden stages) */}
      {Array.from({ length: c.side }).map((_, i) => {
        const x = sideXs[i]; const sc = 0.45 + (i % 2) * 0.1;
        return (
          <g key={i} transform={`translate(${x} 24) scale(${sc})`} className="m3-tree-sway" style={{ animationDelay: `${i * 0.7}s` }}>
            <path d="M-4 10 L-3 -60 L3 -60 L4 10 Z" fill="var(--md-on-surface-variant)" />
            <circle cx="0" cy="-80" r="40" fill="var(--md-primary-fixed-dim)" />
            <circle cx="-22" cy="-66" r="28" fill="var(--md-primary)" />
            <circle cx="22" cy="-68" r="28" fill="var(--md-primary)" />
          </g>
        );
      })}
      {/* pot */}
      <path d="M-34 26 Q0 40 34 26 L28 -2 Q0 4 -28 -2 Z" fill="var(--md-tertiary-container)" />
      {/* seed */}
      {s === 0 && <ellipse cx="0" cy="8" rx="7" ry="5" fill="var(--md-primary)" className="m3-tree-pulse" />}
      {/* sprout */}
      {s === 1 && (<g className="m3-tree-sway"><path d="M0 8 Q-2 -4 0 -12" stroke="var(--md-primary)" strokeWidth="3" fill="none" strokeLinecap="round" /><ellipse cx="-8" cy="-10" rx="8" ry="4" fill="var(--md-primary)" transform="rotate(-25 -8 -10)" /><ellipse cx="8" cy="-14" rx="8" ry="4" fill="var(--md-primary-fixed-dim)" transform="rotate(25 8 -14)" /></g>)}
      {/* main tree */}
      {s >= 2 && (
        <g className="m3-tree-sway">
          <path d={`M-4 10 L-3 ${10 - c.trunk} L3 ${10 - c.trunk} L4 10 Z`} fill="var(--md-on-surface-variant)" />
          <circle cx="0" cy={top} r={c.canopy} fill="var(--md-primary)" />
          <circle cx={-c.canopy * 0.6} cy={top + c.canopy * 0.3} r={c.canopy * 0.7} fill="var(--md-primary-fixed-dim)" />
          <circle cx={c.canopy * 0.6} cy={top + c.canopy * 0.25} r={c.canopy * 0.72} fill="var(--md-primary-fixed-dim)" />
          {FLOWER_POS.slice(0, c.flowers).map(([x, y], i) => (
            <g key={`f${i}`} transform={`translate(${x * c.canopy / 48} ${top + y * c.canopy / 48})`} className="m3-tree-pulse" style={{ animationDelay: `${i * 0.3}s` }}>
              {[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx="0" cy="-4" rx="2.4" ry="4" fill="#FFD7E5" transform={`rotate(${a})`} />)}
              <circle r="2" fill="#FFB300" />
            </g>
          ))}
          {FRUIT_POS.slice(0, c.fruits).map(([x, y], i) => <circle key={`r${i}`} cx={x * c.canopy / 48} cy={top + y * c.canopy / 48} r="5" fill="var(--md-error)" className="m3-tree-pulse" style={{ animationDelay: `${i * 0.4}s` }} />)}
        </g>
      )}
      {/* bird */}
      {c.bird && (
        <g className="m3-tree-bird" transform={`translate(${c.canopy + 10} ${top - c.canopy - 6})`}>
          <path d="M-8 0 Q-4 -6 0 0 Q4 -6 8 0" stroke="var(--md-on-surface)" strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}
