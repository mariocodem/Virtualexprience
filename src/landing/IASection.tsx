import { useInView } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { CompassRose } from '@/ui/CompassRose';
import { StationSymbol } from '@/ui/StationSymbol';
import { cx } from '@/ui/cx';

type Entry =
  { who: 'brujula' | 'tu'; text: string } | { who: 'ajuste'; text: string; level: number };

/** Conversación de ejemplo (sintética) en la Sala de Redacción. */
const LOG: Entry[] = [
  {
    who: 'brujula',
    text: 'Publicaste dos notas sin revisar la fecha. ¿Quieres una pista antes del cierre?',
  },
  { who: 'tu', text: 'Sí. ¿Qué reviso primero?' },
  {
    who: 'brujula',
    text: 'Compara la fecha de la nota con la del hecho que cita. Si no coinciden, pide corrección.',
  },
  { who: 'ajuste', text: 'Dificultad de la edición 3 → 2 · +30 s antes del cierre', level: 2 },
  { who: 'tu', text: 'Pedí corrección: la cita era de 2019.' },
  { who: 'brujula', text: 'Bien visto. La próxima edición traerá señales más sutiles.' },
  { who: 'ajuste', text: 'Dificultad de la edición 2 → 3', level: 3 },
];

const STEP_MS = 1100;

/** Brújula te acompaña: una bitácora de ejemplo donde la guía ajusta la dificultad. */
export function IASection({ reduced }: { reduced: boolean }) {
  const log = useRef<HTMLOListElement>(null);
  const inView = useInView(log, { once: true, amount: 0.5 });
  const [revealed, setRevealed] = useState(0);
  const shown = reduced ? LOG.length : revealed;

  useEffect(() => {
    if (reduced || !inView) return;
    const reveal = () => {
      setRevealed((n) => Math.min(LOG.length, n + 1));
    };
    const first = window.setTimeout(reveal, 250);
    const timer = window.setInterval(reveal, STEP_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [inView, reduced]);

  const level = LOG.slice(0, shown).reduce(
    (current, entry) => (entry.who === 'ajuste' ? entry.level : current),
    3,
  );

  return (
    <section
      id="brujula"
      aria-labelledby="brujula-titulo"
      className="relative z-[1] bg-plate-sunk px-4 py-24 sm:px-8 sm:py-32"
    >
      <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16">
        <div>
          <h2
            id="brujula-titulo"
            data-escala
            className="display text-[clamp(2.25rem,1.4rem+2.8vw,4rem)]"
          >
            Brújula te acompaña
          </h2>
          <p className="mt-6 max-w-[52ch] text-lg">
            Brújula aprende de cómo resuelves cada estación: ajusta la dificultad, ofrece una pista
            cuando la necesitas y te propone otro formato si uno no te funciona.
          </p>
          <ul className="mt-8 space-y-4 border-t-[1.5px] border-ink pt-6">
            {[
              [
                'Funciona sin conexión.',
                'El motor adaptativo corre en tu equipo, también en la app de escritorio.',
              ],
              [
                'Te explica el porqué.',
                'La retroalimentación nombra el criterio que aplicaste, no solo si acertaste.',
              ],
              [
                'Cuida tus datos.',
                'Si se activa un modelo de lenguaje, solo recibe el texto de tu respuesta.',
              ],
            ].map(([title, text]) => (
              <li key={title} className="grid grid-cols-[auto_1fr] gap-x-4">
                <span aria-hidden="true" className="mt-2 size-2.5 bg-ink" />
                <p>
                  <strong className="font-semibold">{title}</strong>{' '}
                  <span className="text-ink-soft">{text}</span>
                </p>
              </li>
            ))}
          </ul>
        </div>

        <figure className="self-start bg-plate plate-rule">
          <div className="flex flex-col gap-2 border-b-[1.5px] border-ink px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <span className="toponym text-[0.6875rem]">Bitácora · Sala de Redacción</span>
            <Gauge level={level} />
          </div>
          <ol
            ref={log}
            className="space-y-3 p-5 sm:p-6"
            aria-label="Conversación de ejemplo con Brújula"
          >
            {LOG.map((entry, i) => (
              <li
                key={i}
                className={cx(
                  'transition-[opacity,translate,visibility] duration-(--dur-slow) ease-out',
                  i < shown
                    ? 'visible translate-y-0 opacity-100'
                    : 'invisible translate-y-1 opacity-0',
                )}
              >
                <LogLine entry={entry} />
              </li>
            ))}
          </ol>
          <figcaption className="border-t-[1.5px] border-ink px-5 py-3 text-sm text-ink-soft">
            Ejemplo ilustrativo de una partida; no son datos de estudiantes reales.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

function LogLine({ entry }: { entry: Entry }) {
  if (entry.who === 'ajuste') {
    return (
      <p className="flex items-center gap-3 border-y border-dashed border-ink/40 py-2 text-sm text-ink-soft tabular-nums">
        <span aria-hidden="true" className="size-2 bg-route" />
        {entry.text}
      </p>
    );
  }
  const brujula = entry.who === 'brujula';
  return (
    <div className={cx('grid grid-cols-[2rem_1fr] gap-3', !brujula && 'pl-8 sm:pl-14')}>
      <span aria-hidden="true" className="mt-0.5">
        {brujula ? <CompassRose size={28} /> : <StationSymbol status="en-curso" size={26} />}
      </span>
      <p>
        <span className="font-display text-sm font-bold">{brujula ? 'Brújula' : 'Tú'}</span>
        <span className="sr-only">: </span>
        <span className="block">{entry.text}</span>
      </p>
    </div>
  );
}

function Gauge({ level }: { level: number }) {
  return (
    <span className="flex items-center gap-2 whitespace-nowrap">
      <span className="text-xs text-ink-soft">Dificultad</span>
      <span className="flex gap-1" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            className={cx(
              'h-3 w-2.5 border-[1.5px] border-ink transition-colors duration-(--dur-base)',
              n <= level ? 'bg-ink' : 'bg-transparent',
            )}
          />
        ))}
      </span>
      <span className="text-xs font-semibold tabular-nums" aria-live="polite">
        {level} de 5
      </span>
    </span>
  );
}
