import { motion } from 'motion/react';
import { REST } from './engine';

const W = 800;
const H = 250;
const GROUND = 200;
const PLANTS_PER_BED = 6;
const COLORS = ['var(--land-sun)', 'var(--sea-300)', 'var(--land-high)', 'var(--plate)'];

/**
 * La huerta en alzado: una era por tarea de la luna, con plantas que crecen a
 * medida que la huerta alimenta a más familias y una tierra más oscura cuanto
 * más sano el suelo. Cada grupo aparece junto a su tarea o descansando bajo el
 * árbol del bosque comunitario; quien se agotó, encorvado. Decorativo.
 */
export function HuertaScene({
  beds,
  groups,
  assignment,
  exhausted,
  growth,
  suelo,
  still,
}: {
  /** Tareas de la luna, en orden. */
  beds: string[];
  groups: string[];
  /** Tarea o descanso de cada grupo; nulo mientras se reparte. */
  assignment: Record<string, string> | null;
  exhausted: string[];
  /** Familias alimentadas frente a la meta (0 a 1). */
  growth: number;
  suelo: number;
  still: boolean;
}) {
  const span = 520 / Math.max(1, beds.length);
  const bedX = (i: number) => 60 + i * span + span * 0.1;
  const bedW = span * 0.8;
  const plants = Math.round(Math.min(1, growth) * beds.length * PLANTS_PER_BED);

  const spot = (group: string, i: number) => {
    const choice = assignment?.[group];
    const crew = groups.filter((g) => assignment?.[g] === choice);
    if (choice === REST) return { x: 616 + crew.indexOf(group) * 34, y: GROUND, resting: true };
    const bed = choice ? beds.indexOf(choice) : -1;
    if (bed >= 0) {
      return { x: bedX(bed) + 16 + crew.indexOf(group) * 26, y: GROUND + 42, resting: false };
    }
    return { x: 20 + i * 24, y: GROUND + 42, resting: false };
  };

  return (
    <svg
      viewBox={`0 0 ${String(W)} ${String(H)}`}
      aria-hidden="true"
      className="block h-auto w-full"
    >
      <rect x="0" y={GROUND} width={W} height={H - GROUND} fill="var(--land-low)" />
      <path d={`M0 ${String(GROUND)}H${String(W)}`} stroke="var(--ink)" strokeWidth="1.5" />

      {/* Árbol del bosque comunitario, donde se descansa */}
      <path d={`M690 ${String(GROUND)}V120`} stroke="var(--ink)" strokeWidth="6" />
      <circle
        cx="690"
        cy="96"
        r="56"
        fill="var(--isle-latidosocial)"
        stroke="var(--ink)"
        strokeWidth="1.5"
      />
      <circle
        cx="652"
        cy="120"
        r="30"
        fill="var(--isle-latidosocial)"
        stroke="var(--ink)"
        strokeWidth="1.5"
      />

      {/* Eras: la tierra se oscurece cuanto más sano el suelo */}
      {beds.map((bed, i) => {
        const x = bedX(i);
        const mine = Array.from(
          { length: PLANTS_PER_BED },
          (_, k) => i * PLANTS_PER_BED + k,
        ).filter((n) => n < plants);
        return (
          <g key={bed}>
            <rect
              x={x}
              y={GROUND - 22}
              width={bedW}
              height="22"
              fill="var(--land-high)"
              stroke="var(--ink)"
              strokeWidth="1.5"
            />
            <rect
              x={x}
              y={GROUND - 22}
              width={bedW}
              height="22"
              fill="var(--ink)"
              opacity={0.15 + (suelo / 100) * 0.45}
            />
            {mine.map((n) => {
              const k = n - i * PLANTS_PER_BED;
              const px = x + 10 + (k * (bedW - 20)) / (PLANTS_PER_BED - 1);
              return (
                <motion.g
                  key={n}
                  initial={still ? false : { scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: still ? 0 : 0.4, delay: still ? 0 : k * 0.04 }}
                  style={{ originX: `${String(px)}px`, originY: `${String(GROUND - 22)}px` }}
                >
                  <path
                    d={`M${String(px)} ${String(GROUND - 22)}v-16`}
                    stroke="var(--ink)"
                    strokeWidth="1.5"
                  />
                  <path
                    d={`M${String(px)} ${String(GROUND - 32)}q-9-2-10-10q9 0 10 10zM${String(px)} ${String(GROUND - 30)}q9-2 10-10q-9 0-10 10z`}
                    fill="var(--land-mid)"
                    stroke="var(--ink)"
                    strokeWidth="1"
                  />
                </motion.g>
              );
            })}
          </g>
        );
      })}

      {/* Grupos: junto a su tarea, bajo el árbol o en la entrada mientras se reparte */}
      {groups.map((group, i) => {
        const { x, y, resting } = spot(group, i);
        const tired = exhausted.includes(group);
        const color = COLORS[i % COLORS.length] ?? 'var(--plate)';
        return (
          <motion.g
            key={group}
            initial={false}
            animate={{ x, y: y + (tired ? 6 : 0) }}
            transition={{ duration: still ? 0 : 0.6, ease: 'easeInOut' }}
            opacity={tired ? 0.6 : 1}
          >
            <circle
              cx="0"
              cy={resting ? -26 : -40}
              r="8"
              fill="var(--plate)"
              stroke="var(--ink)"
              strokeWidth="1.5"
            />
            <path
              d={resting ? 'M-12 0q0-18 12-18t12 18z' : 'M-10 0q0-32 10-32t10 32z'}
              fill={color}
              stroke="var(--ink)"
              strokeWidth="1.5"
            />
            {resting && (
              <text x="10" y="-36" fontSize="11" fontWeight="700" fill="var(--ink)">
                z
              </text>
            )}
          </motion.g>
        );
      })}
    </svg>
  );
}
