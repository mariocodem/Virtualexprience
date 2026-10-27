import { useFrame } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from '@/a11y/useReducedMotion';
import { minigameLevel } from '@/ai/adaptiveEngine';
import type { HuertaContent } from '@/data/contentSchemas';
import { Controls } from '@/games/shared/controls';
import { GameStage } from '@/games/shared/GameStage';
import {
  DecisionCard,
  HudMeter,
  HudPanel,
  KeyHint,
  type DecisionFeedback,
} from '@/games/shared/hud';
import { STAGE_BUTTON, type ControlHelp } from '@/games/shared/stage';
import {
  assign,
  currentMoonId,
  energyLeft,
  EXHAUSTION_COST,
  huertaPlan,
  INDICATORS,
  isFinished,
  nextMoon,
  report,
  resolveMoon,
  REST,
  selectMoons,
  startHuerta,
  usedChances,
  validAssignment,
  type HuertaPlan,
  type HuertaReport,
  type HuertaState,
  type Indicator,
  type Moon,
  type MoonResult,
} from '@/minigames/huerta-comunitaria/engine';
import { GameBriefing } from '@/minigames/shared/GameBriefing';
import { GameReport } from '@/minigames/shared/GameReport';
import type { MinigameProps } from '@/minigames/shared/types';
import { useProgress } from '@/progress/store';
import { useMastery } from '@/stations/useMastery';
import { cx } from '@/ui/cx';
import { groupColor } from '../groups';
import {
  assignSelected,
  initialReparto,
  isReady,
  moonTip,
  pressKey,
  reportReading,
  selectGroup,
  type Reparto,
  type RepartoContext,
} from './flow';
import { HuertaScene3D, type HuertaView } from './HuertaScene3D';

const LABELS: Record<Indicator, string> = {
  familias: 'Familias',
  suelo: 'Salud del suelo',
  comunidad: 'Participación',
};

const HELP: ControlHelp[] = [
  { keys: '1 a 4', action: 'Elegir un grupo; luego, su tarea con 1 a 3' },
  { keys: '0 o R', action: 'Llevar al grupo elegido a descansar bajo la ceiba' },
  { keys: 'Retroceso', action: 'Soltar el grupo elegido' },
  { keys: 'Enter o E', action: 'Repartir el trabajo o pasar a la siguiente luna' },
  { keys: 'Clic', action: 'Elegir un grupo y luego una era o la ceiba' },
  { keys: 'Esc o P', action: 'Pausa' },
];

type Stage =
  | { kind: 'briefing' }
  | { kind: 'temporada'; queue: Moon[] }
  | { kind: 'informe'; queue: Moon[]; state: HuertaState; result: HuertaReport };

const signed = (value: number) => `${value >= 0 ? '+' : '−'}${String(Math.abs(value))}`;

/**
 * La huerta comunitaria en 3D (LatidoSocial). Mismo motor y mismas métricas
 * que la versión accesible: se reparte el trabajo de cada luna entre cuatro
 * grupos, se cuida su energía y los dilemas se resuelven en asamblea.
 */
