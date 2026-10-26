import { useEffect, useEffectEvent, useRef, type ReactNode } from 'react';
import { cx } from '@/ui/cx';

export interface WheelOption {
  id: string;
  text: string;
}

export interface WheelFeedback {
  /** Intervención elegida. */
  optionId: string;
  /** Cómo cayó: «Intervención sólida». */
  label: string;
  tone: 'good' | 'mid' | 'bad';
  text: string;
  /** Líneas extra: efecto en la confianza, acuerdo del acta, lección de Brújula. */
  notes?: string[];
}

const TONE_RING = {
  good: 'border-isle-latidosocial bg-land-low/15',
  mid: 'border-land-sun bg-land-sun/20',
  bad: 'border-land-high bg-land-high/10',
} as const;

/**
 * La rueda de intervenciones: lo que dice quien habla (el globo) y las
 * respuestas posibles de quien modera, con clic o con las teclas 1 a 6. Tras
 * elegir muestra cómo cayó la intervención y espera a que se siga. Es HTML real:
 * se juega con teclado y se lee con lector de pantalla.
 */
export function Wheel({
  kicker,
  quote,
  context,
  prompt = '¿Cómo respondes desde la moderación?',
  options,
  feedback,
  onChoose,
  onContinue,
  continueLabel = 'Seguir',
  className,
  children,
}: {
  kicker: string;
  quote: string;
  context?: string;
  prompt?: string;
  options: readonly WheelOption[];
  feedback: WheelFeedback | null;
  onChoose: (optionId: string) => void;
  onContinue: () => void;
  continueLabel?: string;
  className?: string;
  children?: ReactNode;
}) {
  const tone = feedback?.tone;
  const heading = useRef<HTMLHeadingElement>(null);
  const proceed = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (feedback) proceed.current?.focus();
    else heading.current?.focus();
  }, [feedback]);

  const onKey = useEffectEvent((event: KeyboardEvent) => {
    if (feedback || event.altKey || event.ctrlKey || event.metaKey) return;
    const option = options[['1', '2', '3', '4', '5', '6'].indexOf(event.key)];
    if (option) {
      event.preventDefault();
      onChoose(option.id);
    }
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

  return (
    <section
      aria-labelledby="rueda-titulo"
      className={cx(
        'pointer-events-auto max-h-full w-full max-w-3xl overflow-y-auto bg-plate p-4 text-ink [--focus:var(--route)] plate-rule sm:p-5',
        className,
      )}
    >
      <p className="toponym text-[0.625rem] text-ink-soft">{kicker}</p>
      <h2
        id="rueda-titulo"
        ref={heading}
        tabIndex={-1}
        className="mt-1 border-l-[3px] border-route bg-plate-sunk px-3 py-2 font-display text-base font-extrabold outline-none sm:text-lg"
      >
        «{quote}»
      </h2>
      {context && <p className="mt-2 text-sm text-ink-soft">{context}</p>}
      {children}
      <p className="mt-3 text-sm font-semibold">{prompt}</p>
      <ul
        className={cx(
          'mt-2 grid gap-2',
          options.length === 2 && 'sm:grid-cols-2',
          options.length >= 3 && 'sm:grid-cols-3',
        )}
      >
        {options.map((option, i) => {
          const chosen = feedback?.optionId === option.id;
          return (
            <li key={option.id} className="flex">
              <button
                type="button"
                disabled={Boolean(feedback)}
                aria-keyshortcuts={String(i + 1)}
                aria-pressed={feedback ? chosen : undefined}
                onClick={() => {
                  onChoose(option.id);
                }}
                className={cx(
                  'flex min-h-11 w-full items-start gap-2 border-[1.5px] px-3 py-2 text-left text-sm',
                  chosen && tone
                    ? TONE_RING[tone]
                    : 'border-plate-edge hover:border-ink disabled:opacity-60',
                )}
              >
                <kbd
                  aria-hidden="true"
                  className="inline-flex size-6 shrink-0 items-center justify-center border-[1.5px] border-ink font-display text-xs font-bold"
                >
                  {i + 1}
                </kbd>
                <span>«{option.text}»</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div role="status" aria-live="polite" className="mt-3 min-h-5 text-sm">
        {feedback && (
          <>
            <p>
              <span className="font-semibold">{feedback.label}. </span>
              {feedback.text}
            </p>
            {feedback.notes?.map((note) => (
              <p key={note} className="mt-1 text-ink-soft">
                {note}
              </p>
            ))}
          </>
        )}
      </div>
      {feedback && (
        <button
          ref={proceed}
          type="button"
          onClick={onContinue}
          className="mt-3 inline-flex min-h-11 items-center border-[1.5px] border-sea-900 bg-sea-900 px-5 font-display font-bold text-land-sun"
        >
          {continueLabel}
        </button>
      )}
    </section>
  );
}
