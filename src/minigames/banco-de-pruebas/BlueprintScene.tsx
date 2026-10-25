import { motion } from 'motion/react';
import type { BuiltPart } from './engine';

const W = 800;
const H = 300;

/** Puntos del bolso a los que apunta cada rótulo, alternando izquierda y derecha. */
const ANCHORS = [
  { x: 400, y: 70, side: -1 },
  { x: 470, y: 150, side: 1 },
  { x: 335, y: 180, side: -1 },
  { x: 455, y: 230, side: 1 },
  { x: 350, y: 110, side: -1 },
  { x: 470, y: 95, side: 1 },
  { x: 380, y: 240, side: -1 },
  { x: 430, y: 190, side: 1 },
];

/**
 * El plano del prototipo, como una lámina de taller sobre azul: el bolso en
 * trazo claro y, por cada mejora construida, un rótulo con línea guía. Así se
 * ve cómo cambia la idea con cada iteración. Decorativo.
 */
export function BlueprintScene({
  built,
  iteration,
  still,
}: {
  built: BuiltPart[];
  iteration: number;
  still: boolean;
}) {
  return (
    <svg
      viewBox={`0 0 ${String(W)} ${String(H)}`}
      aria-hidden="true"
      className="block h-auto w-full bg-sea-900"
    >
      <defs>
        <pattern id="reticula-plano" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" stroke="var(--sea-800)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill="url(#reticula-plano)" />

      {/* Cartela del plano */}
      <g transform="translate(16 16)">
        <rect width="230" height="40" fill="none" stroke="var(--sea-300)" strokeWidth="1.5" />
        <text
          x="10"
          y="17"
          className="font-display"
          fontSize="10"
          fontWeight="700"
          letterSpacing="2"
          fill="var(--sea-100)"
        >
          PLANO · BOLSO IMPERMEABLE
        </text>
        <text x="10" y="32" fontSize="11" fill="var(--plate)">
          Iteración {iteration}
        </text>
      </g>

      {/* El bolso en trazo de plano */}
      <g fill="none" stroke="var(--plate)" strokeWidth="2" strokeLinejoin="round">
        <path d="M330 90 L470 90 L480 250 L320 250 Z" />
        <path d="M335 90 Q400 60 465 90" />
        <path d="M340 70 L460 70 M345 78 L455 78" strokeDasharray="4 4" />
        <path d="M330 120 Q260 40 400 40 Q540 40 470 120" />
        <path d="M352 140 H448 V200 H352 Z" strokeDasharray="6 5" />
      </g>
      <text x="400" y="275" textAnchor="middle" fontSize="11" fill="var(--sea-100)">
        lona de vela reciclada
      </text>

      {/* Rótulos de las mejoras */}
      {built.slice(0, ANCHORS.length).map((part, i) => {
        const anchor = ANCHORS[i];
        if (!anchor) return null;
        const labelX = anchor.side < 0 ? 40 : W - 40;
        const labelY = 80 + Math.floor(i / 2) * 52;
        return (
          <motion.g
            key={part.changeId}
            initial={still ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: still ? 0 : 0.5 }}
          >
            <path
              d={`M${String(anchor.x)} ${String(anchor.y)} L${String(anchor.side < 0 ? 250 : 550)} ${String(labelY)} H${String(labelX)}`}
              fill="none"
              stroke="var(--land-sun)"
              strokeWidth="1.5"
            />
            <circle cx={anchor.x} cy={anchor.y} r="4" fill="var(--land-sun)" />
            <text
              x={labelX}
              y={labelY - 6}
              textAnchor={anchor.side < 0 ? 'start' : 'end'}
              className="font-display"
              fontSize="13"
              fontWeight="700"
              fill="var(--plate)"
            >
              {part.part}
            </text>
          </motion.g>
        );
      })}
    </svg>
  );
}
