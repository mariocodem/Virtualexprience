import type { StationStatus } from '@/progress/types';

/**
 * Convenciones de la plancha para el estado de una estación:
 * bloqueada ▢ · disponible ○ · en curso ◐ (tinta de ruta) · completada ● · en preparación ◌.
 */
export function StationSymbol({ status, size = 18 }: { status: StationStatus; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      {status === 'bloqueada' && (
        <>
          <rect
            x="3"
            y="3"
            width="14"
            height="14"
            fill="none"
            stroke="var(--ink)"
            strokeWidth="2"
          />
          <path d="M7 10h6" stroke="var(--ink)" strokeWidth="2" />
        </>
      )}
      {status === 'disponible' && (
        <circle cx="10" cy="10" r="7" fill="var(--plate)" stroke="var(--ink)" strokeWidth="2" />
      )}
      {status === 'en-curso' && (
        <>
          <circle cx="10" cy="10" r="7" fill="var(--plate)" stroke="var(--route)" strokeWidth="2" />
          <path d="M10 3a7 7 0 0 1 0 14z" fill="var(--route)" />
        </>
      )}
      {status === 'completada' && <circle cx="10" cy="10" r="8" fill="var(--ink)" />}
      {status === 'en-preparacion' && (
        <circle
          cx="10"
          cy="10"
          r="7"
          fill="none"
          stroke="var(--ink)"
          strokeWidth="1.5"
          strokeDasharray="2.5 2.5"
        />
      )}
    </svg>
  );
}
