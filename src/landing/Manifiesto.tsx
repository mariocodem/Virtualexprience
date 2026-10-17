import { useGSAP } from '@gsap/react';
import { useRef } from 'react';
import { gsap } from './motion';

const LINES = [
  'En el archipiélago, cada línea de VirtuXperience es una isla,',
  'cada estación es una escala',
  'y lo que aprendes devuelve algo que todos pueden ver:',
];

/** De la página al mundo: el texto se revela línea a línea con el scroll. */
export function Manifiesto({ reduced }: { reduced: boolean }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (reduced) return;
      for (const line of gsap.utils.toArray<HTMLElement>('[data-line]')) {
        gsap.fromTo(
          line,
          { '--reveal': 0 },
          {
            '--reveal': 1,
            ease: 'none',
            scrollTrigger: { trigger: line, start: 'top 88%', end: 'top 58%', scrub: true },
          },
        );
      }
    },
    { scope: root, dependencies: [reduced] },
  );

  return (
    <section
      ref={root}
      id="manifiesto"
      aria-labelledby="manifiesto-titulo"
      className="relative z-[1] bg-plate px-4 py-28 sm:px-8 sm:py-40"
    >
      <div className="max-w-[60rem] font-display text-[clamp(2rem,1.1rem+3.3vw,4.25rem)] leading-[1.02] font-extrabold tracking-[-0.02em] [font-stretch:87.5%]">
        <h2 id="manifiesto-titulo" data-escala className="text-[length:inherit] leading-[inherit]">
          <span data-line className="block">
            Una página se lee de arriba abajo.
          </span>
          <span data-line className="block">
            Un mundo se recorre.
          </span>
        </h2>
        <p className="mt-[0.6em]">
          {LINES.map((line) => (
            <span key={line} data-line className="block [--line-to:var(--ink-soft)]">
              {line}
            </span>
          ))}
          <span data-line className="block [--line-to:var(--sea-700)]">
            la luz del Faro Minuto.
          </span>
        </p>
      </div>
    </section>
  );
}
