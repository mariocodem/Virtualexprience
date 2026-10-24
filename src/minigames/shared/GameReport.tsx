import { useEffect, useRef, useState, type ReactNode } from 'react';
import { aiReport } from '@/ai/brujula';
import { Button } from '@/ui/Button';
import { ButtonLink } from '@/ui/ButtonLink';
import { CompassRose } from '@/ui/CompassRose';
import { StationSymbol } from '@/ui/StationSymbol';
import { PASSING_SCORE, type ReportCriterion, type ReportFigure } from './types';

/**
 * Informe al cierre de una partida: resultado, cifras, criterios aplicados y la
 * lectura de Brújula (local al instante; con IA si hay conexión). Se supera con
 * {@link PASSING_SCORE}; si no, se ofrece otra partida.
 */
export function GameReport({
  title,
  score,
  figures,
  criteria,
  brujula,
  game,
  competency,
  back,
  onComplete,
  onRetry,
  children,
}: {
  title: string;
  score: number;
  figures: ReportFigure[];
  criteria: ReportCriterion[];
  /** Lectura local de Brújula y los hechos que se le pasan a la IA. */
  brujula: { text: string; highlights: string[] };
  game: string;
  competency: string;
  back: string;
  onComplete: () => void;
  onRetry: () => void;
  children?: ReactNode;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [reading, setReading] = useState<{ text: string; source: 'ia' | 'local' }>({
    text: brujula.text,
    source: 'local',
  });
  const passed = score >= PASSING_SCORE;
  const { highlights } = brujula;

  useEffect(() => {
    heading.current?.focus();
  }, []);

  useEffect(() => {
    let live = true;
    void aiReport({ competency, game, score, highlights }).then((text) => {
      if (live && text) setReading({ text, source: 'ia' });
    });
    return () => {
      live = false;
    };
  }, [competency, game, score, highlights]);

  return (
    <section aria-labelledby="informe-titulo">
      <p className="toponym text-xs text-ink-soft">Informe de la partida</p>
      <h2
        id="informe-titulo"
        ref={heading}
        tabIndex={-1}
        className="mt-2 display text-[clamp(1.75rem,1.3rem+1.6vw,2.6rem)] outline-none"
      >
        {title}
      </h2>

      <dl className="mt-5 grid grid-cols-2 gap-4 border-y-[1.5px] border-ink py-4 sm:grid-cols-4">
        <div>
          <dt className="text-sm text-ink-soft">Resultado</dt>
          <dd className="font-display text-3xl font-extrabold tabular-nums">
            {Math.round(score * 100)} %
          </dd>
        </div>
        {figures.map((figure) => (
          <div key={figure.label}>
            <dt className="text-sm text-ink-soft">{figure.label}</dt>
            <dd className="font-display text-xl font-extrabold tabular-nums">{figure.value}</dd>
          </div>
        ))}
      </dl>

      <h3 className="mt-6 font-display text-lg font-bold">Lo que se evaluó</h3>
      <ul className="mt-2 grid gap-2">
        {criteria.map((criterion) => (
          <li key={criterion.label} className="flex items-start gap-3">
            <span className="mt-0.5">
              <StationSymbol status={criterion.met ? 'completada' : 'disponible'} />
            </span>
            <span>
              <span className="font-semibold">{criterion.label}</span>
              <span className="sr-only">{criterion.met ? ': aplicado' : ': por afianzar'}</span>
              {criterion.detail && (
                <span className="block text-sm text-ink-soft">{criterion.detail}</span>
              )}
            </span>
          </li>
        ))}
      </ul>

      <figure className="mt-6 flex items-start gap-3 bg-plate-sunk p-4 plate-rule">
        <CompassRose size={44} className="shrink-0 text-ink" />
        <div>
          <blockquote aria-live="polite" className="max-w-[62ch]">
            {reading.text}
          </blockquote>
          <figcaption className="mt-1 text-xs text-ink-soft">
            Brújula · {reading.source === 'ia' ? 'lectura con IA' : 'lectura sin conexión'}
          </figcaption>
        </div>
      </figure>

      {children}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        {passed ? (
          <>
            <Button size="lg" onClick={onComplete}>
              Completar estación
            </Button>
            <Button size="lg" variant="secondary" onClick={onRetry}>
              Jugar otra partida
            </Button>
          </>
        ) : (
          <>
            <Button size="lg" onClick={onRetry}>
              Volver a intentarlo
            </Button>
            <ButtonLink to={back} size="lg" variant="secondary">
              Repasar en el sendero
            </ButtonLink>
          </>
        )}
      </div>
      {!passed && (
        <p className="mt-3 max-w-[60ch] text-sm text-ink-soft">
          Para superar el reto necesitas al menos {Math.round(PASSING_SCORE * 100)} %. Cada partida
          afina tu dominio y Brújula ajusta la siguiente.
        </p>
      )}
    </section>
  );
}
