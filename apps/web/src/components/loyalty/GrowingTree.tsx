/** SVG tree that grows with the customer's level (stage 0–5). Pure CSS animation, no JS. */
export function GrowingTree({ stage, size = 220 }: { stage: number; size?: number }) {
  const s = Math.max(0, Math.min(5, stage));
  const trunkH = [0, 18, 40, 64, 80, 96][s];
  const canopy = [0, 0, 22, 38, 50, 62][s];
  const fruits = s >= 4 ? [[-18, -10], [14, -22], [-4, 6], [22, 4], [-26, 12]].slice(0, s === 4 ? 3 : 5) : [];
  return (
    <svg viewBox="-70 -110 140 150" width={size} height={size * 150 / 140} role="img" aria-label={`Cây cấp ${s}`} className="m3-tree">
      <defs>
        <linearGradient id="soil" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--md-secondary-container)" /><stop offset="1" stopColor="var(--md-surface-container-highest)" /></linearGradient>
      </defs>
      {/* pot / soil */}
      <ellipse cx="0" cy="28" rx="46" ry="10" fill="url(#soil)" />
      <path d="M-34 26 Q0 40 34 26 L28 -2 Q0 4 -28 -2 Z" fill="var(--md-tertiary-container)" />
      {/* seed */}
      {s === 0 && <ellipse cx="0" cy="8" rx="7" ry="5" fill="var(--md-primary)" className="m3-tree-pulse" />}
      {/* sprout */}
      {s === 1 && (<g className="m3-tree-sway"><path d="M0 8 Q-2 -4 0 -12" stroke="var(--md-primary)" strokeWidth="3" fill="none" strokeLinecap="round" /><ellipse cx="-8" cy="-10" rx="8" ry="4" fill="var(--md-primary)" transform="rotate(-25 -8 -10)" /><ellipse cx="8" cy="-14" rx="8" ry="4" fill="var(--md-primary-fixed-dim)" transform="rotate(25 8 -14)" /></g>)}
      {/* trunk + canopy */}
      {s >= 2 && (
        <g className="m3-tree-sway">
          <path d={`M-4 10 L-3 ${10 - trunkH} L3 ${10 - trunkH} L4 10 Z`} fill="var(--md-on-surface-variant)" />
          <circle cx="0" cy={10 - trunkH - canopy * 0.4} r={canopy} fill="var(--md-primary)" />
          <circle cx={-canopy * 0.6} cy={10 - trunkH - canopy * 0.1} r={canopy * 0.7} fill="var(--md-primary-fixed-dim)" />
          <circle cx={canopy * 0.6} cy={10 - trunkH - canopy * 0.15} r={canopy * 0.72} fill="var(--md-primary-fixed-dim)" />
          {fruits.map(([x, y], i) => <circle key={i} cx={x} cy={10 - trunkH - canopy * 0.4 + y} r="5" fill="var(--md-error)" className="m3-tree-pulse" style={{ animationDelay: `${i * 0.4}s` }} />)}
        </g>
      )}
    </svg>
  );
}