export function Huerta3D({
  content,
  island,
  onBrujula,
  onEvents,
  onComplete,
  onFail,
}: MinigameProps<HuertaContent>) {
  const { mastery } = useMastery(island.id);
  const [level] = useState(() => minigameLevel(mastery));
  const plan = huertaPlan(level);
  const [stage, setStage] = useState<Stage>({ kind: 'briefing' });
  const [run, setRun] = useState(0);

  const begin = () => {
    onBrujula(null);
    setRun((r) => r + 1);
    setStage({ kind: 'temporada', queue: selectMoons(content.moons, plan, Math.random) });
    window.scrollTo({ top: 0 });
  };

  if (stage.kind === 'briefing') {
    return (
      <GameBriefing
        intro={content.intro}
        level={level}
        figures={[
          { label: 'Lunas', value: String(plan.moons) },
          { label: 'Grupos', value: String(content.groups.length) },
          { label: 'Meta', value: `${String(content.goal)} familias` },
          { label: 'Con su saber', value: 'rinde el doble' },
        ]}
        rules={[
          'Cada luna, lleva a cada grupo a una era (una tarea) o a descansar bajo la ceiba. Un grupo rinde el doble en la tarea que encaja con lo que sabe; una era no rinde más del doble, así que conviene repartir.',
          'Sobre cada grupo flotan sus faroles de energía. Quien trabaja más lunas seguidas de las que aguanta se agota: se encorva, rinde la mitad, baja la participación y debe descansar la luna siguiente.',
          'Las plantas crecen con lo cosechado y con la salud del suelo: cuidarlo es pensar en las próximas lunas.',
          'Luego, la comunidad se reúne en asamblea para decidir un dilema. Se evalúan el reparto, el cuidado de los grupos, tus decisiones y las familias alimentadas.',
        ]}
        beginLabel="Abrir la huerta"
        onBegin={begin}
      >
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {content.groups.map((g) => {
            const moons = Math.max(1, g.energy + plan.energyBonus);
            return (
              <li
                key={g.id}
                className="border-l-[3px] bg-plate-sunk px-3 py-2 text-sm"
                style={{ borderColor: groupColor(g.id) }}
              >
                <span className="font-semibold">{g.name}.</span> {g.strength}{' '}
                <span className="text-ink-soft">
                  Aguanta {moons} {moons === 1 ? 'luna' : 'lunas'} seguidas.
                </span>
              </li>
            );
          })}
        </ul>
      </GameBriefing>
    );
  }

  if (stage.kind === 'informe') {
    const { state, result } = stage;
    const reading = reportReading(content, state, result);
    return (
      <GameReport
        title={
          result.familias >= content.goal
            ? 'La huerta da frutos para el barrio'
            : 'La huerta necesita otra temporada'
        }
        score={result.score}
        figures={[
          { label: 'Familias', value: `${String(result.familias)} de ${String(content.goal)}` },
          {
            label: 'Saberes aprovechados',
            value: `${String(Math.round(result.accuracy * 100))} %`,
          },
          { label: 'Grupos agotados', value: String(result.exhaustions) },
        ]}
        criteria={[
          {
            label: 'Aprovechaste el saber de cada grupo',
            met: result.accuracy >= 0.75,
            detail: 'Cada grupo rinde el doble donde encaja lo que sabe.',
          },
          {
            label: 'Nadie se agotó',
            met: result.exhaustions === 0,
            detail: 'Repartir el trabajo también es cuidar a quienes lo hacen.',
          },
          { label: 'Decidiste con la comunidad en los dilemas', met: result.criteria >= 0.75 },
          {
            label: 'La huerta alimenta a las familias de la meta',
            met: result.familias >= content.goal,
          },
        ]}
        brujula={reading}
        game="La huerta comunitaria"
        competency={island.competency}
        back={`/mundo/${island.id}?estacion=latidosocial-huerta`}
        onComplete={() => {
          onComplete(result.score);
        }}
        onRetry={begin}
      />
    );
  }

  return (
    <Season
      key={run}
      content={content}
      island={island}
      queue={stage.queue}
      plan={plan}
      onBrujula={onBrujula}
      onEvents={onEvents}
      onFail={onFail}
      onFinish={(state, result) => {
        setStage({ kind: 'informe', queue: stage.queue, state, result });
      }}
    />
  );
}

