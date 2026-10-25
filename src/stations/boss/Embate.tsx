import { useEffect, useRef } from 'react';
import type { Outcome } from '@/boss/engine';
import type { QuizItem } from '@/data/contentSchemas';
import { Button } from '@/ui/Button';
import { cx } from '@/ui/cx';
import { EMBATE_KEYS } from './keys';

export interface EmbateFeedback {
  correct: boolean;
  optionId: string | null;
  outcome: Outcome;
  /** Aviso extra tras la respuesta (p. ej., la Bruma cambia de forma). */
  note?: string | null;
}

/**
 * Un embate de la Bruma: la pregunta, las opciones (clic o teclas 1–5), la
 * retroalimentación anunciada y el botón para seguir. Lo comparten los
 * desafíos de isla y el Gran Reto del Faro.
 */
export function Embate({
  number,
  item,
  feedback,
  hidden,
  offerHint,
  hints,
  victoryLabel,
  onHint,
  onAnswer,
  onProceed,
}: {
  number: number;
  item: QuizItem;
  feedback: EmbateFeedback | null;
  hidden: string[];
  offerHint: boolean;
  hints: number;
  victoryLabel: string;
  onHint: () => void;
  onAnswer: (optionId: string) => void;
  onProceed: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const proceed = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (feedback) proceed.current?.focus();
    else heading.current?.focus();
  }, [feedback]);

  const visible = item.options.filter((o) => !hidden.includes(o.id));
  const chosen = feedback ? item.options.find((o) => o.id === feedback.optionId) : undefined;

  return (
    <div>
      <p className="text-sm text-ink-soft tabular-nums">Embate {number}</p>
      <h2
        ref={heading}
        tabIndex={-1}
        className="mt-1 font-display text-xl font-extrabold outline-none lg:text-2xl"
      >
        {item.prompt}
      </h2>
      {item.context && (
        <blockquote className="mt-3 bg-plate-sunk px-4 py-3 font-display text-lg plate-rule">
          {item.context}
        </blockquote>
      )}

      <ul className="mt-4 grid gap-2">
        {visible.map((option, i) => {
          const isChosen = feedback?.optionId === option.id;
          return (
            <li key={option.id}>
              <button
                type="button"
                disabled={Boolean(feedback)}
                aria-keyshortcuts={EMBATE_KEYS[i]}
                onClick={() => {
                  onAnswer(option.id);
                }}
                className={cx(
                  'flex min-h-12 w-full items-center gap-3 border-[1.5px] px-4 py-2 text-left',
                  feedback && option.correct && 'border-isle-latidosocial bg-land-low/15',
                  feedback && isChosen && !option.correct && 'border-route bg-route/10',
                  !feedback && 'border-plate-edge hover:border-ink hover:bg-plate-sunk',
                  feedback && !option.correct && !isChosen && 'border-plate-edge opacity-70',
                )}
              >
                <kbd
                  aria-hidden="true"
                  className="inline-flex size-7 shrink-0 items-center justify-center border-[1.5px] border-ink font-display text-sm font-bold"
                >
                  {i + 1}
                </kbd>
                <span>{option.text}</span>
                {feedback && option.correct && (
                  <span className="ml-auto text-sm font-semibold">Correcta</span>
                )}
                {feedback && isChosen && !option.correct && (
                  <span className="ml-auto text-sm font-semibold">Tu elección</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <div role="status" aria-live="polite" className="mt-4 min-h-6">
        {feedback && (
          <p
            className={cx(
              'font-semibold',
              feedback.correct ? 'text-isle-latidosocial' : 'text-route',
            )}
          >
            {feedback.correct
              ? 'Tu linterna atraviesa la Bruma.'
              : feedback.optionId
                ? 'La Bruma se espesa y apaga una de tus luces.'
                : 'Se agotó el tiempo: la Bruma apaga una de tus luces.'}{' '}
            <span className="font-normal text-ink">{chosen?.feedback ?? item.explanation}</span>
          </p>
        )}
        {feedback?.note && <p className="mt-2 font-semibold">{feedback.note}</p>}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {feedback ? (
          <Button ref={proceed} size="lg" onClick={onProceed}>
            {feedback.outcome === 'victoria'
              ? victoryLabel
              : feedback.outcome === 'retirada'
                ? 'Retirarse a recuperar la luz'
                : 'Siguiente embate'}
          </Button>
        ) : (
          offerHint && (
            <Button variant="secondary" onClick={onHint}>
              Pedir pista a Brújula ({hints})
            </Button>
          )
        )}
      </div>
    </div>
  );
}
