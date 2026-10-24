import type { NewsItem } from '@/data/contentSchemas';
import { cx } from '@/ui/cx';
import { INVESTIGATE_COST, type Decision } from './engine';
import { clockTime, VERDICT_SLIP } from './labels';

/**
 * Franja del estudio de radio: el reloj de cierre como esfera que se vacía de
 * amarillo con cada minuto gastado, la parrilla de la edición y la luz de
 * «al aire». El estado se lee también en texto.
 */
export function NewsroomStrip({
  budget,
  clock,
  queue,
  index,
  decisions,
}: {
  budget: number;
  clock: number;
  queue: NewsItem[];
  index: number;
  decisions: Decision[];
}) {
  const remaining = Math.max(0, clock) / budget;
  const urgent = clock <= 30;
  const onAir = decisions.some((d) => d.verdict === 'publicar');
  const ticks = Math.floor(budget / INVESTIGATE_COST);

  // Sector de lo que queda, desde «cierre» (arriba) en sentido horario.
  const angle = remaining * Math.PI * 2;
  const end = { x: 40 + 30 * Math.sin(angle), y: 40 - 30 * Math.cos(angle) };
  const wedge =
    remaining >= 0.999
      ? 'M40 10 A30 30 0 1 1 39.99 10 Z'
      : `M40 40 L40 10 A30 30 0 ${angle > Math.PI ? 1 : 0} 1 ${String(end.x)} ${String(end.y)} Z`;

  return (
    <div className="on-sea grid gap-4 bg-sea-900 p-4 text-plate plate-rule sm:grid-cols-[auto_1fr_auto] sm:items-center">
      <div className="flex items-center gap-3">
        <svg width="80" height="80" viewBox="0 0 80 80" aria-hidden="true" className="shrink-0">
          <circle
            cx="40"
            cy="40"
            r="34"
            fill="var(--sea-950)"
            stroke="var(--sea-300)"
            strokeWidth="1.5"
          />
          {clock > 0 && <path d={wedge} fill={urgent ? 'var(--land-high)' : 'var(--land-sun)'} />}
          {Array.from({ length: ticks }, (_, i) => {
            const a = (i / ticks) * Math.PI * 2;
            return (
              <line
                key={i}
                x1={40 + 31 * Math.sin(a)}
                y1={40 - 31 * Math.cos(a)}
                x2={40 + 34 * Math.sin(a)}
                y2={40 - 34 * Math.cos(a)}
                stroke="var(--plate)"
                strokeWidth="1.5"
              />
            );
          })}
          <circle cx="40" cy="40" r="3" fill="var(--plate)" />
          <path d="M36 4h8" stroke="var(--plate)" strokeWidth="2" />
        </svg>
        <div>
          <p className="toponym text-[0.625rem] text-sea-100">Cierre de edición</p>
          <p className="font-display text-2xl font-extrabold tabular-nums">{clockTime(clock)}</p>
          <p
            className={cx(
              'text-sm tabular-nums',
              urgent ? 'font-bold text-land-sun' : 'text-sea-100',
            )}
          >
            {clock > 0 ? `Faltan ${String(clock)} min para las 6:00 p. m.` : 'La edición cerró.'}
          </p>
        </div>
      </div>

      <ol aria-label="Parrilla de la edición" className="flex flex-wrap gap-2 sm:justify-center">
        {queue.map((news, i) => {
          const decision = decisions.find((d) => d.newsId === news.id);
          const current = i === index && clock > 0;
          return (
            <li
              key={news.id}
              aria-current={current ? 'step' : undefined}
              className={cx(
                'flex min-w-20 flex-col items-center border-[1.5px] px-2 py-1.5 text-center',
                current ? 'border-land-sun bg-sea-800' : 'border-sea-500',
                decision && 'bg-sea-950',
              )}
            >
              <span className="font-display text-sm font-bold tabular-nums">Nota {i + 1}</span>
              <span className="text-xs text-sea-100">
                {decision ? VERDICT_SLIP[decision.verdict] : current ? 'En la mesa' : 'En espera'}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="flex items-center gap-2 sm:justify-end">
        <span
          aria-hidden="true"
          className={cx(
            'border-[1.5px] px-2.5 py-1 font-display text-sm font-extrabold tracking-[0.18em]',
            onAir ? 'border-land-sun bg-land-sun text-sea-950' : 'border-sea-500 text-sea-300',
          )}
        >
          AL AIRE
        </span>
        <span className="sr-only">
          {onAir ? 'La radio ya transmite noticias de esta edición.' : 'Aún no sale nada al aire.'}
        </span>
      </div>
    </div>
  );
}
