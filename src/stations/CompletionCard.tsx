import { useEffect, useRef } from 'react';
import { world } from '@/data';
import type { ProgressEvent } from '@/progress/types';
import type { Island, Station } from '@/types/domain';
import { ButtonLink } from '@/ui/ButtonLink';

/** Cierre de una estación: lo que se ganó y hacia dónde seguir el sendero. */
export function CompletionCard({
  island,
  station,
  score,
  events,
  next,
  epilogue,
}: {
  island: Island;
  station: Station;
  score: number;
  events: ProgressEvent[];
  next: Station | undefined;
  /** Última frase de la escena (p. ej. la Bruma al disiparse). */
  epilogue?: string;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);

  const xp = events.reduce((sum, e) => (e.type === 'xp' ? sum + e.amount : sum), 0);
  const fragment = events.some((e) => e.type === 'fragment');
  const badges = events.flatMap((e) =>
    e.type === 'badge' ? (world.badges.find((b) => b.id === e.badgeId) ?? []) : [],
  );
  const back = `/mundo/${island.id}?estacion=${station.id}`;

  return (
    <section aria-labelledby="cierre-titulo">
      <p className="toponym text-xs text-ink-soft">
        {fragment ? 'La Bruma se disipa' : 'Estación completada'}
      </p>
      <h2
        id="cierre-titulo"
        ref={heading}
        tabIndex={-1}
        className="mt-2 display text-[clamp(2rem,1.4rem+2vw,3rem)] outline-none"
      >
        {fragment ? `Recuperaste el ${island.fragmentName}` : station.title}
      </h2>
      {epilogue && (
        <blockquote className="mt-4 max-w-[60ch] border-l-[3px] border-sea-700 pl-4 text-lg text-ink-soft italic">
          {epilogue}
        </blockquote>
      )}

      <dl className="mt-6 grid max-w-xl grid-cols-2 gap-4 border-y-[1.5px] border-ink py-4 sm:grid-cols-3">
        <div>
          <dt className="text-sm text-ink-soft">Resultado</dt>
          <dd className="font-display text-3xl font-extrabold tabular-nums">
            {Math.round(score * 100)} %
          </dd>
        </div>
        <div>
          <dt className="text-sm text-ink-soft">Experiencia</dt>
          <dd className="font-display text-3xl font-extrabold tabular-nums">
            {xp > 0 ? `+${String(xp)}` : '—'} <span className="text-base">XP</span>
          </dd>
        </div>
        {fragment && (
          <div className="col-span-2 sm:col-span-1">
            <dt className="text-sm text-ink-soft">Faro Minuto</dt>
            <dd className="font-semibold">Gana un fragmento de luz</dd>
          </div>
        )}
      </dl>
      {xp === 0 && (
        <p className="mt-3 text-sm text-ink-soft">
          Ya habías completado esta estación: el repaso afina tu dominio, pero no suma XP de nuevo.
        </p>
      )}

      {badges.length > 0 && (
        <div className="mt-5">
          <h3 className="font-display text-lg font-bold">Sellos nuevos en tu pasaporte</h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {badges.map((b) => (
              <li
                key={b.id}
                className="border-[1.5px] border-ink bg-land-sun px-3 py-1 text-sm font-semibold text-sea-950"
              >
                {b.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        {next && next.id !== station.id ? (
          <>
            <ButtonLink to={`/mundo/${island.id}/${next.id}`} size="lg">
              Siguiente: {next.title}
            </ButtonLink>
            <ButtonLink to={back} size="lg" variant="secondary">
              Volver al sendero
            </ButtonLink>
          </>
        ) : (
          <>
            <ButtonLink to={back} size="lg">
              Volver al sendero
            </ButtonLink>
            <ButtonLink to="/mundo" size="lg" variant="secondary">
              Ir a la carta del archipiélago
            </ButtonLink>
          </>
        )}
      </div>
    </section>
  );
}
