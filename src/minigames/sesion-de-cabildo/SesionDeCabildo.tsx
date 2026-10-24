import { useEffect, useId, useRef, useState } from 'react';
import { useReducedMotion } from '@/a11y/useReducedMotion';
import { minigameLevel } from '@/ai/adaptiveEngine';
import type { CabildoContent, DeliberativeMove } from '@/data/contentSchemas';
import { useProgress } from '@/progress/store';
import { useMastery } from '@/stations/useMastery';
import { Button } from '@/ui/Button';
import { cx } from '@/ui/cx';
import { effectSummary, QUALITY_LABEL } from '../shared/effects';
import { GameBriefing } from '../shared/GameBriefing';
import { GameReport } from '../shared/GameReport';
import { Meter } from '../shared/Meter';
import type { MinigameProps } from '../shared/types';
import { CabildoScene } from './CabildoScene';
import {
  cabildoPlan,
  currentRoundId,
  intervene,
  isFinished,
  report,
  selectRounds,
  startCabildo,
  type CabildoReport,
  type CabildoState,
  type Intervention,
  type Round,
} from './engine';

const MOVE_LABEL: Record<DeliberativeMove, string> = {
  escuchar: 'Escucha activa',
  'pedir-evidencia': 'Pedir evidencia',
  integrar: 'Integrar posturas',
  conceder: 'Conceder',
  falacia: 'Falacia',
  imponer: 'Imposición',
};

type Stage =
  | { kind: 'briefing' }
  | { kind: 'sesion'; queue: Round[]; state: CabildoState }
  | { kind: 'informe'; state: CabildoState; result: CabildoReport };

/**
 * Sesión de cabildo (Voxcivitas). Moderar es responder a cada grupo sin
 * imponer ni caer en falacias: escuchar, pedir evidencia, integrar y
 * conceder construyen la confianza que el acuerdo final necesita.
 */
