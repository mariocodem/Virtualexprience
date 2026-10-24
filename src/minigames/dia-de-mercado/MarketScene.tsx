import { motion } from 'motion/react';

const W = 800;
const H = 280;
const PER_CRATE = 20;

/**
 * El puesto del mercado en alzado: toldo a franjas, mostrador y las cajas del
 * pedido. Al cierre, las cajas vendidas se vacían y las sobrantes quedan
 * tachadas; la fila muestra a quienes quedaron sin atender. Decorativo.
 */
export function MarketScene({
  order,
  sold,
  missed,
  closed,
  team,
  still,
}: {
  order: number | null;
  sold: number;
  missed: number;
  closed: boolean;
  team: number;
  still: boolean;
}) {
  const crates = order === null ? 0 : Math.ceil(order / PER_CRATE);
  const soldCrates = closed ? Math.floor(sold / PER_CRATE) : 0;
  const queue = closed ? Math.min(12, Math.ceil((sold + missed) / 12)) : 6;
  const served = closed
    ? Math.min(queue, Math.round((sold / Math.max(1, sold + missed)) * queue))
    : 0;
  const stripes = 10;

  return (
    <svg
      viewBox={`0 0 ${String(W)} ${String(H)}`}
      aria-hidden="true"
      className="block h-auto w-full"
    >
      <rect x="0" y="236" width={W} height="44" fill="var(--plate-edge)" />
      <path d={`M0 236H${String(W)}`} stroke="var(--ink)" strokeWidth="1.5" />

      {/* Postes y toldo a franjas */}
      <path d="M90 236V58M470 236V58" stroke="var(--ink)" strokeWidth="4" />
      {Array.from({ length: stripes }, (_, i) => {
        const x = 70 + (i * 420) / stripes;
        const w = 420 / stripes;
        return (
          <path
            key={i}
            d={`M${String(x)} 40h${String(w)}v34a${String(w / 2)} ${String(w / 2.4)} 0 0 1 ${String(-w)} 0z`}
            fill={i % 2 ? 'var(--plate)' : 'var(--isle-gerencia)'}
            stroke="var(--ink)"
            strokeWidth="1.5"
          />
        );
      })}
      <rect
        x="220"
        y="14"
        width="120"
        height="24"
        fill="var(--plate)"
        stroke="var(--ink)"
        strokeWidth="1.5"
      />
      <text
        x="280"
        y="31"
        textAnchor="middle"
        className="font-display"
        fontSize="12"
        fontWeight="800"
        letterSpacing="2"
        fill="var(--ink)"
      >
        EMPANADAS
      </text>

      {/* Mostrador */}
      <rect
        x="80"
        y="170"
        width="400"
        height="66"
        fill="var(--land-high)"
        stroke="var(--ink)"
        strokeWidth="1.5"
      />
      <path d="M80 186H480" stroke="var(--ink)" strokeWidth="1.5" />

      {/* Cajas del pedido */}
      {Array.from({ length: crates }, (_, i) => {
        const col = i % 6;
        const row = Math.floor(i / 6);
        const x = 100 + col * 62;
        const y = 136 - row * 30;
        const emptied = i < soldCrates;
        const leftover = closed && i >= Math.ceil(sold / PER_CRATE);
        return (
          <motion.g
            key={i}
            initial={still ? false : { y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: still ? 0 : 0.35, delay: still ? 0 : i * 0.05 }}
          >
            <rect
              x={x}
              y={y}
              width="54"
              height="30"
              fill={leftover ? 'var(--plate-sunk)' : 'var(--land-mid)'}
              stroke="var(--ink)"
              strokeWidth="1.5"
            />
            {!emptied &&
              [0, 1, 2].map((k) => (
                <path
                  key={k}
                  d={`M${String(x + 8 + k * 15)} ${String(y + 20)}a7 7 0 0 1 14 0z`}
                  fill={leftover ? 'var(--plate-edge)' : 'var(--land-sun)'}
                  stroke="var(--ink)"
                  strokeWidth="1"
                />
              ))}
            {leftover && (
              <path
                d={`M${String(x)} ${String(y)}l54 30M${String(x + 54)} ${String(y)}l-54 30`}
                stroke="var(--land-high)"
                strokeWidth="2"
              />
            )}
          </motion.g>
        );
      })}

      {/* Equipo detrás del mostrador: más erguido cuanto mejor el ánimo */}
      {[150, 250, 350].map((x, i) => (
        <g
          key={x}
          transform={`translate(${String(x)} ${String(team < 40 && i > 0 ? 6 : 0)})`}
          opacity={team < 40 && i === 2 ? 0.45 : 1}
        >
          <circle cx="0" cy="96" r="10" fill="var(--plate)" stroke="var(--ink)" strokeWidth="1.5" />
          <path
            d="M-14 136q0-26 14-26t14 26z"
            fill="var(--sea-700)"
            stroke="var(--ink)"
            strokeWidth="1.5"
          />
        </g>
      ))}

      {/* Fila de clientes */}
      {Array.from({ length: queue }, (_, i) => {
        const x = 530 + i * 22;
        const waiting = closed && i >= served;
        return (
          <g key={i} opacity={waiting ? 0.35 : 1}>
            <circle
              cx={x}
              cy={180}
              r="8"
              fill="var(--plate)"
              stroke="var(--ink)"
              strokeWidth="1.5"
            />
            <path
              d={`M${String(x - 10)} 236q0-44 10-44t10 44z`}
              fill={i % 2 ? 'var(--sea-500)' : 'var(--sea-300)'}
              stroke="var(--ink)"
              strokeWidth="1.5"
            />
          </g>
        );
      })}
    </svg>
  );
}
