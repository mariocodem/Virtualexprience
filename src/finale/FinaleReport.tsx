import { useEffect, useRef } from 'react';
import {
  finaleAccuracy,
  finaleDensity,
  itemsOf,
  lightByCompetency,
  type FinaleState,
} from '@/boss/finale';
import { getIsland, world } from '@/data';
import type { FinaleContent } from '@/data/contentSchemas';
import type { ProgressEvent } from '@/progress/types';
import { Button } from '@/ui/Button';
import { ButtonLink } from '@/ui/ButtonLink';
import { ISLE } from '@/world/palette';

/**
 * Cierre del Gran Reto. Al vencer: el faro encendido, lo ganado y la luz que
 * aportó cada competencia. Al retirarse: lo que hizo fuerte a la Gran Bruma,
 * para volver preparado.
 */
export function FinaleReport({
  content,
  ending,
  state,
  events,
  onRetry,
}: {
  content: FinaleContent;
  ending: 'victoria' | 'retirada';
  state: FinaleState;
  events: ProgressEvent[];
  onRetry: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);

  const light = lightByCompetency(state);
  const xp = events.reduce((sum, e) => (e.type === 'xp' ? sum + e.amount : sum), 0);
  const badges = events.flatMap((e) =>
    e.type === 'badge' ? (world.badges.find((b) => b.id === e.badgeId) ?? []) : [],
  );

  if (ending === 'retirada') {
    // Si la Bruma repitió un embate, se repasa una sola vez.
    const missed = [
      ...new Map(
        state.answers
          .filter((a) => !a.correct)
          .flatMap((a) => {
            const item = itemsOf(content, a.form).find((i) => i.id === a.itemId);
            return item ? [[item.id, { item, form: a.form }] as const] : [];
          }),
      ).values(),
    ];
    return (
      <div>
        <h2
          ref={heading}
          tabIndex={-1}
          className="font-display text-2xl font-extrabold outline-none"
        >
          La Gran Bruma te obligó a retirarte
        </h2>
        <p className="mt-2 max-w-[60ch] text-ink-soft">
          Disipaste {Math.round((1 - finaleDensity(state)) * 100)} % de la Gran Bruma y{' '}
          {state.cleared.length} de sus {state.order.length} formas. Brújula anotó lo que la hizo
          más fuerte:
        </p>
        <ul className="mt-4 grid gap-3">
          {missed.map(({ item, form }) => (
            <li
              key={item.id}
              className="border-l-[3px] bg-plate-sunk px-4 py-3"
              style={{ borderColor: form === 'corazon' ? 'var(--route)' : ISLE[form] }}
            >
              <p className="text-xs font-semibold text-ink-soft">
                {form === 'corazon' ? 'Las seis competencias' : getIsland(form).name}
              </p>
              <p className="font-semibold">{item.prompt}</p>
              <p className="mt-1 text-sm">{item.explanation}</p>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button size="lg" onClick={onRetry}>
            Volver a enfrentarla
          </Button>
          <ButtonLink to="/mundo" size="lg" variant="secondary">
            Repasar en las islas
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <section aria-labelledby="faro-encendido">
      <p className="toponym text-xs text-ink-soft">La Gran Bruma se disipa</p>
      <h2
        id="faro-encendido"
        ref={heading}
        tabIndex={-1}
        className="mt-2 display text-[clamp(2rem,1.4rem+2vw,3rem)] outline-none"
      >
        El Faro Minuto vuelve a brillar
      </h2>
      <blockquote className="mt-4 max-w-[60ch] border-l-[3px] border-sea-700 pl-4 text-lg text-ink-soft italic">
        {content.epilogue}
      </blockquote>

      <dl className="mt-6 grid max-w-xl grid-cols-2 gap-4 border-y-[1.5px] border-ink py-4 sm:grid-cols-3">
        <div>
          <dt className="text-sm text-ink-soft">Resultado</dt>
          <dd className="font-display text-3xl font-extrabold tabular-nums">
            {Math.round(finaleAccuracy(state) * 100)} %
          </dd>
        </div>
        <div>
          <dt className="text-sm text-ink-soft">Experiencia</dt>
          <dd className="font-display text-3xl font-extrabold tabular-nums">
            {xp > 0 ? `+${String(xp)}` : '—'} <span className="text-base">XP</span>
          </dd>
        </div>
        <div>
          <dt className="text-sm text-ink-soft">Fragmentos encendidos</dt>
          <dd className="font-display text-3xl font-extrabold tabular-nums">
            {state.lights} <span className="text-base">de {state.plan.lights}</span>
          </dd>
        </div>
      </dl>
      {xp === 0 && (
        <p className="mt-3 text-sm text-ink-soft">
          Ya habías disipado a la Gran Bruma: volver a enfrentarla afina tu dominio, pero no suma XP
          de nuevo.
        </p>
      )}

      <h3 className="mt-8 font-display text-lg font-bold">Tu luz por competencia</h3>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {state.order.map((form) => {
          const { correct, total } = light[form];
          const name = form === 'corazon' ? content.heart.name : getIsland(form).name;
          const competency = form === 'corazon' ? 'Las seis a la vez' : getIsland(form).competency;
          return (
            <li
              key={form}
              className="border-l-[3px] bg-plate-sunk px-4 py-2"
              style={{ borderColor: form === 'corazon' ? 'var(--land-sun)' : ISLE[form] }}
            >
              <span className="font-semibold">{name}</span>
              <span className="block text-sm text-ink-soft">{competency}</span>
              <span className="block text-sm tabular-nums">
                {correct} de {total} {total === 1 ? 'embate acertado' : 'embates acertados'}
              </span>
            </li>
          );
        })}
      </ul>

      {badges.length > 0 && (
        <>
          <h3 className="mt-8 font-display text-lg font-bold">Insignias</h3>
          <ul className="mt-2 space-y-1">
            {badges.map((b) => (
              <li key={b.id}>
                <span className="font-semibold">{b.name}.</span> {b.description}
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink to="/mundo?faro=1" size="lg">
          Ver el faro encendido
        </ButtonLink>
        <Button size="lg" variant="secondary" onClick={onRetry}>
          Volver a enfrentarla
        </Button>
      </div>
    </section>
  );
}
