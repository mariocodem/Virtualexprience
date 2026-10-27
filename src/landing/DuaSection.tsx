import { Segmented, Switch, TextSizeLabel } from '@/a11y/controls';
import { TEXT_SCALES, usePreferences, type TextStep } from '@/a11y/preferences';

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

          <Segmented
            legend="Tamaño del texto"
            name="tamano-texto"
            className="mt-5"
            value={textStep}
            options={TEXT_SCALES.map((scale, step) => ({
              value: step as TextStep,
              label: <TextSizeLabel scale={scale} step={step} />,
            }))}
            onChange={setTextStep}
          />

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
