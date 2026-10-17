import { world } from '@/data';
import { CountUp } from './CountUp';

const STEPS = [
  {
    title: 'Explora',
    text: 'Elige cómo aprender cada tema: texto, audio, video, infografía o interactivo.',
  },
  {
    title: 'Practica',
    text: 'Retos breves con retroalimentación inmediata y una simulación jugable por isla.',
  },
  {
    title: 'Brújula te orienta',
    text: 'Ajusta la dificultad, te da pistas cuando las necesitas y sugiere la siguiente estación.',
  },
  {
    title: 'Enciende el faro',
    text: 'Cada desafío superado devuelve un fragmento de luz y sella tu pasaporte.',
  },
];

const FACTS = [
  { value: world.islands.length, label: 'islas' },
  { value: world.stations.length, label: 'estaciones en los senderos' },
  { value: world.badges.length, label: 'insignias por ganar' },
  { value: world.islands.length, label: 'fragmentos de luz' },
];

/** Cómo se recorre: cuatro escalas sobre una ruta, y los datos de la plancha. */
export function ComoFunciona({ reduced }: { reduced: boolean }) {
  return (
    <section
      id="como-funciona"
      aria-labelledby="como-funciona-titulo"
      className="relative z-[1] bg-plate px-4 py-24 sm:px-8 sm:py-32"
    >
      <h2
        id="como-funciona-titulo"
        data-escala
        className="max-w-[16ch] display text-[clamp(2.25rem,1.4rem+2.8vw,4rem)]"
      >
        Cómo se recorre el archipiélago
      </h2>

      <ol className="relative mt-14 grid gap-10 md:grid-cols-4 md:gap-6">
        <span
          aria-hidden="true"
          className="absolute top-[1.375rem] right-[12%] left-[1.375rem] hidden border-t-2 border-dashed border-ink/40 md:block"
        />
        {STEPS.map((step, i) => (
          <li key={step.title} className="relative grid grid-cols-[auto_1fr] gap-x-5 md:block">
            <span
              aria-hidden="true"
              className="relative z-[1] flex size-11 items-center justify-center rounded-full border-2 border-ink bg-plate font-display text-lg font-extrabold tabular-nums"
            >
              {i + 1}
            </span>
            <div className="md:mt-6 md:pr-4">
              <h3 className="font-display text-2xl font-extrabold [font-stretch:87.5%]">
                {step.title}
              </h3>
              <p className="mt-2 max-w-[32ch] text-ink-soft">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-20 border-t-[1.5px] border-ink pt-6">
        <dl className="grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4">
          {FACTS.map((fact) => (
            <div key={fact.label} className="flex flex-col-reverse">
              <dt className="text-sm text-ink-soft">{fact.label}</dt>
              <dd className="font-display text-5xl font-extrabold [font-stretch:87.5%]">
                <CountUp value={fact.value} reduced={reduced} />
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
