import { useEffect, useId, useRef, useState } from 'react';
import { minigameLevel } from '@/ai/adaptiveEngine';
import type { NewsItem, SalaContent, Signal } from '@/data/contentSchemas';
import { useProgress } from '@/progress/store';
import { useMastery } from '@/stations/useMastery';
import { Button } from '@/ui/Button';
import { cx } from '@/ui/cx';
import { GameBriefing } from '../shared/GameBriefing';
import { GameReport } from '../shared/GameReport';
import type { MinigameProps } from '../shared/types';
import {
  currentNewsId,
  decide,
  DECIDE_COST,
  investigate,
  INVESTIGATE_COST,
  newsroomPlan,
  report,
  selectNews,
  startNewsroom,
  type NewsroomReport,
  type NewsroomState,
  type Verdict,
} from './engine';
import { SIGNAL_LABEL, TOOL_LABEL, VERDICT_LABEL } from './labels';
import { NewsroomStrip } from './NewsroomStrip';

const SIGNALS: Signal[] = ['fuente', 'fecha', 'cita', 'imagen'];
const VERDICTS: Verdict[] = ['publicar', 'descartar', 'corregir'];

type Stage =
  | { kind: 'briefing' }
  | { kind: 'edicion'; queue: NewsItem[]; state: NewsroomState }
  | { kind: 'informe'; queue: NewsItem[]; state: NewsroomState; result: NewsroomReport };

/**
 * Sala de Redacción (CLAUDE.md §7). El estudiante edita la radio de
 * ComunicArte: investiga señales con el reloj de cierre en contra, decide qué
 * sale al aire y justifica con el criterio. Las consecuencias se ven al cerrar
 * la edición; durante la partida Brújula comenta el proceso, no el acierto.
 */
export function SalaDeRedaccion({
  content,
  island,
  onBrujula,
  onEvents,
  onComplete,
  onFail,
}: MinigameProps<SalaContent>) {
  const { mastery, record } = useMastery(island.id);
  const recordMinigame = useProgress((s) => s.recordMinigame);
  const [level] = useState(() => minigameLevel(mastery));
  const plan = newsroomPlan(level);
  const [stage, setStage] = useState<Stage>({ kind: 'briefing' });
  const blind = useRef(0);

  const begin = () => {
    const queue = selectNews(content.news, plan, Math.random);
    blind.current = 0;
    onBrujula(null);
    setStage({ kind: 'edicion', queue, state: startNewsroom(queue, plan) });
    window.scrollTo({ top: 0 });
  };

  const finish = (queue: NewsItem[], state: NewsroomState) => {
    const result = report(state, content.news);
    for (const r of result.results) {
      record(r.news.tier, (r.verdictOk ? 0.6 : 0) + (r.criterionOk ? 0.4 : 0));
    }
    onEvents(
      recordMinigame('sala-de-redaccion', {
        accuracy: result.accuracy,
        criteria: result.criteria,
        toolsUsed: result.toolsUsed,
      }),
    );
    if (result.score < 0.6) onFail(result.score);
    onBrujula(null);
    setStage({ kind: 'informe', queue, state, result });
  };

  if (stage.kind === 'briefing') {
    return (
      <GameBriefing
        intro={content.intro}
        level={level}
        figures={[
          { label: 'Noticias', value: String(plan.count) },
          { label: 'Hasta el cierre', value: `${String(plan.budget)} min` },
          { label: 'Investigar', value: `${String(INVESTIGATE_COST)} min` },
          { label: 'Decidir', value: `${String(DECIDE_COST)} min` },
        ]}
        rules={[
          'Cada nota trae titular, fuente, fecha, cita e imagen. Investiga las señales que te parezcan dudosas: cada pista consume minutos del cierre.',
          'Decide si la nota sale al aire, se descarta o vuelve a corrección, y justifica con la señal que decide el caso.',
          'Lo que no alcances a revisar antes de las 6:00 p. m. no sale al aire. Se evalúan tus decisiones y los criterios que aplicaste.',
        ]}
        beginLabel="Abrir la edición"
        onBegin={begin}
      />
    );
  }

  if (stage.kind === 'informe') {
    return (
      <NewsroomReportView
        result={stage.result}
        island={island}
        onComplete={() => {
          onComplete(stage.result.score);
        }}
        onRetry={begin}
      />
    );
  }

  const { queue, state } = stage;
  const id = currentNewsId(state);
  const news = queue.find((n) => n.id === id);

  return (
    <div className="grid gap-6">
      <NewsroomStrip
        budget={plan.budget}
        clock={state.clock}
        queue={queue}
        index={state.index}
        decisions={state.decisions}
      />
      {news ? (
        <NewsDesk
          key={news.id}
          news={news}
          number={state.index + 1}
          total={queue.length}
          clock={state.clock}
          revealed={state.revealed[news.id] ?? []}
          onInvestigate={(signal) => {
            const next = investigate(state, signal);
            setStage({ kind: 'edicion', queue, state: next });
            if (next.clock <= 30 && state.clock > 30) {
              onBrujula({
                text: 'Queda media hora para el cierre. Decide con lo que ya sabes las notas que faltan.',
                source: 'local',
              });
            }
            if (next.clock <= 0) finish(queue, next);
          }}
          onDecide={(verdict, criterion) => {
            const seen = state.revealed[news.id] ?? [];
            const next = decide(state, verdict, criterion);
            blind.current = seen.length === 0 ? blind.current + 1 : 0;
            if (verdict === 'publicar' && seen.length === 0) {
              onBrujula({
                text: 'Pusiste al aire una nota sin revisar ninguna señal. Una radio confiable verifica antes de difundir.',
                source: 'local',
              });
            } else if (blind.current >= 2) {
              onBrujula({
                text: 'Llevas dos notas sin investigar. Revisar al menos la señal más dudosa vale los 15 minutos.',
                source: 'local',
              });
            } else if (!seen.includes(criterion) && seen.length > 0) {
              onBrujula({
                text: `Justificaste con ${SIGNAL_LABEL[criterion].toLowerCase()}, pero no la revisaste. Un criterio pesa más cuando lo comprobaste.`,
                source: 'local',
              });
            } else {
              onBrujula(null);
            }
            if (currentNewsId(next) === null) finish(queue, next);
            else setStage({ kind: 'edicion', queue, state: next });
          }}
        />
      ) : null}
    </div>
  );
}

