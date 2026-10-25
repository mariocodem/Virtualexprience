import { useEffect, useId, useRef, useState } from 'react';
import { useReducedMotion } from '@/a11y/useReducedMotion';
import { minigameLevel } from '@/ai/adaptiveEngine';
import type { BancoContent, FeedbackKind } from '@/data/contentSchemas';
import { useProgress } from '@/progress/store';
import { useMastery } from '@/stations/useMastery';
import { Button } from '@/ui/Button';
import { cx } from '@/ui/cx';
import { GameBriefing } from '../shared/GameBriefing';
import { GameReport } from '../shared/GameReport';
import { Meter } from '../shared/Meter';
import type { MinigameProps } from '../shared/types';
import { BlueprintScene } from './BlueprintScene';
import {
  addressesPattern,
  bancoPlan,
  canBuild,
  classify,
  costOf,
  currentRoundId,
  isFinished,
  iterate,
  MAX_CHANGES,
  nextRound,
  report,
  selectRounds,
  startBanco,
  targetSatisfaction,
  type BancoReport,
  type BancoRound,
  type BancoState,
} from './engine';

const KINDS: FeedbackKind[] = ['patron', 'aislado', 'fuera'];
const KIND_LABEL: Record<FeedbackKind, string> = {
  patron: 'Se repite',
  aislado: 'Caso aislado',
  fuera: 'Fuera del problema',
};

type Stage =
  | { kind: 'briefing' }
  | { kind: 'taller'; queue: BancoRound[]; state: BancoState }
  | { kind: 'informe'; state: BancoState; result: BancoReport };

/**
 * Banco de pruebas (ActivaTuIdea). Emprender es aprender de quienes usan la
 * idea: separar lo que se repite de lo anecdótico y de lo que no es el
 * problema, e iterar con materiales que no alcanzan para todo.
 */
