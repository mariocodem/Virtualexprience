import { useEffect, useId, useRef, useState } from 'react';
import type { Dilemma } from '@/data/contentSchemas';
import { Button } from '@/ui/Button';
import { cx } from '@/ui/cx';
import { effectSummary, QUALITY_LABEL } from './effects';

type Option = Dilemma['options'][number];

/**
 * Dilema con salidas defendibles a distinto grado. Se elige con radios nativos
 * (clic o teclado), se confirma y se lee la consecuencia antes de seguir.
 */
export function DilemmaPanel({
  dilemma,
  effectLabels,
  continueLabel,
  onDecide,
  onContinue,
}: {
  dilemma: Dilemma;
  effectLabels: Record<string, string>;
  continueLabel: string;
  onDecide: (option: Option) => void;
  onContinue: () => void;
}) {
  const [choice, setChoice] = useState<string | null>(null);
  const [decided, setDecided] = useState<Option | null>(null);
  const legend = useRef<HTMLLegendElement>(null);
  const proceed = useRef<HTMLButtonElement>(null);
  const name = useId();

  useEffect(() => {
    if (decided) proceed.current?.focus();
    else legend.current?.focus();
  }, [decided]);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (decided) {
          onContinue();
          return;
        }
        const option = dilemma.options.find((o) => o.id === choice);
        if (!option) return;
        setDecided(option);
        onDecide(option);
      }}
    >
      <fieldset>
        <legend
          ref={legend}
          tabIndex={-1}
          className="font-display text-xl font-extrabold outline-none"
        >
          {dilemma.prompt}
        </legend>
        <div className="mt-3 grid gap-2">
          {dilemma.options.map((option) => {
            const chosen = choice === option.id;
            const shown = decided !== null;
            return (
              <label
                key={option.id}
                className={cx(
                  'flex min-h-12 cursor-pointer items-start gap-3 border-[1.5px] px-4 py-3',
                  'has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-(--focus)',
                  shown && option.quality === 1 && 'border-isle-latidosocial bg-land-low/15',
                  shown && chosen && option.quality < 1 && 'border-land-high bg-land-high/10',
                  !shown && chosen && 'border-ink bg-plate-sunk',
                  !shown && !chosen && 'border-plate-edge hover:border-ink',
                  shown && !chosen && option.quality < 1 && 'border-plate-edge opacity-70',
                  shown && 'cursor-default',
                )}
              >
                <input
                  type="radio"
                  name={name}
                  value={option.id}
                  checked={chosen}
                  disabled={shown}
                  onChange={() => {
                    setChoice(option.id);
                  }}
                  className="mt-1 size-4 shrink-0 accent-ink"
                />
                <span className="flex-1">
                  {option.text}
                  {shown && (chosen || option.quality === 1) && (
                    <span className="mt-1 block text-sm font-semibold">
                      {QUALITY_LABEL[option.quality]}
                      {chosen && effectSummary(option.effects, effectLabels) && (
                        <span className="font-normal text-ink-soft">
                          {' '}
                          · {effectSummary(option.effects, effectLabels)}
                        </span>
                      )}
                    </span>
                  )}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <div role="status" aria-live="polite" className="mt-4 min-h-6">
        {decided && (
          <p>
            <span className="font-semibold">{QUALITY_LABEL[decided.quality]}.</span>{' '}
            {decided.feedback}
          </p>
        )}
      </div>
      <div className="mt-4">
        {decided ? (
          <Button ref={proceed} type="submit" size="lg">
            {continueLabel}
          </Button>
        ) : (
          <Button type="submit" size="lg" disabled={!choice}>
            Decidir
          </Button>
        )}
      </div>
    </form>
  );
}