function Season({
  content,
  island,
  queue,
  plan,
  onBrujula,
  onEvents,
  onFail,
  onFinish,
}: Pick<
  MinigameProps<HuertaContent>,
  'content' | 'island' | 'onBrujula' | 'onEvents' | 'onFail'
> & {
  queue: Moon[];
  plan: HuertaPlan;
  onFinish: (state: HuertaState, result: HuertaReport) => void;
}) {
  const still = useReducedMotion();
  const { record } = useMastery(island.id);
  const recordMinigame = useProgress((s) => s.recordMinigame);
  const [controls] = useState(() => new Controls());
  const [paused, setPaused] = useState(false);
  const [state, setState] = useState<HuertaState>(() => startHuerta(content, queue, plan));
  const [reparto, setReparto] = useState<Reparto>(() => initialReparto([]));
  // Copia síncrona: dos teclas seguidas no deben leer un reparto viejo.
  const repartoRef = useRef(reparto);
  const [pick, setPick] = useState<{ id: string; feedback: DecisionFeedback } | null>(null);
  const [announce, setAnnounce] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);

  const moon = queue.find((m) => m.id === currentMoonId(state)) ?? queue[0];
  const names = Object.fromEntries(content.groups.map((g) => [g.id, g.name]));
  const ctx = useMemo<RepartoContext>(
    () => ({
      groups: content.groups.map((g) => g.id),
      tasks: moon?.tasks.map((t) => t.id) ?? [],
      resting: state.resting,
    }),
    [content, moon, state.resting],
  );
  const ready = state.phase === 'reparto' && isReady(reparto, ctx);
  const done = state.phase === 'reparto' ? undefined : state.log.at(-1);

  const apply = useCallback((step: { reparto: Reparto; note: string | null }) => {
    repartoRef.current = step.reparto;
    setReparto(step.reparto);
    if (step.note) setAnnounce(step.note);
  }, []);

  const submit = () => {
    const choices = repartoRef.current.choices;
    if (!moon || state.phase !== 'reparto' || !isReady(repartoRef.current, ctx)) return;
    if (!validAssignment(state, content, moon, choices)) return;
    const next = assign(state, content, moon, choices);
    const result = next.log.at(-1);
    if (result && result.chances.length > 0)
      record(moon.tier, usedChances(result).length / result.chances.length);
    setState(next);
    if (result) {
      const gained = next.familias - state.familias;
      setAnnounce(
        `Se repartió el trabajo: ${signed(gained)} familias. ${moonTip(result, usedChances)}`,
      );
    }
  };

  const decide = (optionId: string) => {
    if (!moon || pick) return;
    const option = moon.dilemma.options.find((o) => o.id === optionId);
    if (!option) return;
    record(moon.tier, option.quality);
    setPick({
      id: option.id,
      feedback: { correct: option.quality >= 1, text: option.feedback },
    });
  };

  const closeDilemma = () => {
    if (!moon || !pick) return;
    const next = resolveMoon(state, moon, pick.id);
    setPick(null);
    setState(next);
    const result = next.log.at(-1);
    if (result) onBrujula({ text: moonTip(result, usedChances), source: 'local' });
  };

  const advance = () => {
    const next = nextMoon(state);
    onBrujula(null);
    if (isFinished(next)) {
      const result = report(next, content);
      onEvents(
        recordMinigame('huerta-comunitaria', {
          accuracy: result.accuracy,
          criteria: result.criteria,
          toolsUsed: result.toolsUsed,
        }),
      );
      if (result.score < 0.6) onFail(result.score);
      onFinish(next, result);
      return;
    }
    setState(next);
    const fresh = initialReparto(next.resting);
    repartoRef.current = fresh;
    setReparto(fresh);
    setAnnounce(`Nueva luna: ${queue.find((m) => m.id === currentMoonId(next))?.title ?? ''}`);
  };

  // Al cambiar de fase se desmonta la tarjeta enfocada: el foco vuelve al escenario.
  useEffect(() => {
    if (state.phase === 'reparto') {
      const host = rootRef.current?.closest<HTMLElement>('[role="application"]');
      if (host && !host.contains(document.activeElement)) host.focus();
    }
  }, [state.phase, state.index]);

  // Teclado del reparto y de las demás fases, con una sola escucha.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || pausedRef.current) return;
      const host = rootRef.current?.closest('[role="application"]');
      if (!host?.contains(document.activeElement) && document.activeElement !== document.body)
        return;
      if (state.phase !== 'reparto') return;
      if (!/^[0-9rR]$/.test(event.key) && event.key !== 'Backspace') return;
      event.preventDefault();
      apply(pressKey(repartoRef.current, ctx, event.key));
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
    };
  });

  const poll = () => {
    if (!controls.take('interact')) return;
    if (state.phase === 'reparto') submit();
    else if (state.phase === 'cierre') advance();
  };

  const view = useMemo<HuertaView | null>(
    () =>
      moon
        ? {
            state,
            content,
            moon,
            choices: reparto.choices,
            selected: reparto.selected,
            assembly: state.phase === 'dilema',
            index: state.index,
            total: queue.length,
          }
        : null,
    [state, content, moon, reparto, queue.length],
  );
  const pickGroup = useCallback(
    (group: string) => {
      apply(selectGroup(repartoRef.current, ctx, group));
    },
    [apply, ctx],
  );
  const pickTask = useCallback(
    (task: string) => {
      if (!repartoRef.current.selected) setAnnounce('Primero elige un grupo.');
      else apply(assignSelected(repartoRef.current, ctx, task));
    },
    [apply, ctx],
  );
  if (!moon || !view) return null;

  return (
    <GameStage
      label="La huerta comunitaria de LatidoSocial"
      controls={controls}
      camera={{ fov: 44, position: [0, 13, 19.5], near: 0.5, far: 220 }}
      paused={paused}
      onPause={(next) => {
        pausedRef.current = next;
        setPaused(next);
      }}
      help={HELP}
      announce={announce}
      touch={false}
      className="min-h-[560px]"
      hud={
        <div ref={rootRef} className="absolute inset-0">
          <div className="absolute top-3 left-3 grid w-44 gap-2 sm:w-64">
            <HudPanel className="grid gap-2">
              <p className="toponym text-[0.625rem] text-sea-100">
                Luna {state.index + 1} de {queue.length}
              </p>
              <p className="font-display text-sm font-extrabold">{moon.title}</p>
              <HudMeter
                label="Familias"
                value={state.familias / content.goal}
                text={`${String(state.familias)} de ${String(content.goal)}`}
              />
              <HudMeter
                label="Salud del suelo"
                value={state.suelo / 100}
                text={`${String(Math.round(state.suelo))} de 100`}
                tone="low"
              />
              <HudMeter
                label="Participación"
                value={state.comunidad / 100}
                text={`${String(Math.round(state.comunidad))} de 100`}
                tone={state.comunidad < 40 ? 'route' : 'sun'}
              />
            </HudPanel>
          </div>

          {state.phase === 'reparto' && (
            <div className="absolute inset-x-3 bottom-3 max-h-[46%] overflow-auto sm:inset-x-auto sm:top-16 sm:right-3 sm:bottom-auto sm:max-h-[calc(100%-5rem)] sm:w-80">
              <HudPanel className="grid gap-2">
                <h2 className="font-display text-sm font-extrabold">¿Quién hace qué?</h2>
                <p className="text-xs text-sea-100">{moon.situation}</p>
                <ul className="grid gap-1 text-xs">
                  {moon.tasks.map((t, i) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        aria-keyshortcuts={reparto.selected ? String(i + 1) : undefined}
                        onClick={() => {
                          pickTask(t.id);
                        }}
                        className={cx(
                          'flex min-h-11 w-full items-start gap-2 border-[1.5px] px-2 py-1 text-left',
                          reparto.selected ? 'border-land-sun' : 'border-sea-300',
                          'bg-sea-900 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-land-sun',
                        )}
                      >
                        <kbd className="mt-0.5 border-[1.5px] border-sea-100 px-1 font-display font-bold">
                          {i + 1}
                        </kbd>
                        <span>
                          <span className="block font-semibold">{t.label}</span>
                          <span className="block text-sea-100">{t.detail}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                  <li>
                    <button
                      type="button"
                      aria-keyshortcuts="0"
                      onClick={() => {
                        pickTask(REST);
                      }}
                      className="flex min-h-11 w-full items-center gap-2 border-[1.5px] border-sea-300 bg-sea-900 px-2 py-1 text-left focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-land-sun"
                    >
                      <kbd className="border-[1.5px] border-sea-100 px-1 font-display font-bold">
                        0
                      </kbd>
                      <span className="font-semibold">Descansar bajo la ceiba</span>
                    </button>
                  </li>
                </ul>
                <h3 className="toponym text-[0.625rem] text-sea-100">
                  {reparto.selected
                    ? `Elige la tarea de ${names[reparto.selected] ?? ''}`
                    : 'Elige un grupo (1 a 4)'}
                </h3>
                <ul className="grid gap-1 text-xs">
                  {content.groups.map((g, i) => {
                    const forced = state.resting.includes(g.id);
                    const left = energyLeft(state, g.id);
                    const choice = reparto.choices[g.id];
                    const label =
                      choice === REST
                        ? 'Descansa'
                        : (moon.tasks.find((t) => t.id === choice)?.label ?? 'Sin tarea');
                    return (
                      <li key={g.id}>
                        <button
                          type="button"
                          aria-keyshortcuts={reparto.selected ? undefined : String(i + 1)}
                          aria-pressed={reparto.selected === g.id}
                          onClick={() => {
                            pickGroup(g.id);
                          }}
                          className={cx(
                            'flex min-h-11 w-full items-start gap-2 border-[1.5px] px-2 py-1 text-left',
                            reparto.selected === g.id
                              ? 'border-land-sun bg-sea-800'
                              : 'border-sea-300 bg-sea-900',
                            'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-land-sun',
                          )}
                        >
                          <kbd className="mt-0.5 border-[1.5px] border-sea-100 px-1 font-display font-bold">
                            {i + 1}
                          </kbd>
                          <span
                            aria-hidden="true"
                            className="mt-1 size-3 shrink-0 border border-plate"
                            style={{ background: groupColor(g.id) }}
                          />
                          <span className="min-w-0">
                            <span className="block font-semibold">{g.name}</span>
                            <span className="block text-sea-100">
                              {forced
                                ? 'Agotado: descansa esta luna'
                                : `Energía: ${String(left)} de ${String(state.stamina[g.id] ?? 1)} lunas`}
                              {' · '}
                              {label}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <button
                  type="button"
                  disabled={!ready}
                  onClick={submit}
                  className={cx(
                    STAGE_BUTTON,
                    'justify-center bg-land-sun !text-ink disabled:bg-sea-950/80 disabled:!text-plate disabled:opacity-50',
                  )}
                >
                  Repartir el trabajo <kbd className="text-xs">Enter</kbd>
                </button>
              </HudPanel>
            </div>
          )}

          {state.phase === 'dilema' && (
            <div className="absolute inset-x-3 bottom-3 sm:right-3 sm:bottom-4 sm:left-auto sm:w-[26rem]">
              <DecisionCard
                title="Asamblea de la comunidad"
                item={{
                  prompt: moon.dilemma.prompt,
                  options: moon.dilemma.options.map((o) => ({
                    id: o.id,
                    text: o.text,
                    correct: o.quality >= 1,
                    feedback: o.feedback,
                  })),
                }}
                feedback={pick?.feedback ?? null}
                onChoose={decide}
                onContinue={closeDilemma}
                continueLabel="Cerrar la luna"
                className="max-h-[70svh] max-w-md overflow-auto"
              />
            </div>
          )}

          {state.phase === 'cierre' && done && (
            <div className="absolute inset-x-3 bottom-3 sm:right-3 sm:bottom-4 sm:left-auto sm:w-[26rem]">
              <MoonBalance
                result={done}
                state={state}
                moon={moon}
                names={names}
                last={state.index + 1 === queue.length}
                onNext={advance}
              />
            </div>
          )}

          {state.phase === 'reparto' && !reparto.selected && (
            <div className="absolute bottom-4 left-4 hidden sm:block">
              <KeyHint keys="1 a 4">Elegir un grupo</KeyHint>
            </div>
          )}
        </div>
      }
    >
      <HuertaScene3D
        view={view}
        still={still}
        onPickGroup={pickGroup}
        onPickBed={pickTask}
        onPickRest={() => {
          pickTask(REST);
        }}
      />
      <Poll onFrame={poll} />
    </GameStage>
  );
}

function Poll({ onFrame }: { onFrame: () => void }) {
  useFrame(() => {
    onFrame();
  });
  return null;
}

function MoonBalance({
  result,
  state,
  moon,
  names,
  last,
  onNext,
}: {
  result: MoonResult;
  state: HuertaState;
  moon: Moon;
  names: Record<string, string>;
  last: boolean;
  onNext: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  const label = (choice: string) => moon.tasks.find((t) => t.id === choice)?.label ?? 'Descansó';
  return (
    <section
      aria-labelledby="balance-luna"
      className="pointer-events-auto max-h-[70svh] overflow-auto bg-plate p-4 text-ink [--focus:var(--route)] plate-rule"
    >
      <h2
        id="balance-luna"
        ref={heading}
        tabIndex={-1}
        className="font-display text-lg font-extrabold outline-none"
      >
        Balance de la luna
      </h2>
      <dl className="mt-2 grid grid-cols-3 gap-3 border-y-[1.5px] border-ink py-2">
        {INDICATORS.map((key) => (
          <div key={key}>
            <dt className="text-xs text-ink-soft">{LABELS[key]}</dt>
            <dd className="font-display text-xl font-extrabold tabular-nums">
              {signed(Math.round(state[key] - result.before[key]))}
            </dd>
          </div>
        ))}
      </dl>
      <ul className="mt-2 grid gap-1.5">
        {Object.entries(result.assignment).map(([group, choice]) => {
          const fit = result.fits.includes(group);
          const tired = result.exhausted.includes(group);
          return (
            <li key={group} className="bg-plate-sunk px-3 py-1.5 text-xs">
              <span className="font-semibold">{names[group]}:</span> {label(choice)}
              {choice !== REST && (
                <span className="block text-ink-soft">
                  {tired
                    ? `Se agotó: rindió la mitad, la participación bajó ${String(EXHAUSTION_COST)} y descansará la próxima luna.`
                    : fit
                      ? 'Rindió el doble: la tarea encaja con su saber.'
                      : 'Rindió lo normal: la tarea no aprovecha lo que sabe hacer.'}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={onNext}
        className="mt-3 inline-flex min-h-11 items-center border-[1.5px] border-sea-900 bg-sea-900 px-5 font-display font-bold text-land-sun"
      >
        {last ? 'Ver el balance de la temporada' : 'Siguiente luna'}
      </button>
    </section>
  );
}
