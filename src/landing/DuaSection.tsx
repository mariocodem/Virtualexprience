import { useId } from 'react';
import { TEXT_SCALES, usePreferences, type TextStep } from '@/a11y/preferences';
import { cx } from '@/ui/cx';

const PRINCIPLES = [
  {
    term: 'Representación',
    text: 'Cada estación llega en varios formatos y cualquier panel se puede escuchar en voz alta.',
  },
  {
    term: 'Acción y expresión',
    text: 'Respondes con clic, teclado o arrastrando, siempre con alternativa, y hay un mapa 2D equivalente al 3D.',
  },
  {
    term: 'Implicación',
    text: 'Eliges tu ruta, ves tus metas y recibes recompensas que reconocen cómo aprendes.',
  },
];

/** Diseñado para todos: los tres principios del DUA y controles que cambian esta misma página. */
export function DuaSection() {
  const { textStep, contrast, motion, setTextStep, setContrast, setMotion } = usePreferences();
  const sizeLegend = useId();

  return (
    <section
      id="para-todos"
      aria-labelledby="para-todos-titulo"
      className="relative z-[1] bg-plate px-4 py-24 sm:px-8 sm:py-32"
    >
      <h2
        id="para-todos-titulo"
        data-escala
        className="max-w-[14ch] display text-[clamp(2.25rem,1.4rem+2.8vw,4rem)]"
      >
        Diseñado para todos
      </h2>
      <p className="mt-6 max-w-[56ch] text-lg text-ink-soft">
        El archipiélago sigue el Diseño Universal para el Aprendizaje (DUA) y las pautas WCAG 2.2
        AA.
      </p>

      <div className="mt-14 grid gap-12 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-16">
        <dl className="border-t-[1.5px] border-ink">
          {PRINCIPLES.map((p) => (
            <div
              key={p.term}
              className="grid gap-2 border-b-[1.5px] border-ink py-6 sm:grid-cols-[14rem_1fr] sm:gap-8"
            >
              <dt className="font-display text-2xl font-extrabold [font-stretch:87.5%]">
                {p.term}
              </dt>
              <dd className="max-w-[48ch]">{p.text}</dd>
            </div>
          ))}
        </dl>

        <form
          className="self-start bg-plate-sunk p-6 plate-rule"
          aria-labelledby="pruebalo-titulo"
          onSubmit={(event) => {
            event.preventDefault();
          }}
        >
          <h3 id="pruebalo-titulo" className="font-display text-xl font-extrabold">
            Pruébalo en esta página
          </h3>

          <fieldset className="mt-5">
            <legend id={sizeLegend} className="text-sm font-semibold">
              Tamaño del texto
            </legend>
            <div className="mt-2 grid grid-cols-4 border-[1.5px] border-ink">
              {TEXT_SCALES.map((scale, step) => (
                <label
                  key={scale}
                  className={cx(
                    'relative flex min-h-12 cursor-pointer items-center justify-center font-display font-bold not-last:border-r-[1.5px] not-last:border-ink',
                    'has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-[-6px] has-[:focus-visible]:outline-(--focus)',
                    textStep === step ? 'bg-ink text-land-sun' : 'hover:bg-plate',
                  )}
                >
                  <input
                    type="radio"
                    name="tamano-texto"
                    className="sr-only"
                    checked={textStep === step}
                    onChange={() => {
                      setTextStep(step as TextStep);
                    }}
                  />
                  <span aria-hidden="true" style={{ fontSize: `${String(0.85 + step * 0.22)}rem` }}>
                    A
                  </span>
                  <span className="sr-only">{`${String(Math.round(scale * 100))} %`}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-5 space-y-3">
            <Switch
              label="Alto contraste"
              checked={contrast === 'alto'}
              onChange={(on) => {
                setContrast(on ? 'alto' : 'normal');
              }}
            />
            <Switch
              label="Reducir movimiento"
              checked={motion === 'reducido'}
              onChange={(on) => {
                setMotion(on ? 'reducido' : 'sistema');
              }}
            />
          </div>
          <p className="mt-5 text-sm text-ink-soft">
            Tus preferencias se guardan en este equipo y se aplican en todo el archipiélago.
          </p>
        </form>
      </div>
    </section>
  );
}

function Switch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => {
        onChange(!checked);
      }}
      className="flex min-h-11 w-full items-center justify-between gap-4 text-left font-semibold"
    >
      {label}
      <span
        aria-hidden="true"
        className={cx(
          'relative h-7 w-12 shrink-0 border-[1.5px] border-ink transition-colors duration-(--dur-fast)',
          checked ? 'bg-ink' : 'bg-plate',
        )}
      >
        <span
          className={cx(
            'absolute top-1/2 size-4 -translate-y-1/2 transition-[left,background-color] duration-(--dur-fast) ease-out',
            checked ? 'left-[calc(100%-1.25rem)] bg-land-sun' : 'left-1 bg-ink',
          )}
        />
      </span>
    </button>
  );
}
