import { cx } from './cx';

/** Rosa de los vientos: emblema de Brújula y del norte de la plancha. */
export function CompassRose({ size = 88, className }: { size?: number; className?: string }) {
  const points = Array.from({ length: 8 }, (_, i) => {
    const angle = (Math.PI / 4) * i - Math.PI / 2;
    const long = i % 2 === 0;
    const r = long ? 40 : 22;
    const side = 7;
    const a1 = angle - Math.PI / 2;
    const a2 = angle + Math.PI / 2;
    return {
      long,
      d: `M50,50 L${(50 + Math.cos(a1) * side).toFixed(2)},${(50 + Math.sin(a1) * side).toFixed(2)} L${(50 + Math.cos(angle) * r).toFixed(2)},${(50 + Math.sin(angle) * r).toFixed(2)} L${(50 + Math.cos(a2) * side).toFixed(2)},${(50 + Math.sin(a2) * side).toFixed(2)} Z`,
    };
  });
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={cx('text-ink', className)}
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle
        cx="50"
        cy="50"
        r="30"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.6"
        strokeDasharray="1.5 2.5"
      />
      {points.map((p, i) => (
        <path
          key={i}
          d={p.d}
          fill={p.long ? 'currentColor' : 'var(--land-sun)'}
          stroke="currentColor"
          strokeWidth="0.8"
          strokeLinejoin="miter"
        />
      ))}
      <circle cx="50" cy="50" r="3" fill="var(--plate)" stroke="currentColor" strokeWidth="1" />
      <text
        x="50"
        y="5.5"
        textAnchor="middle"
        fontSize="8"
        fontWeight="700"
        fill="currentColor"
        style={{ fontFamily: 'var(--type-display)' }}
      >
        N
      </text>
    </svg>
  );
}
