import type { ReactNode } from 'react';
import { Button } from '@/ui/Button';
import type { ReportFigure } from './types';

/** Cartela previa a la partida: qué está en juego, cómo se juega y con qué dificultad. */
export function GameBriefing({
  intro,
  level,
  figures,
  rules,
  beginLabel,
  onBegin,
  children,
}: {
  intro: string;
  level: number;
  figures: ReportFigure[];
  rules: string[];
  beginLabel: string;
  onBegin: () => void;
  children?: ReactNode;
}) {
  return (
    <div>
      <p className="max-w-[65ch] text-lg">{intro}</p>
      <h2 className="mt-6 font-display text-2xl font-extrabold">Antes de empezar</h2>
      <p className="mt-1 max-w-[60ch] text-sm text-ink-soft">
        Brújula ajustó la partida a tu dominio de la competencia: nivel {level} de 5.
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-4 border-y-[1.5px] border-ink py-4 sm:grid-cols-4">
        {figures.map((figure) => (
          <div key={figure.label}>
            <dt className="text-sm text-ink-soft">{figure.label}</dt>
            <dd className="font-display text-xl font-extrabold tabular-nums">{figure.value}</dd>
          </div>
        ))}
      </dl>
      <ul className="mt-4 max-w-[62ch] list-disc space-y-1 pl-5">
        {rules.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>
      {children}
      <Button size="lg" className="mt-6" onClick={onBegin}>
        {beginLabel}
      </Button>
    </div>
  );
}
