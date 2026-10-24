import { useState } from 'react';
import type { ExplorarContent } from '@/data/contentSchemas';
import { Button } from '@/ui/Button';
import { cx } from '@/ui/cx';

type Interactivo = NonNullable<ExplorarContent['formats']['interactivo']>;

/**
 * Clasificar: cada tarjeta se asigna a una categoría con botones de opción
 * (teclado y clic), sin depender de arrastrar (DUA: acción y expresión).
 */
export function InteractivoFormat({ content }: { content: Interactivo }) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState(false);
  const done = Object.keys(answers).length === content.items.length;
  const score = content.items.filter((item, i) => answers[i] === item.category).length;

  return (
    <div>
      <p className="max-w-[65ch] font-semibold">{content.prompt}</p>
      <ul className="mt-4 grid gap-3">
        {content.items.map((item, i) => {
          const answer = answers[i];
          const right = checked && answer === item.category;
          const wrong = checked && answer !== item.category;
          return (
            <li
              key={item.text}
              className={cx(
                'border-[1.5px] p-3',
                right ? 'border-isle-latidosocial' : wrong ? 'border-route' : 'border-plate-edge',
              )}
            >
              <fieldset>
                <legend className="font-display font-bold">{item.text}</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {content.categories.map((category) => (
                    <label
                      key={category.id}
                      className={cx(
                        'inline-flex min-h-10 cursor-pointer items-center gap-2 border-[1.5px] px-3 text-sm',
                        'has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-(--focus)',
                        answer === category.id
                          ? 'border-ink bg-ink text-land-sun'
                          : 'border-plate-edge hover:border-ink',
                      )}
                    >
                      <input
                        type="radio"
                        className="sr-only"
                        name={`clasificar-${String(i)}`}
                        checked={answer === category.id}
                        disabled={checked}
                        onChange={() => {
                          setAnswers((a) => ({ ...a, [i]: category.id }));
                        }}
                      />
                      {category.label}
                    </label>
                  ))}
                </div>
                {wrong && (
                  <p className="mt-2 text-sm text-route">
                    Va en «{content.categories.find((c) => c.id === item.category)?.label}».
                  </p>
                )}
              </fieldset>
            </li>
          );
        })}
      </ul>
      <div role="status" aria-live="polite" className="mt-4 flex flex-wrap items-center gap-4">
        {checked ? (
          <p className="font-semibold tabular-nums">
            Clasificaste bien {score} de {content.items.length}.
          </p>
        ) : (
          <Button
            disabled={!done}
            onClick={() => {
              setChecked(true);
            }}
          >
            Revisar mi clasificación
          </Button>
        )}
        {checked && (
          <Button
            variant="quiet"
            onClick={() => {
              setAnswers({});
              setChecked(false);
            }}
          >
            Intentar de nuevo
          </Button>
        )}
      </div>
    </div>
  );
}