export function BancoDePruebas({
  content,
  island,
  onBrujula,
  onEvents,
  onComplete,
  onFail,
}: MinigameProps<BancoContent>) {
  const still = useReducedMotion();
  const { mastery, record } = useMastery(island.id);
  const recordMinigame = useProgress((s) => s.recordMinigame);
  const [level] = useState(() => minigameLevel(mastery));
  const plan = bancoPlan(level);
  const [stage, setStage] = useState<Stage>({ kind: 'briefing' });
  const names = Object.fromEntries(content.users.map((u) => [u.id, u.name]));

  const begin = () => {
    const queue = selectRounds(content.rounds, plan, Math.random);
    onBrujula(null);
    setStage({ kind: 'taller', queue, state: startBanco(content, queue, plan) });
    window.scrollTo({ top: 0 });
  };

  if (stage.kind === 'briefing') {
    return (
      <GameBriefing
        intro={content.intro}
        level={level}
        figures={[
          { label: 'Rondas de prueba', value: String(plan.rounds) },
          { label: 'Materiales', value: String(Math.round(content.budget * plan.budgetFactor)) },
          { label: 'Cambios por ronda', value: `hasta ${String(MAX_CHANGES)}` },
          { label: 'Meta de satisfacción', value: `${String(content.goal)} %` },
        ]}
        rules={[
          `El problema: ${content.problem}`,
          `La idea: ${content.idea}`,
          'En cada ronda, clasifica lo que dicen quienes probaron el prototipo: ¿se repite, es un caso aislado o está fuera del problema?',
          'Luego elige hasta dos cambios con los materiales que te quedan. Cuenta la satisfacción de quienes tienen el problema.',
        ]}
        beginLabel="Abrir el banco de pruebas"
        onBegin={begin}
      >
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {content.users.map((u) => (
            <li key={u.id} className="border-l-[3px] border-ink bg-plate-sunk px-3 py-2 text-sm">
              <span className="font-semibold">{u.name}.</span> {u.profile}
            </li>
          ))}
        </ul>
      </GameBriefing>
    );
  }

  if (stage.kind === 'informe') {
    return (
      <BancoReportView
        content={content}
        state={stage.state}
        result={stage.result}
        competency={island.competency}
        back={`/mundo/${island.id}?estacion=activatuidea-taller`}
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
  const update = (next: BancoState) => {
    setStage({ kind: 'taller', queue, state: next });
  };

  return (
    <div className="grid gap-5">
      <p className="toponym text-[0.625rem] text-ink-soft">
        Taller de ActivaTuIdea · Prueba {state.index + 1} de {queue.length} · {round.title}
      </p>
      <div className="on-sea plate-rule">
        <BlueprintScene built={state.built} iteration={state.index + 1} still={still} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div>
          {state.phase === 'escuchar' && (
            <Listen
              key={round.id}
              round={round}
              names={names}
              onDone={(answers) => {
                const next = classify(state, round, answers);
                const right = round.feedback.filter((f) => answers[f.id] === f.kind).length;
                record(round.tier, right / round.feedback.length);
                onBrujula({
                  text:
                    right === round.feedback.length
                      ? 'Leíste bien la prueba: distinguiste lo que se repite de lo anecdótico.'
                      : 'Un patrón se reconoce cuando varias personas con el problema dicen lo mismo, aunque usen palabras distintas. El entusiasmo de quien no tiene el problema no es evidencia.',
                  source: 'local',
                });
                update(next);
              }}
            />
          )}
          {state.phase === 'iterar' && (
            <Workbench
              key={`${round.id}-taller`}
              round={round}
              state={state}
              names={names}
              onBuild={(ids) => {
                const next = iterate(state, round, ids);
                const chosen = round.changes.filter((c) => ids.includes(c.id));
                const grounded = chosen.filter((c) => addressesPattern(round, c)).length;
                record(round.tier, chosen.length === 0 ? 0 : grounded / chosen.length);
                onBrujula({
                  text:
                    chosen.length === 0
                      ? 'No construiste nada esta ronda. Ahorrar materiales tiene sentido, pero sin iterar el prototipo no aprende.'
                      : grounded === chosen.length
                        ? 'Iteraste sobre lo que se repetía: así se gastan los materiales donde más importan.'
                        : 'Parte de los materiales se fue en cambios que nadie con el problema pidió. Prioriza los patrones.',
                  source: 'local',
                });
                update(next);
              }}
            />
          )}
          {state.phase === 'probar' && (
            <TestResults
              key={`${round.id}-prueba`}
              state={state}
              names={names}
              last={state.index + 1 === queue.length}
              onNext={() => {
                const next = nextRound(state);
                onBrujula(null);
                if (isFinished(next)) {
                  const result = report(next, content);
                  onEvents(
                    recordMinigame('banco-de-pruebas', {
                      accuracy: result.accuracy,
                      criteria: result.criteria,
                      toolsUsed: result.toolsUsed,
                    }),
                  );
                  if (result.score < 0.6) onFail(result.score);
                  setStage({ kind: 'informe', state: next, result });
                } else {
                  update(next);
                }
              }}
            />
          )}
        </div>

        <aside
          aria-label="Estado del prototipo"
          className="grid content-start gap-4 border-t-[1.5px] border-ink pt-4 lg:border-t-0 lg:border-l-[1.5px] lg:pt-0 lg:pl-6"
        >
          <div>
            <p className="text-sm text-ink-soft">Materiales disponibles</p>
            <p className="font-display text-3xl font-extrabold tabular-nums">{state.budget}</p>
          </div>
          <h3 className="font-display text-lg font-extrabold">Satisfacción</h3>
          {content.users.map((u) => (
            <Meter
              key={u.id}
              label={u.target ? u.name : `${u.name} (no tiene el problema)`}
              value={state.satisfaction[u.id] ?? 0}
              valueText={`${String(Math.round(state.satisfaction[u.id] ?? 0))} %`}
              mark={u.target ? content.goal : undefined}
              tone={u.target ? 'ink' : 'high'}
            />
          ))}
          <p className="text-xs text-ink-soft">
            Promedio de quienes tienen el problema: {Math.round(targetSatisfaction(state, content))}{' '}
            %. Meta: {content.goal} %.
          </p>
        </aside>
      </div>
    </div>
  );
}

function Listen({
  round,
  names,
  onDone,
}: {
  round: BancoRound;
  names: Record<string, string>;
  onDone: (answers: Record<string, FeedbackKind>) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, FeedbackKind>>({});
  const heading = useRef<HTMLHeadingElement>(null);
  const group = useId();
  useEffect(() => {
    heading.current?.focus();
  }, []);
  const complete = round.feedback.every((f) => f.id in answers);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (complete) onDone(answers);
      }}
    >
      <h2 ref={heading} tabIndex={-1} className="font-display text-xl font-extrabold outline-none">
        Lo que dijeron en la prueba
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        Clasifica cada comentario antes de pasar al taller.
      </p>
      <ul className="mt-4 grid gap-3">
        {round.feedback.map((f) => (
          <li key={f.id} className="border-[1.5px] border-plate-edge p-4">
            <fieldset>
              <legend className="w-full">
                <span className="text-sm font-semibold text-ink-soft">{names[f.userId]}</span>
                <span className="mt-1 block font-display text-lg">«{f.quote}»</span>
              </legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {KINDS.map((kind) => (
                  <label
                    key={kind}
                    className={cx(
                      'inline-flex min-h-11 cursor-pointer items-center border-[1.5px] px-3 text-sm',
                      'has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-(--focus)',
                      answers[f.id] === kind
                        ? 'border-ink bg-ink text-land-sun'
                        : 'border-plate-edge hover:border-ink',
                    )}
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      name={`${group}-${f.id}`}
                      checked={answers[f.id] === kind}
                      onChange={() => {
                        setAnswers((a) => ({ ...a, [f.id]: kind }));
                      }}
                    />
                    {KIND_LABEL[kind]}
                  </label>
                ))}
              </div>
            </fieldset>
          </li>
        ))}
      </ul>
      <Button type="submit" size="lg" className="mt-5" disabled={!complete}>
        Guardar mis notas
      </Button>
    </form>
  );
}

