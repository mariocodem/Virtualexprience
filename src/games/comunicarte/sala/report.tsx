import { useState } from 'react';
import type { SalaContent } from '@/data/contentSchemas';
import type { NewsroomReport } from '@/minigames/sala-de-redaccion/engine';
import { SIGNAL_LABEL, VERDICT_LABEL } from '@/minigames/sala-de-redaccion/labels';
import { GameReport } from '@/minigames/shared/GameReport';
import type { MinigameProps } from '@/minigames/shared/types';
import { newsroomReading } from './reading';
import { cx } from '@/ui/cx';

/** Informe de la edición: el `GameReport` compartido más el detalle nota por nota. */
export function DeskReport({
  result,
  island,
  onComplete,
  onRetry,
}: {
  result: NewsroomReport;
  island: MinigameProps<SalaContent>['island'];
  onComplete: () => void;
  onRetry: () => void;
}) {
  const total = result.results.length;
  const right = result.results.filter((r) => r.verdictOk).length;
  const justified = result.results.filter((r) => r.criterionOk).length;
  const aired = result.results.filter((r) => r.decision?.verdict === 'publicar');
  const falseAired = aired.filter((r) => r.news.verdict !== 'publicar').length;
  const [brujula] = useState(() => newsroomReading(result, falseAired));

  return (
    <GameReport
      title={
        falseAired > 0
          ? `Salió al aire ${falseAired === 1 ? 'una nota que no debía' : `${String(falseAired)} notas que no debían`}`
          : right === total
            ? 'Una edición impecable'
            : aired.length === 0
              ? 'La edición cerró sin notas al aire'
              : 'La edición está al aire'
      }
      score={result.score}
      figures={[
        { label: 'Decisiones correctas', value: `${String(right)} de ${String(total)}` },
        { label: 'Bien justificadas', value: `${String(justified)} de ${String(total)}` },
        { label: 'Señales usadas', value: `${String(result.toolsUsed)} de 4` },
      ]}
      criteria={[
        {
          label: 'Decidiste bien qué sale al aire',
          met: result.accuracy >= 0.75,
          detail: `${String(right)} de ${String(total)} decisiones coinciden con la verificación.`,
        },
        {
          label: 'Justificaste con la señal que decide el caso',
          met: result.criteria >= 0.75,
          detail: 'La evaluación mira el criterio, no solo el acierto.',
        },
        {
          label: 'Usaste las cuatro herramientas de verificación',
          met: result.toolsUsed === 4,
        },
        {
          label: 'Cerraste la edición a tiempo',
          met: result.unreviewed === 0,
          ...(result.unreviewed > 0
            ? { detail: `${String(result.unreviewed)} sin revisar al cierre: no salieron al aire.` }
            : {}),
        },
      ]}
      brujula={brujula}
      game="Sala de Redacción"
      competency={island.competency}
      back={`/mundo/${island.id}?estacion=comunicarte-sala-redaccion`}
      onComplete={onComplete}
      onRetry={onRetry}
    >
      <h3 className="mt-8 font-display text-lg font-bold">Nota por nota</h3>
      <ol className="mt-3 grid gap-3">
        {result.results.map((r) => (
          <li
            key={r.news.id}
            className={cx(
              'border-l-[3px] bg-plate-sunk px-4 py-3',
              r.verdictOk ? 'border-isle-latidosocial' : 'border-land-high',
            )}
          >
            <p className="font-display font-bold">{r.news.headline}</p>
            <p className="mt-1 text-sm">
              <span className="font-semibold">Tu decisión: </span>
              {r.decision
                ? `${VERDICT_LABEL[r.decision.verdict]}${r.decision.criterion ? `, por ${SIGNAL_LABEL[r.decision.criterion].toLowerCase()}` : ''}`
                : 'Sin revisar al cierre'}
              {' · '}
              <span className="font-semibold">Lo indicado: </span>
              {VERDICT_LABEL[r.news.verdict]}, por{' '}
              {r.news.criteria.map((c) => SIGNAL_LABEL[c].toLowerCase()).join(' o ')}
            </p>
            <p className="mt-1 text-sm text-ink-soft">{r.news.explanation}</p>
          </li>
        ))}
      </ol>
    </GameReport>
  );
}
