import type { IslandId } from '@/types/domain';

/**
 * Microbucle de cada isla: un gesto mínimo de su lugar, en trazo de plancha.
 * Animado con CSS sobre el reloj de marea; quieto con movimiento reducido.
 */
export function IslandGlyph({ id, size = 64 }: { id: IslandId; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className="glyph text-ink"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
      focusable="false"
    >
      {id === 'comunicarte' && (
        <>
          <path d="M32 52V24M26 52h12M32 24l-5 8h10z" />
          <path className="glyph-wave" d="M22 18a14 14 0 0 1 20 0" />
          <path
            className="glyph-wave [animation-delay:calc(var(--tide)/-6)]"
            d="M17 13a21 21 0 0 1 30 0"
          />
          <path
            className="glyph-wave [animation-delay:calc(var(--tide)/-3)]"
            d="M12 8a28 28 0 0 1 40 0"
          />
        </>
      )}
      {id === 'neuromath' && (
        <>
          <path d="M32 10L54 50H10z" />
          <path className="glyph-draw" d="M21 30h22L32 50z" />
          <path
            className="glyph-draw [animation-delay:calc(var(--tide)/-4)]"
            d="M26.5 40h11L32 30z"
          />
        </>
      )}
      {id === 'voxcivitas' && (
        <>
          <circle cx="32" cy="32" r="20" strokeDasharray="2 3" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <circle
              key={i}
              className="glyph-speak"
              style={{ animationDelay: `calc(var(--tide) / -6 * ${String(i)})` }}
              cx={32 + Math.cos((i / 6) * Math.PI * 2) * 20}
              cy={32 + Math.sin((i / 6) * Math.PI * 2) * 20}
              r="3.5"
              fill="var(--plate)"
            />
          ))}
          <circle cx="32" cy="32" r="4" fill="currentColor" />
        </>
      )}
      {id === 'gerencia' && (
        <g className="glyph-turn">
          <circle cx="32" cy="32" r="14" />
          <circle cx="32" cy="32" r="4" />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
            const a = (i / 8) * Math.PI * 2;
            return (
              <path
                key={i}
                d={`M${String(32 + Math.cos(a) * 4)} ${String(32 + Math.sin(a) * 4)}L${String(32 + Math.cos(a) * 22)} ${String(32 + Math.sin(a) * 22)}`}
              />
            );
          })}
        </g>
      )}
      {id === 'activatuidea' && (
        <>
          <path d="M32 18v28M18 32h28" className="glyph-spark" />
          <path
            d="M22 22l20 20M42 22L22 42"
            className="glyph-spark [animation-delay:calc(var(--tide)/-8)]"
          />
          <circle cx="32" cy="32" r="5" fill="var(--land-sun)" />
        </>
      )}
      {id === 'latidosocial' && (
        <>
          <path d="M32 8v20M24 14l8 6 8-6" />
          <path className="glyph-draw" d="M32 28c0 8-10 10-14 20M32 28c0 8 10 10 14 20M32 28v26" />
          <path d="M14 28h36" strokeDasharray="3 3" />
        </>
      )}
    </svg>
  );
}
