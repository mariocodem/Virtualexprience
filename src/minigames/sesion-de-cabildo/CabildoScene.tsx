import { motion } from 'motion/react';
import type { CabildoContent } from '@/data/contentSchemas';

/** Tinta de cada delegación, en el orden del contenido (paleta de la carta). */
const DELEGATION_INK = ['var(--sea-500)', 'var(--land-low)', 'var(--land-high)', 'var(--land-mid)'];

const W = 800;
const H = 340;
const TABLE = { x: W / 2, y: 270 };

/**
 * La plaza del cabildo vista desde arriba: las delegaciones en hemiciclo
 * alrededor de la mesa, cada una con un farol cuyo aro de luz es su
 * confianza (la marca es el umbral para respaldar). Quien habla se une a la
 * mesa con la línea de ruta. Decorativo: los valores están en texto aparte.
 */
export function CabildoScene({
  factions,
  trust,
  threshold,
  speaker,
  agreements,
  still,
}: {
  factions: CabildoContent['factions'];
  trust: Record<string, number>;
  threshold: number;
  speaker: string | null;
  agreements: number;
  still: boolean;
}) {
  const seats = factions.map((faction, i) => {
    const angle = Math.PI * (1.08 + (0.84 * i) / Math.max(1, factions.length - 1));
    return {
      faction,
      ink: DELEGATION_INK[i % DELEGATION_INK.length] ?? 'var(--ink)',
      x: TABLE.x + Math.cos(angle) * 300,
      y: TABLE.y + Math.sin(angle) * 205,
    };
  });

  return (
    <svg
      viewBox={`0 0 ${String(W)} ${String(H)}`}
      aria-hidden="true"
      className="block h-auto w-full"
    >
      {/* Adoquines de la plaza */}
      <defs>
        <pattern id="adoquin" width="28" height="28" patternUnits="userSpaceOnUse">
          <path d="M0 0h28v28" fill="none" stroke="var(--plate-edge)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill="url(#adoquin)" />
      <ellipse
        cx={TABLE.x}
        cy={TABLE.y + 10}
        rx="360"
        ry="250"
        fill="none"
        stroke="var(--ink)"
        strokeWidth="1.5"
        strokeDasharray="2 8"
      />

      {/* Línea de quien tiene la palabra */}
      {seats.map(
        (seat) =>
          seat.faction.id === speaker && (
            <motion.path
              key={`palabra-${seat.faction.id}`}
              d={`M${String(seat.x)} ${String(seat.y + 30)} L${String(TABLE.x)} ${String(TABLE.y - 26)}`}
              stroke="var(--route)"
              strokeWidth="3"
              strokeDasharray="6 7"
              fill="none"
              initial={{ pathLength: still ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: still ? 0 : 0.6, ease: 'easeOut' }}
            />
          ),
      )}

      {/* Mesa del cabildo con el acta */}
      <g transform={`translate(${String(TABLE.x)} ${String(TABLE.y)})`}>
        <rect
          x="-92"
          y="-26"
          width="184"
          height="52"
          fill="var(--plate)"
          stroke="var(--ink)"
          strokeWidth="1.5"
        />
        <text
          y="-6"
          textAnchor="middle"
          className="font-display"
          fontSize="12"
          fontWeight="700"
          letterSpacing="2.5"
          fill="var(--ink)"
        >
          MESA DEL CABILDO
        </text>
        {Array.from({ length: Math.min(6, agreements) }, (_, i) => (
          <motion.rect
            key={i}
            x={-78 + i * 27}
            y="6"
            width="22"
            height="12"
            fill="var(--land-sun)"
            stroke="var(--ink)"
            strokeWidth="1.5"
            initial={{ scale: still ? 1 : 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: still ? 0 : 0.3 }}
          />
        ))}
        {agreements === 0 && (
          <text y="16" textAnchor="middle" fontSize="11" fill="var(--ink-soft)">
            el acta aún está en blanco
          </text>
        )}
      </g>

      {/* Delegaciones */}
      {seats.map((seat) => {
        const value = trust[seat.faction.id] ?? 0;
        const speaking = seat.faction.id === speaker;
        const r = 30;
        const circumference = 2 * Math.PI * r;
        const markAngle = (threshold / 100) * Math.PI * 2 - Math.PI / 2;
        return (
          <g key={seat.faction.id} transform={`translate(${String(seat.x)} ${String(seat.y)})`}>
            <circle r={r} fill="var(--plate)" stroke="var(--plate-edge)" strokeWidth="6" />
            <motion.circle
              r={r}
              fill="none"
              stroke={value >= threshold ? 'var(--land-sun)' : 'var(--sea-300)'}
              strokeWidth="6"
              strokeDasharray={circumference}
              transform="rotate(-90)"
              initial={false}
              animate={{ strokeDashoffset: circumference * (1 - value / 100) }}
              transition={{ duration: still ? 0 : 0.7, ease: 'easeOut' }}
            />
            <path
              d={`M${String(Math.cos(markAngle) * (r - 6))} ${String(Math.sin(markAngle) * (r - 6))}L${String(Math.cos(markAngle) * (r + 6))} ${String(Math.sin(markAngle) * (r + 6))}`}
              stroke="var(--ink)"
              strokeWidth="2"
            />
            {[-11, 0, 11].map((dx, k) => (
              <circle
                key={dx}
                cx={dx}
                cy={k === 1 ? -6 : 4}
                r="7"
                fill={seat.ink}
                stroke="var(--ink)"
                strokeWidth="1.5"
              />
            ))}
            <text
              y={r + 22}
              textAnchor="middle"
              className="font-display"
              fontSize="13"
              fontWeight="700"
              fill="var(--ink)"
            >
              {seat.faction.name}
            </text>
            <text y={r + 38} textAnchor="middle" fontSize="12" fill="var(--ink-soft)">
              {Math.round(value)} % de confianza
            </text>
            {speaking && <circle r={r + 12} fill="none" stroke="var(--route)" strokeWidth="2" />}
          </g>
        );
      })}
    </svg>
  );
}