function Workbench({
  round,
  state,
  names,
  onBuild,
}: {
  round: BancoRound;
  state: BancoState;
  names: Record<string, string>;
  onBuild: (ids: string[]) => void;
}) {
  const [picks, setPicks] = useState<string[]>([]);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  const cost = costOf(round, picks);

  return (
    <div>
      <h2 ref={heading} tabIndex={-1} className="font-display text-xl font-extrabold outline-none">
        Tus notas, revisadas
      </h2>
      <ul className="mt-3 grid gap-2">
        {round.feedback.map((f) => {
          const mine = state.notes[f.id];
          const right = mine === f.kind;
          return (
            <li
              key={f.id}
              className={cx(
                'border-l-[3px] bg-plate-sunk px-4 py-2 text-sm',
                right ? 'border-isle-latidosocial' : 'border-land-high',
              )}
            >
              <span className="font-semibold">{names[f.userId]}:</span> «{f.quote}»
              <span className="mt-1 block">
                {right
                  ? `Bien: ${KIND_LABEL[f.kind].toLowerCase()}.`
                  : `Anotaste «${mine ? KIND_LABEL[mine] : '—'}»; era «${KIND_LABEL[f.kind]}».`}{' '}
                <span className="text-ink-soft">{f.why}</span>
              </span>
            </li>
          );
        })}
      </ul>

      <form
        className="mt-6 border-t-[1.5px] border-ink pt-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (canBuild(state, round, picks)) onBuild(picks);
        }}
      >
        <fieldset>
          <legend className="font-display text-lg font-extrabold">Cambios posibles</legend>
          <p className="mt-1 text-sm text-ink-soft tabular-nums">
            Elige hasta {MAX_CHANGES}. Materiales: {cost} de {state.budget} disponibles.
          </p>
          <div className="mt-3 grid gap-2">
            {round.changes.map((change) => {
              const on = picks.includes(change.id);
              const next = on ? picks.filter((id) => id !== change.id) : [...picks, change.id];
              const blocked = !on && !canBuild(state, round, next);
              const askers = [
                ...new Set(
                  change.addresses.flatMap((id) => {
                    const f = round.feedback.find((x) => x.id === id);
                    return f ? [names[f.userId] ?? f.userId] : [];
                  }),
                ),
              ];
              return (
                <label
                  key={change.id}
                  className={cx(
                    'flex min-h-14 cursor-pointer items-start gap-3 border-[1.5px] px-4 py-3',
                    'has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-(--focus)',
                    on ? 'border-ink bg-plate-sunk' : 'border-plate-edge hover:border-ink',
                    blocked && 'cursor-not-allowed opacity-45',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={blocked}
                    onChange={() => {
                      setPicks(next);
                    }}
                    className="mt-1 size-4 shrink-0 accent-ink"
                  />
                  <span className="flex-1">
                    <span className="font-semibold">{change.label}</span>
                    <span className="block text-sm text-ink-soft">
                      {askers.length > 0
                        ? `Responde a: ${askers.join(', ')}`
                        : 'No responde a ningún comentario'}
                    </span>
                  </span>
                  <span className="text-sm font-semibold tabular-nums">
                    {change.cost} de material
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
        <Button type="submit" size="lg" className="mt-5">
          {picks.length === 0 ? 'Probar sin cambios' : 'Construir y probar'}
        </Button>
      </form>
    </div>
  );
}

function TestResults({
  state,
  names,
  last,
  onNext,
}: {
  state: BancoState;
  names: Record<string, string>;
  last: boolean;
  onNext: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  const changes = Object.entries(state.last).filter(([, delta]) => delta !== 0);
  return (
    <section aria-labelledby="resultado-prueba">
      <h2
        id="resultado-prueba"
        ref={heading}
        tabIndex={-1}
        className="font-display text-xl font-extrabold outline-none"
      >
        Así reaccionaron
      </h2>
      {changes.length === 0 ? (
        <p className="mt-3">Nadie notó una diferencia con la versión anterior.</p>
      ) : (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {changes.map(([user, delta]) => (
            <li
              key={user}
              className={cx(
                'border-l-[3px] bg-plate-sunk px-4 py-2',
                delta > 0 ? 'border-isle-latidosocial' : 'border-land-high',
              )}
            >
              <span className="font-semibold">{names[user]}</span>
              <span className="block text-sm tabular-nums">
                Satisfacción {delta > 0 ? '+' : '−'}
                {Math.abs(delta)} puntos
              </span>
            </li>
          ))}
        </ul>
      )}
      <Button size="lg" className="mt-5" onClick={onNext}>
        {last ? 'Ver el informe del taller' : 'Siguiente prueba'}
      </Button>
    </section>
  );
}

function BancoReportView({
  content,
  state,
  result,
  competency,
  back,
  onComplete,
  onRetry,
}: {
  content: BancoContent;
  state: BancoState;
  result: BancoReport;
  competency: string;
  back: string;
  onComplete: () => void;
  onRetry: () => void;
}) {
  const [brujula] = useState(() => {
    const parts: string[] = [];
    if (result.satisfaction >= content.goal)
      parts.push(
        'Tu prototipo ya resuelve el problema para quienes lo tienen: está listo para el pitch.',
      );
    else
      parts.push(
        'El prototipo todavía no convence a quienes tienen el problema. Revisa en qué gastaste los materiales.',
      );
    if (result.accuracy < 0.75)
      parts.push(
        'Separar patrones de casos aislados es la habilidad central: busca lo que dicen varias personas con el problema.',
      );
    if (result.criteria < 0.75)
      parts.push(
        'Algunos cambios respondieron a ocurrencias o a quien no tiene el problema. Iterar es elegir qué no construir.',
      );
    else parts.push('Cada cambio respondió a evidencia: así se itera con poco.');
    return {
      text: parts.join(' '),
      highlights: [
        `Comentarios bien clasificados: ${String(Math.round(result.accuracy * 100))} %.`,
        `Cambios construidos: ${String(result.changes)}; de ellos, responden a patrones: ${String(Math.round(result.criteria * 100))} %.`,
        `Satisfacción final de quienes tienen el problema: ${String(Math.round(result.satisfaction))} % (meta ${String(content.goal)} %).`,
        `Materiales sin usar: ${String(state.budget)}.`,
      ],
    };
  });

  return (
    <GameReport
      title={
        result.satisfaction >= content.goal
          ? 'El prototipo está listo para el pitch'
          : 'El prototipo necesita otra vuelta'
      }
      score={result.score}
      figures={[
        { label: 'Satisfacción', value: `${String(Math.round(result.satisfaction))} %` },
        { label: 'Notas acertadas', value: `${String(Math.round(result.accuracy * 100))} %` },
        {
          label: 'Patrones atendidos',
          value: `${String(result.toolsUsed)} de ${String(state.queue.length)}`,
        },
      ]}
      criteria={[
        { label: 'Distinguiste patrones de casos aislados', met: result.accuracy >= 0.75 },
        { label: 'Iteraste con evidencia, no con ocurrencias', met: result.criteria >= 0.75 },
        {
          label: 'No construiste para lo que está fuera del problema',
          met: result.offProblem === 0,
          detail: 'El entusiasmo de quien no tiene el problema no es evidencia.',
        },
        { label: 'Alcanzaste la meta de satisfacción', met: result.satisfaction >= content.goal },
      ]}
      brujula={brujula}
      game="Banco de pruebas"
      competency={competency}
      back={back}
      onComplete={onComplete}
      onRetry={onRetry}
    >
      <h3 className="mt-8 font-display text-lg font-bold">Lo que construiste</h3>
      {state.built.length === 0 ? (
        <p className="mt-2 text-ink-soft">El prototipo no cambió en toda la temporada.</p>
      ) : (
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          {state.built.map((b) => (
            <li key={b.changeId}>{b.part}</li>
          ))}
        </ol>
      )}
    </GameReport>
  );
}
