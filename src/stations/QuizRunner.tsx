import { useEffect, useId, useRef, useState } from 'react';
import { aiFeedback, localFeedback } from '@/ai/brujula';
import type { QuizItem } from '@/data/contentSchemas';
import { Button } from '@/ui/Button';
import { cx } from '@/ui/cx';
import type { BrujulaMessage } from './BrujulaBubble';

/**
 * Preguntas una a una con retroalimentación inmediata. Se responde con clic o
 * teclado (radios nativos); la corrección se anuncia y Brújula la amplía.
 */
export function QuizRunner({
  items,
  competency,
  onAnswer,
  onFinish,
  onBrujula,
  finishLabel = 'Terminar',
}: {
  items: QuizItem[];
  competency: string;
  onAnswer: (item: QuizItem, correct: boolean) => void;
  onFinish: (correctCount: number) => void;
  onBrujula: (message: BrujulaMessage | null) => void;
  finishLabel?: string;
}) {
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const legendId = useId();
  const heading = useRef<HTMLLegendElement>(null);
  const item = items[index];

  useEffect(() => {
    heading.current?.focus();
  }, [index]);

  if (!item) return null;
  const selected = item.options.find((o) => o.id === choice);
  const last = index === items.length - 1;

  const check = () => {
    if (!choice || checked) return;
    const correct = Boolean(selected?.correct);
    setChecked(true);
    if (correct) setCorrectCount((n) => n + 1);
    onAnswer(item, correct);
    onBrujula({ text: localFeedback(item, choice).tip, source: 'local' });
    void aiFeedback(item, choice, competency).then((output) => {
      if (output)
        onBrujula({ text: [output.feedback, output.tip].filter(Boolean).join(' '), source: 'ia' });
    });
  };

  const next = () => {
    if (last) {
      onFinish(correctCount);
      return;
    }
    setIndex((i) => i + 1);
    setChoice(null);
    setChecked(false);
    onBrujula(null);
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (checked) next();
        else check();
      }}
    >
      <p className="text-sm text-ink-soft tabular-nums">
        Pregunta {index + 1} de {items.length}
      </p>
      <fieldset className="mt-2" aria-describedby={item.context ? `${legendId}-ctx` : undefined}>
        <legend
          id={legendId}
          ref={heading}
          tabIndex={-1}
          className="font-display text-xl font-extrabold outline-none"
        >
          {item.prompt}
        </legend>
        {item.context && (
          <blockquote
            id={`${legendId}-ctx`}
            className="mt-3 bg-plate-sunk px-4 py-3 font-display text-lg plate-rule"
          >
            {item.context}
          </blockquote>
        )}
        <div className="mt-4 grid gap-2">
          {item.options.map((option) => {
            const isChosen = choice === option.id;
            return (
              <label
                key={option.id}
                className={cx(
                  'flex min-h-12 cursor-pointer items-center gap-3 border-[1.5px] px-4 py-2',
                  'has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-(--focus)',
                  checked && option.correct && 'border-land-low bg-land-low/15',
                  checked && isChosen && !option.correct && 'border-route bg-route/10',
                  !checked && isChosen && 'border-ink bg-plate-sunk',
                  !checked && !isChosen && 'border-plate-edge hover:border-ink',
                  checked && 'cursor-default',
                )}
              >
                <input
                  type="radio"
                  name={`pregunta-${item.id}`}
                  value={option.id}
                  checked={isChosen}
                  disabled={checked}
                  onChange={() => {
                    setChoice(option.id);
                  }}
                  className="size-4 accent-ink"
                />
                <span>{option.text}</span>
                {checked && option.correct && (
                  <span className="ml-auto text-sm font-semibold">Correcta</span>
                )}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div role="status" aria-live="polite" className="mt-4 min-h-6">
        {checked && selected && (
          <p
            className={cx(
              'font-semibold',
              selected.correct ? 'text-isle-latidosocial' : 'text-route',
            )}
          >
            {selected.correct ? '¡Bien!' : 'No es esa.'}{' '}
            <span className="font-normal text-ink">{selected.feedback}</span>
          </p>
        )}
      </div>

      <div className="mt-4">
        {checked ? (
          <Button type="submit">{last ? finishLabel : 'Siguiente'}</Button>
        ) : (
          <Button type="submit" disabled={!choice}>
            Comprobar
          </Button>
        )}
      </div>
    </form>
  );
}