export function SesionDeCabildo({
  content,
  island,
  onBrujula,
  onEvents,
  onComplete,
  onFail,
}: MinigameProps<CabildoContent>) {
  const still = useReducedMotion();
  const { mastery, record } = useMastery(island.id);
  const recordMinigame = useProgress((s) => s.recordMinigame);
  const [level] = useState(() => minigameLevel(mastery));
  const plan = cabildoPlan(level);
  const [stage, setStage] = useState<Stage>({ kind: 'briefing' });
  const [preview, setPreview] = useState<CabildoState | null>(null);
  const names = Object.fromEntries(content.factions.map((f) => [f.id, f.name]));

  const begin = () => {
    const queue = selectRounds(content.rounds, plan, Math.random);
    setPreview(null);
    onBrujula(null);
    setStage({ kind: 'sesion', queue, state: startCabildo(content, queue) });
    window.scrollTo({ top: 0 });
  };

  if (stage.kind === 'briefing') {
    return (
      <GameBriefing
        intro={content.intro}
        level={level}
        figures={[
          { label: 'Intervenciones', value: String(plan.rounds) },
          { label: 'Grupos', value: String(content.factions.length) },
          { label: 'Confianza inicial', value: `${String(content.startTrust)} %` },
          { label: 'Para respaldar', value: `${String(content.threshold)} %` },
        ]}
        rules={[
          `El asunto: ${content.matter}`,
          'Cada grupo toma la palabra. Elige cómo respondes: tu intervención sube o baja la confianza de cada grupo.',
          'Algunas respuestas suenan bien y esconden una falacia. Lee con cuidado: se evalúa la calidad de la deliberación.',
          `Al final se vota: un grupo respalda el acuerdo si su confianza llega al ${String(content.threshold)} %.`,
        ]}
        beginLabel="Abrir la sesión"
        onBegin={begin}
      >
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {content.factions.map((f) => (
            <li key={f.id} className="border-l-[3px] border-ink bg-plate-sunk px-3 py-2 text-sm">
              <span className="font-semibold">{f.name}.</span> {f.interest}
            </li>
          ))}
        </ul>
      </GameBriefing>
    );
  }

  if (stage.kind === 'informe') {
    return (
      <CabildoReportView
        content={content}
        state={stage.state}
        result={stage.result}
        competency={island.competency}
        back={`/mundo/${island.id}?estacion=voxcivitas-cabildo`}
        onComplete={() => {
          onComplete(stage.result.score);
        }}
        onRetry={begin}
      />
    );
  }

  const { queue, state } = stage;
  const round = queue.find((r) => r.id === currentRoundId(state));
  if (!round) return null;
  // Tras intervenir, la plaza muestra ya las consecuencias; se confirman al dar la palabra.
  const shown = preview ?? state;

  return (
    <div className="grid gap-5">
      <p className="toponym text-[0.625rem] text-ink-soft">
        Plaza de Voxcivitas · Intervención {state.index + 1} de {queue.length}
      </p>
      <div className="bg-plate-sunk plate-rule">
        <CabildoScene
          factions={content.factions}
          trust={shown.trust}
          threshold={content.threshold}
          speaker={round.speaker}
          agreements={shown.acta.length}
          still={still}
        />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Floor
          key={round.id}
          round={round}
          speakerName={names[round.speaker] ?? round.speaker}
          names={names}
          last={state.index + 1 === queue.length}
          onDecide={(option) => {
            record(round.tier, option.quality);
            setPreview(intervene(state, round, option.id));
            onBrujula({
              text: `${MOVE_LABEL[option.move]}. ${content.tips[option.move]}`,
              source: 'local',
            });
          }}
          onContinue={(option) => {
            const next = intervene(state, round, option.id);
            setPreview(null);
            onBrujula(null);
            if (isFinished(next)) {
              const result = report(next, content);
              onEvents(
                recordMinigame('sesion-de-cabildo', {
                  accuracy: result.accuracy,
                  criteria: result.criteria,
                  toolsUsed: result.toolsUsed,
                }),
              );
              if (result.score < 0.6) onFail(result.score);
              setStage({ kind: 'informe', state: next, result });
            } else {
              setStage({ kind: 'sesion', queue, state: next });
            }
          }}
        />
        <aside
          aria-label="Estado del cabildo"
          className="grid content-start gap-4 border-t-[1.5px] border-ink pt-4 lg:border-t-0 lg:border-l-[1.5px] lg:pt-0 lg:pl-6"
        >
          <h3 className="font-display text-lg font-extrabold">Confianza de los grupos</h3>
          {content.factions.map((f) => (
            <Meter
              key={f.id}
              label={f.name}
              value={shown.trust[f.id] ?? 0}
              mark={content.threshold}
              valueText={`${String(Math.round(shown.trust[f.id] ?? 0))} %`}
              tone={(shown.trust[f.id] ?? 0) >= content.threshold ? 'low' : 'ink'}
            />
          ))}
          <p className="text-xs text-ink-soft">
            La marca indica el {content.threshold} % necesario para respaldar el acuerdo.
          </p>
          <h3 className="mt-2 font-display text-lg font-extrabold">Acta</h3>
          {shown.acta.length === 0 ? (
            <p className="text-sm text-ink-soft">Aún no hay acuerdos registrados.</p>
          ) : (
            <ol className="list-decimal space-y-1 pl-5 text-sm">
              {shown.acta.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ol>
          )}
        </aside>
      </div>
    </div>
  );
}

function Floor({
  round,
  speakerName,
  names,
  last,
  onDecide,
  onContinue,
}: {
  round: Round;
  speakerName: string;
  names: Record<string, string>;
  last: boolean;
  onDecide: (option: Intervention) => void;
  onContinue: (option: Intervention) => void;
}) {
  const [choice, setChoice] = useState<string | null>(null);
  const [decided, setDecided] = useState<Intervention | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const proceed = useRef<HTMLButtonElement>(null);
  const name = useId();

  useEffect(() => {
    if (decided) proceed.current?.focus();
    else heading.current?.focus();
  }, [decided]);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (decided) {
          onContinue(decided);
          return;
        }
        const option = round.options.find((o) => o.id === choice);
        if (!option) return;
        setDecided(option);
        onDecide(option);
      }}
    >
      <h2 ref={heading} tabIndex={-1} className="font-display text-xl font-extrabold outline-none">
        Toma la palabra: {speakerName}
      </h2>
      <blockquote className="mt-3 border-l-[3px] border-route bg-plate-sunk px-4 py-3 font-display text-lg">
        «{round.statement}»
      </blockquote>
      <fieldset className="mt-5">
        <legend className="font-semibold">¿Cómo respondes desde la moderación?</legend>
        <div className="mt-2 grid gap-2">
          {round.options.map((option) => {
            const chosen = choice === option.id;
            const shown = decided !== null;
            return (
              <label
                key={option.id}
                className={cx(
                  'flex min-h-12 cursor-pointer items-start gap-3 border-[1.5px] px-4 py-3',
                  'has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-(--focus)',
                  shown && option.quality === 1 && 'border-isle-latidosocial bg-land-low/15',
                  shown && chosen && option.quality < 1 && 'border-land-high bg-land-high/10',
                  !shown && chosen && 'border-ink bg-plate-sunk',
                  !shown && !chosen && 'border-plate-edge hover:border-ink',
                  shown && !chosen && option.quality < 1 && 'border-plate-edge opacity-70',
                  shown && 'cursor-default',
                )}
              >
                <input
                  type="radio"
                  name={name}
                  checked={chosen}
                  disabled={shown}
                  onChange={() => {
                    setChoice(option.id);
                  }}
                  className="mt-1 size-4 shrink-0 accent-ink"
                />
                <span className="flex-1">
                  «{option.text}»
                  {shown && (chosen || option.quality === 1) && (
                    <span className="mt-1 block text-sm font-semibold">
                      {MOVE_LABEL[option.move]} · {QUALITY_LABEL[option.quality]}
                    </span>
                  )}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <div role="status" aria-live="polite" className="mt-4 min-h-6">
        {decided && (
          <p>
            <span className="font-semibold">{QUALITY_LABEL[decided.quality]}.</span>{' '}
            {decided.feedback}
            {effectSummary(decided.effects, names) && (
              <span className="mt-1 block text-sm text-ink-soft">
                Confianza: {effectSummary(decided.effects, names)}
              </span>
            )}
            {decided.agreement && (
              <span className="mt-1 block text-sm font-semibold">
                Queda en el acta: {decided.agreement}
              </span>
            )}
          </p>
        )}
      </div>
      <div className="mt-4">
        {decided ? (
          <Button ref={proceed} type="submit" size="lg">
            {last ? 'Llamar a votación' : 'Dar la palabra al siguiente grupo'}
          </Button>
        ) : (
          <Button type="submit" size="lg" disabled={!choice}>
            Intervenir
          </Button>
        )}
      </div>
    </form>
  );
}

const VERDICT_TITLE: Record<CabildoReport['verdict'], string> = {
  consenso: 'Acuerdo por consenso',
  mayoria: 'Acuerdo por mayoría',
  'sin-acuerdo': 'El cabildo no llegó a un acuerdo',
};

function CabildoReportView({
  content,
  state,
  result,
  competency,
  back,
  onComplete,
  onRetry,
}: {
  content: CabildoContent;
  state: CabildoState;
  result: CabildoReport;
  competency: string;
  back: string;
  onComplete: () => void;
  onRetry: () => void;
}) {
  const listened = state.choices.filter(
    (c) => c.move === 'escuchar' || c.move === 'pedir-evidencia',
  ).length;
  const integrated = state.choices.filter((c) => c.move === 'integrar' && c.quality > 0).length;
  const [brujula] = useState(() => {
    const parts: string[] = [];
    if (result.verdict === 'consenso')
      parts.push('Todos los grupos respaldan el acuerdo: moderaste para que cada voz contara.');
    else if (result.verdict === 'mayoria')
      parts.push('Hay acuerdo, pero no de todos: piensa qué grupo quedó por fuera y por qué.');
    else
      parts.push(
        'Sin confianza no hay acuerdo: las respuestas que descalifican o imponen cierran el diálogo.',
      );
    if (result.fallacies > 0)
      parts.push(
        `Usaste ${String(result.fallacies)} ${result.fallacies === 1 ? 'falacia' : 'falacias'}: algunas sonaban amables, pero no respondían al argumento.`,
      );
    if (listened < 2)
      parts.push(
        'Escucha y pide evidencia antes de proponer: así las posturas se vuelven negociables.',
      );
    return {
      text: parts.join(' '),
      highlights: [
        `Resultado de la votación: ${VERDICT_TITLE[result.verdict]}.`,
        `Calidad media de las intervenciones: ${String(Math.round(result.accuracy * 100))} %.`,
        `Falacias usadas: ${String(result.fallacies)}.`,
        `Intervenciones de escucha o evidencia: ${String(listened)}.`,
        `Acuerdos en el acta: ${String(state.acta.length)}.`,
      ],
    };
  });

  return (
    <GameReport
      title={VERDICT_TITLE[result.verdict]}
      score={result.score}
      figures={[
        {
          label: 'Respaldan',
          value: `${String(result.supporters.length)} de ${String(content.factions.length)}`,
        },
        { label: 'Calidad media', value: `${String(Math.round(result.accuracy * 100))} %` },
        { label: 'Acuerdos en el acta', value: String(state.acta.length) },
      ]}
      criteria={[
        { label: 'Argumentaste sin falacias', met: result.fallacies === 0 },
        { label: 'Escuchaste y pediste evidencia antes de decidir', met: listened >= 2 },
        { label: 'Integraste posturas distintas', met: integrated >= 1 },
        { label: 'El acuerdo cuenta con todos los grupos', met: result.verdict === 'consenso' },
      ]}
      brujula={brujula}
      game="Sesión de cabildo"
      competency={competency}
      back={back}
      onComplete={onComplete}
      onRetry={onRetry}
    >
      <h3 className="mt-8 font-display text-lg font-bold">Votación</h3>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {content.factions.map((f) => {
          const yes = result.supporters.includes(f.id);
          return (
            <li
              key={f.id}
              className={cx(
                'border-l-[3px] bg-plate-sunk px-4 py-2',
                yes ? 'border-isle-latidosocial' : 'border-land-high',
              )}
            >
              <span className="font-semibold">{f.name}</span>
              <span className="block text-sm">
                {yes ? 'Respalda el acuerdo' : 'No lo respalda'} ·{' '}
                {Math.round(state.trust[f.id] ?? 0)} % de confianza
              </span>
            </li>
          );
        })}
      </ul>
      {state.acta.length > 0 && (
        <>
          <h3 className="mt-6 font-display text-lg font-bold">Acta del cabildo</h3>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            {state.acta.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ol>
        </>
      )}
    </GameReport>
  );
}
