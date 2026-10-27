import { useEffect, useEffectEvent, useRef } from 'react';
import type { Signal } from '@/data/contentSchemas';
import { TOOL_LABEL } from '@/minigames/sala-de-redaccion/labels';
import { cx } from '@/ui/cx';
import type { Choice, LiveRumor } from './rumors';

export interface RumorFeedback {
  correct: boolean;
  text: string;
}

/**
 * Pausa táctica al interceptar un rumor: titular, fuente y fecha; se pueden
 * revisar dos señales (1 y 2) y se decide entre desmentirlo (3) o dejarlo pasar
 * (4). Tras decidir muestra qué pasó y por qué, y espera a que se siga.
 */
export function RumorCard({
  rumor,
  feedback,
  onReview,
  onChoose,
  onContinue,
  className,
}: {
  rumor: LiveRumor;
  feedback: RumorFeedback | null;
  onReview: (signal: Signal) => void;
  onChoose: (choice: Choice) => void;
  onContinue: () => void;
  className?: string;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const proceed = useRef<HTMLButtonElement>(null);
  const { item } = rumor;
  useEffect(() => {
    if (feedback) proceed.current?.focus();
    else heading.current?.focus();
  }, [feedback]);

  const onKey = useEffectEvent((event: KeyboardEvent) => {
    if (feedback || event.altKey || event.ctrlKey || event.metaKey) return;
    const index = ['1', '2', '3', '4'].indexOf(event.key);
    if (index < 0) return;
    event.preventDefault();
    const [first, second] = item.signals;
    if (index === 0 && first) onReview(first.signal);
    if (index === 1 && second) onReview(second.signal);
    if (index === 2) onChoose('desmentir');
    if (index === 3) onChoose('dejar-pasar');
  });
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      onKey(event);
    };
    document.addEventListener('keydown', listener);
    return () => {
      document.removeEventListener('keydown', listener);
    };
  }, []);

  const key = 'flex min-h-11 w-full items-center gap-3 border-[1.5px] px-3 py-2 text-left text-sm';
  return (
    <section
      aria-labelledby="rumor-titulo"
      className={cx(
        'pointer-events-auto w-full max-w-xl bg-plate p-4 text-ink [--focus:var(--route)] plate-rule sm:p-5',
        className,
      )}
    >
      <p className="toponym text-[0.625rem] text-ink-soft">
        Rumor interceptado · el reloj va más lento
      </p>
      <h2
        id="rumor-titulo"
        ref={heading}
        tabIndex={-1}
        className="mt-1 font-display text-lg leading-snug font-extrabold outline-none"
      >
        {item.headline}
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        {item.source} · {item.date}
      </p>

      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {item.signals.map((s, i) => {
          const seen = rumor.reviewed.includes(s.signal);
          return (
            <li key={s.signal}>
              <button
                type="button"
                disabled={seen || Boolean(feedback)}
                aria-keyshortcuts={String(i + 1)}
                onClick={() => {
                  onReview(s.signal);
                }}
                className={cx(
                  key,
                  seen ? 'border-sea-700 bg-plate-sunk' : 'border-plate-edge hover:border-ink',
                  'disabled:cursor-default',
                )}
              >
                <kbd
                  aria-hidden="true"
                  className="inline-flex size-6 shrink-0 items-center justify-center border-[1.5px] border-ink font-display text-xs font-bold"
                >
                  {i + 1}
                </kbd>
                {TOOL_LABEL[s.signal]}
              </button>
            </li>
          );
        })}
      </ul>
      {rumor.reviewed.length > 0 && (
        <ul className="mt-2 grid gap-1">
          {item.signals
            .filter((s) => rumor.reviewed.includes(s.signal))
            .map((s) => (
              <li
                key={s.signal}
                className="border-l-[3px] border-sea-700 bg-plate-sunk px-2 py-1 text-sm"
              >
                <span className="font-semibold">Verificación: </span>
                {s.text}
              </li>
            ))}
        </ul>
      )}

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          disabled={Boolean(feedback)}
          aria-keyshortcuts="3"
          onClick={() => {
            onChoose('desmentir');
          }}
          className={cx(
            key,
            'border-ink bg-ink text-land-sun hover:bg-sea-900 disabled:opacity-60',
          )}
        >
          <kbd
            aria-hidden="true"
            className="inline-flex size-6 shrink-0 items-center justify-center border-[1.5px] border-land-sun font-display text-xs font-bold"
          >
            3
          </kbd>
          Desmentir
        </button>
        <button
          type="button"
          disabled={Boolean(feedback)}
          aria-keyshortcuts="4"
          onClick={() => {
            onChoose('dejar-pasar');
          }}
          className={cx(key, 'border-ink hover:bg-plate-sunk disabled:opacity-60')}
        >
          <kbd
            aria-hidden="true"
            className="inline-flex size-6 shrink-0 items-center justify-center border-[1.5px] border-ink font-display text-xs font-bold"
          >
            4
          </kbd>
          Dejar pasar
        </button>
      </div>

      <div role="status" aria-live="polite" className="mt-3 min-h-5 text-sm">
        {feedback && (
          <p>
            <span
              className={cx(
                'font-semibold',
                feedback.correct ? 'text-isle-latidosocial' : 'text-route',
              )}
            >
              {feedback.correct ? 'Bien visto. ' : 'No era así. '}
            </span>
            {feedback.text}
          </p>
        )}
      </div>
      {feedback && (
        <button
          ref={proceed}
          type="button"
          onClick={onContinue}
          className="mt-3 inline-flex min-h-11 items-center border-[1.5px] border-sea-900 bg-sea-900 px-5 font-display font-bold text-land-sun"
        >
          Volver al combate
        </button>
      )}
    </section>
  );
}
