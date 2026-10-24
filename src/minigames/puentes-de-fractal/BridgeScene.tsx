import { motion } from 'motion/react';
import type { Bridge } from '@/data/contentSchemas';
import type { LastTest } from './engine';

const W = 800;
const H = 300;
const LEFT = 170;
const RIGHT = 630;
const DECK = 150;
const BEAM = 16;
const SCALE_SPAN = RIGHT - LEFT;

/**
 * Corte del hueco como en un perfil de atlas: acantilados en terrazas, mar en
 * franjas y los tramos elegidos a escala real. La vagoneta de prueba cruza,
 * cae al agua o se atasca según el resultado. Decorativo: el estado se dice
 * en texto fuera del dibujo.
 */
export function BridgeScene({
  bridge,
  selected,
  last,
  still,
}: {
  bridge: Bridge;
  selected: readonly string[];
  last: LastTest | null;
  still: boolean;
}) {
  const scale = SCALE_SPAN / bridge.gap;
  const pieces = selected.flatMap((id) => bridge.pieces.find((p) => p.id === id) ?? []);
  const beams = pieces.map((piece, i) => ({
    id: piece.id,
    x: LEFT + pieces.slice(0, i).reduce((sum, p) => sum + p.value * scale, 0),
    width: piece.value * scale,
    label: piece.label,
    shade: i % 2,
  }));
  const end = LEFT + pieces.reduce((sum, p) => sum + p.value * scale, 0);
  const outcome = last?.outcome ?? null;
  const duration = still ? 0 : 1.8;
  const reach = Math.max(0, end - LEFT);

  return (
    <svg
      viewBox={`0 0 ${String(W)} ${String(H)}`}
      aria-hidden="true"
      className="block h-auto w-full"
    >
      {/* Mar en franjas batimétricas */}
      {[0, 1, 2, 3].map((band) => (
        <rect
          key={band}
          x="0"
          y={228 + band * 18}
          width={W}
          height="18"
          fill={['var(--sea-300)', 'var(--sea-500)', 'var(--sea-700)', 'var(--sea-800)'][band]}
        />
      ))}
      <path
        d={`M0 228 Q 100 222 200 228 T 400 228 T 600 228 T ${String(W)} 228`}
        fill="none"
        stroke="var(--plate)"
        strokeWidth="1.5"
        opacity="0.7"
      />

      {/* Acantilados en terrazas */}
      <Cliff x={0} width={LEFT} side="left" />
      <Cliff x={RIGHT} width={W - RIGHT} side="right" />

      {/* Cota del hueco */}
      <g stroke="var(--ink)" strokeWidth="1.5">
        <path
          d={`M${String(LEFT)} 96v14M${String(RIGHT)} 96v14M${String(LEFT)} 103H${String(RIGHT)}`}
          fill="none"
        />
        <path d={`M${String(LEFT + 8)} 98l-8 5 8 5M${String(RIGHT - 8)} 98l8 5-8 5`} fill="none" />
      </g>
      <rect x={(LEFT + RIGHT) / 2 - 34} y="93" width="68" height="20" fill="var(--plate)" />
      <text
        x={(LEFT + RIGHT) / 2}
        y="108"
        textAnchor="middle"
        className="font-display"
        fontSize="14"
        fontWeight="700"
        fill="var(--ink)"
      >
        HUECO
      </text>

      {/* Faro de llegada: se enciende si el puente resiste */}
      <g transform={`translate(${String(RIGHT + 92)} ${String(DECK - 46)})`}>
        <rect
          x="-5"
          y="0"
          width="10"
          height="46"
          fill="var(--plate)"
          stroke="var(--ink)"
          strokeWidth="1.5"
        />
        <path d="M-9 0h18l-3-10h-12z" fill="var(--ink)" />
        <motion.circle
          cx="0"
          cy="-14"
          r="7"
          fill="var(--land-sun)"
          stroke="var(--ink)"
          strokeWidth="1.5"
          initial={false}
          animate={{ opacity: outcome === 'resiste' ? 1 : 0.15 }}
          transition={{ duration: still ? 0 : 0.4, delay: outcome === 'resiste' ? duration : 0 }}
        />
      </g>

      {/* Tramos */}
      <motion.g
        key={`tramos-${String(last?.serial ?? 0)}`}
        // Pivote en la esquina inferior izquierda de los tramos: el borde del acantilado.
        style={{ originX: 0, originY: 1 }}
        initial={false}
        animate={
          outcome === 'corto'
            ? { rotate: [0, 0, 18], y: [0, 0, 30] }
            : outcome === 'largo'
              ? { rotate: [0, -3, -1.5, -3], y: [0, -12, -8, -12] }
              : { rotate: 0, y: 0 }
        }
        transition={{
          duration: still ? 0 : outcome === 'largo' ? 1 : duration,
          times: outcome === 'corto' ? [0, 0.6, 1] : undefined,
        }}
      >
        {beams.map((beam) => (
          <g key={beam.id}>
            <rect
              x={beam.x}
              y={DECK - BEAM}
              width={beam.width}
              height={BEAM}
              fill={beam.shade ? 'var(--land-high)' : 'var(--land-mid)'}
              stroke="var(--ink)"
              strokeWidth="1.5"
            />
            {beam.width > 70 && (
              <text
                x={beam.x + beam.width / 2}
                y={DECK - 4}
                textAnchor="middle"
                className="font-display"
                fontSize="11"
                fontWeight="700"
                fill="var(--sea-950)"
              >
                {beam.label}
              </text>
            )}
          </g>
        ))}
        {beams.length > 0 && end < RIGHT && (
          <path
            d={`M${String(end)} ${String(DECK - BEAM)}v${String(BEAM)}`}
            stroke="var(--route)"
            strokeWidth="3"
          />
        )}
      </motion.g>

      {/* Vagoneta de prueba */}
      <motion.g
        key={`vagoneta-${String(last?.serial ?? 0)}`}
        initial={false}
        animate={
          outcome === 'resiste'
            ? { x: RIGHT - LEFT + 40 }
            : outcome === 'corto'
              ? { x: [0, reach + 20, reach + 50], y: [0, 0, 120], rotate: [0, 0, 55] }
              : outcome === 'largo'
                ? { x: [0, 36, 24, 36] }
                : { x: 0, y: 0, rotate: 0 }
        }
        transition={{
          duration: still ? 0 : outcome === 'largo' ? 1 : duration,
          ease: 'easeInOut',
          times: outcome === 'corto' ? [0, 0.6, 1] : undefined,
        }}
      >
        <g transform={`translate(${String(LEFT - 70)} ${String(DECK - BEAM - 26)})`}>
          <path d="M2 0h44l-4 18H6z" fill="var(--sea-700)" stroke="var(--ink)" strokeWidth="1.5" />
          <rect
            x="12"
            y="-8"
            width="24"
            height="8"
            fill="var(--land-sun)"
            stroke="var(--ink)"
            strokeWidth="1.5"
          />
          <circle cx="13" cy="22" r="5" fill="var(--plate)" stroke="var(--ink)" strokeWidth="1.5" />
          <circle cx="35" cy="22" r="5" fill="var(--plate)" stroke="var(--ink)" strokeWidth="1.5" />
        </g>
      </motion.g>

      {outcome === 'corto' && (
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0, 1, 0.6] }}
          transition={{ duration: still ? 0 : 2.2, times: [0, 0.75, 0.85, 1] }}
        >
          {[0, 1, 2].map((r) => (
            <ellipse
              key={r}
              cx={end + 30}
              cy="232"
              rx={10 + r * 12}
              ry={3 + r * 2}
              fill="none"
              stroke="var(--plate)"
              strokeWidth="1.5"
            />
          ))}
        </motion.g>
      )}
    </svg>
  );
}

function Cliff({ x, width, side }: { x: number; width: number; side: 'left' | 'right' }) {
  const inner = side === 'left' ? x + width : x;
  const step = side === 'left' ? -1 : 1;
  const terraces = [
    { top: DECK, fill: 'var(--land-low)', inset: 0 },
    { top: DECK + 28, fill: 'var(--land-mid)', inset: 18 },
    { top: DECK + 52, fill: 'var(--land-high)', inset: 34 },
  ];
  return (
    <g>
      {terraces.map((t) => {
        // Cada terraza baja sale un poco más hacia el hueco, como un talud escalonado.
        const edge = inner - step * t.inset;
        const xs = side === 'left' ? [x, edge] : [edge, x + width];
        return (
          <path
            key={t.top}
            d={`M${String(xs[0])} ${String(t.top)}H${String(xs[1])}V${String(H)}H${String(xs[0])}Z`}
            fill={t.fill}
            stroke="var(--ink)"
            strokeWidth="1.5"
          />
        );
      })}
    </g>
  );
}