function NewsDesk({
  news,
  number,
  total,
  clock,
  revealed,
  onInvestigate,
  onDecide,
}: {
  news: NewsItem;
  number: number;
  total: number;
  clock: number;
  revealed: Signal[];
  onInvestigate: (signal: Signal) => void;
  onDecide: (verdict: Verdict, criterion: Signal) => void;
}) {
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [criterion, setCriterion] = useState<Signal | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const verdictName = useId();
  const criterionName = useId();

  useEffect(() => {
    heading.current?.focus();
  }, []);

  const fields: { signal: Signal; label: string; value: string }[] = [
    { signal: 'fuente', label: 'Fuente', value: news.source },
    { signal: 'fecha', label: 'Fecha', value: news.date },
    { signal: 'cita', label: 'Cita', value: news.quote },
    { signal: 'imagen', label: 'Imagen', value: news.image },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
      <article aria-labelledby="nota-titular" className="bg-plate-sunk p-5 plate-rule lg:p-6">
        <p className="toponym text-[0.625rem] text-ink-soft">
          Mesa de edición · Nota {number} de {total}
        </p>
        <h2
          id="nota-titular"
          ref={heading}
          tabIndex={-1}
          className="mt-2 font-display text-[clamp(1.4rem,1.1rem+1vw,1.9rem)] leading-tight font-extrabold outline-none"
        >
          {news.headline}
        </h2>
        <dl className="mt-4 grid gap-3">
          {fields.map((field) => {
            const seen = revealed.includes(field.signal);
            return (
              <div key={field.signal} className="border-t-[1px] border-plate-edge pt-3">
                <dt className="text-sm font-semibold text-ink-soft">{field.label}</dt>
                <dd
                  className={cx(
                    field.signal === 'imagen' && 'italic',
                    field.signal === 'cita' && 'font-display text-lg',
                  )}
                >
                  {field.value}
                </dd>
                {seen && (
                  <dd className="mt-2 border-l-[3px] border-sea-700 bg-plate px-3 py-2 text-sm">
                    <span className="font-semibold">Verificación: </span>
                    {news.clues[field.signal]}
                  </dd>
                )}
              </div>
            );
          })}
        </dl>
      </article>

      <div className="grid content-start gap-6">
        <section aria-labelledby="investigar-titulo">
          <h3 id="investigar-titulo" className="font-display text-lg font-extrabold">
            Investigar
          </h3>
          <p className="mt-1 text-sm text-ink-soft">
            Cada pista consume {INVESTIGATE_COST} minutos del cierre.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {SIGNALS.map((signal) => {
              const seen = revealed.includes(signal);
              return (
                <button
                  key={signal}
                  type="button"
                  disabled={seen || clock <= 0}
                  onClick={() => {
                    onInvestigate(signal);
                  }}
                  className={cx(
                    'flex min-h-14 flex-col items-start justify-center border-[1.5px] px-4 py-2 text-left',
                    'transition-colors duration-(--dur-fast) ease-out',
                    seen
                      ? 'cursor-default border-sea-700 bg-plate-sunk'
                      : 'border-ink hover:bg-plate-sunk active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45',
                  )}
                >
                  <span className="font-display font-bold">{TOOL_LABEL[signal]}</span>
                  <span className="text-sm text-ink-soft tabular-nums">
                    {seen ? 'Revisada: mira la nota' : `${String(INVESTIGATE_COST)} min del cierre`}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <form
          aria-labelledby="decidir-titulo"
          onSubmit={(event) => {
            event.preventDefault();
            if (verdict && criterion) onDecide(verdict, criterion);
          }}
          className="border-t-[1.5px] border-ink pt-5"
        >
          <h3 id="decidir-titulo" className="font-display text-lg font-extrabold">
            Decidir
          </h3>
          <fieldset className="mt-3">
            <legend className="text-sm font-semibold">¿Qué hace la radio con esta nota?</legend>
            <div className="mt-2 flex flex-wrap border-[1.5px] border-ink">
              {VERDICTS.map((v) => (
                <label
                  key={v}
                  className={cx(
                    'flex min-h-11 flex-1 cursor-pointer items-center justify-center px-3 text-center font-display text-sm font-bold not-last:border-r-[1.5px] not-last:border-ink',
                    'has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-[-6px] has-[:focus-visible]:outline-(--focus)',
                    verdict === v ? 'bg-ink text-land-sun' : 'hover:bg-plate-sunk',
                  )}
                >
                  <input
                    type="radio"
                    name={verdictName}
                    className="sr-only"
                    checked={verdict === v}
                    onChange={() => {
                      setVerdict(v);
                    }}
                  />
                  {VERDICT_LABEL[v]}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="mt-4">
            <legend className="text-sm font-semibold">¿Qué señal decide tu decisión?</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {SIGNALS.map((signal) => (
                <label
                  key={signal}
                  className={cx(
                    'flex min-h-11 cursor-pointer items-center gap-2 border-[1.5px] px-3 text-sm',
                    'has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-(--focus)',
                    criterion === signal
                      ? 'border-ink bg-plate-sunk font-semibold'
                      : 'border-plate-edge hover:border-ink',
                  )}
                >
                  <input
                    type="radio"
                    name={criterionName}
                    checked={criterion === signal}
                    onChange={() => {
                      setCriterion(signal);
                    }}
                    className="size-4 accent-ink"
                  />
                  <span>
                    {SIGNAL_LABEL[signal]}
                    {revealed.includes(signal) && (
                      <span className="block text-xs text-ink-soft">revisada</span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <Button
            type="submit"
            size="lg"
            className="mt-5 w-full sm:w-auto"
            disabled={!verdict || !criterion}
          >
            Enviar a la mesa · {DECIDE_COST} min
          </Button>
        </form>
      </div>
    </div>
  );
}

function NewsroomReportView({
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

function newsroomReading(result: NewsroomReport, falseAired: number) {
  const highlights = [
    `Decisiones correctas: ${String(Math.round(result.accuracy * 100))} %.`,
    `Justificaciones con la señal decisiva: ${String(Math.round(result.criteria * 100))} %.`,
    `Señales distintas investigadas: ${String(result.toolsUsed)} de 4.`,
    `Notas sin revisar al cierre: ${String(result.unreviewed)}.`,
    `Notas falsas o imprecisas que salieron al aire: ${String(falseAired)}.`,
  ];
  const parts: string[] = [];
  if (falseAired > 0)
    parts.push(
      'Algunas notas salieron al aire sin sostenerse: en una radio, un error difundido llega lejos.',
    );
  else if (result.accuracy >= 0.75)
    parts.push('Tu edición protegió a la audiencia: lo que salió al aire se sostiene.');
  if (result.criteria < result.accuracy)
    parts.push('A veces acertaste por intuición: nombra la señal que de verdad decide el caso.');
  else if (result.criteria >= 0.75)
    parts.push(
      'Justificaste con criterio, que es lo que hace confiable a una editora o un editor.',
    );
  if (result.toolsUsed < 3)
    parts.push(
      'Prueba las herramientas que no usaste: cada una detecta un tipo distinto de engaño.',
    );
  if (result.unreviewed > 0)
    parts.push('Administra el reloj: investiga primero la señal más dudosa de cada nota.');
  return {
    text: parts.join(' ') || 'Edición cerrada. Revisa nota por nota qué señal decidía cada caso.',
    highlights,
  };
}
