import { useEffect, useId, useRef, useState } from 'react';
import { useReducedMotion } from '@/a11y/useReducedMotion';
import { minigameLevel } from '@/ai/adaptiveEngine';
import type { HuertaContent } from '@/data/contentSchemas';
import { useProgress } from '@/progress/store';
import { useMastery } from '@/stations/useMastery';
import { Button } from '@/ui/Button';
import { cx } from '@/ui/cx';
import { DilemmaPanel } from '../shared/DilemmaPanel';
import { GameBriefing } from '../shared/GameBriefing';
import { GameReport } from '../shared/GameReport';
import { Meter } from '../shared/Meter';
import type { MinigameProps } from '../shared/types';
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
  type HuertaReport,
  type HuertaState,
  type Indicator,
  type Moon,
  type MoonResult,
} from './engine';
import { HuertaScene } from './HuertaScene';

const EFFECT_LABELS: Record<Indicator, string> = {
  familias: 'Familias',
  suelo: 'Salud del suelo',
  comunidad: 'Participación',
};

type Stage =
  | { kind: 'briefing' }
  | { kind: 'temporada'; queue: Moon[]; state: HuertaState }
  | { kind: 'informe'; queue: Moon[]; state: HuertaState; result: HuertaReport };

/**
 * La huerta comunitaria (LatidoSocial). La proyección social se hace con la
 * comunidad, no por ella: reconocer lo que sabe cada grupo, repartir el trabajo
 * sin agotar a nadie y decidir en común cuando aparecen los dilemas.
 */
export function HuertaComunitaria({
  content,
  island,
  onBrujula,
  onEvents,
  onComplete,
  onFail,
}: MinigameProps<HuertaContent>) {
  const still = useReducedMotion();
  const { mastery, record } = useMastery(island.id);
  const recordMinigame = useProgress((s) => s.recordMinigame);
  const [level] = useState(() => minigameLevel(mastery));
  const plan = huertaPlan(level);
  const [stage, setStage] = useState<Stage>({ kind: 'briefing' });
  const chosen = useRef<string | null>(null);
  const names = Object.fromEntries(content.groups.map((g) => [g.id, g.name]));

  const begin = () => {
    const queue = selectMoons(content.moons, plan, Math.random);
    onBrujula(null);
    setStage({ kind: 'temporada', queue, state: startHuerta(content, queue, plan) });
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
          'Cada luna, asigna a cada grupo una tarea o un descanso. Un grupo rinde el doble en la tarea que encaja con lo que sabe; una tarea no rinde más del doble, así que conviene repartir.',
          'Cada grupo aguanta unas lunas seguidas de trabajo. Si trabaja más allá, se agota: rinde la mitad, baja la participación y debe descansar la luna siguiente.',
          'La salud del suelo multiplica lo que rinden siembras y cosechas: cuidarlo es pensar en las próximas lunas.',
          'Después llega un dilema de la comunidad. Se evalúan el reparto, el cuidado de los grupos, tus decisiones y las familias alimentadas.',
        ]}
        beginLabel="Abrir la huerta"
        onBegin={begin}
      >
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {content.groups.map((g) => {
            const moons = Math.max(1, g.energy + plan.energyBonus);
            return (
              <li key={g.id} className="border-l-[3px] border-ink bg-plate-sunk px-3 py-2 text-sm">
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
    return (
      <HuertaReportView
        content={content}
        queue={stage.queue}
        state={stage.state}
        result={stage.result}
        competency={island.competency}
        back={`/mundo/${island.id}?estacion=latidosocial-huerta`}
        onComplete={() => {
          onComplete(stage.result.score);
        }}
        onRetry={begin}
      />
    );
  }

  const { queue, state } = stage;
  const moon = queue.find((m) => m.id === currentMoonId(state));
  if (!moon) return null;
  const done = state.phase === 'reparto' ? undefined : state.log.at(-1);
  const update = (next: HuertaState) => {
    setStage({ kind: 'temporada', queue, state: next });
  };

  return (
    <div className="grid gap-5">
      <p className="toponym text-[0.625rem] text-ink-soft">
        Huerta de LatidoSocial · Luna {state.index + 1} de {queue.length} · {moon.title}
      </p>
      <div className="bg-plate-sunk plate-rule">
        <HuertaScene
          beds={moon.tasks.map((t) => t.id)}
          groups={content.groups.map((g) => g.id)}
          assignment={done?.assignment ?? null}
          exhausted={done?.exhausted ?? state.resting}
          growth={state.familias / content.goal}
          suelo={state.suelo}
          still={still}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div>
          {state.phase === 'reparto' && (
            <Assignment
              key={moon.id}
              moon={moon}
              content={content}
              state={state}
              onAssign={(assignment) => {
                const next = assign(state, content, moon, assignment);
                const result = next.log.at(-1);
                if (result && result.chances.length > 0) {
                  record(moon.tier, usedChances(result).length / result.chances.length);
                }
                update(next);
              }}
            />
          )}
          {state.phase === 'dilema' && (
            <DilemmaPanel
              key={`${moon.id}-dilema`}
              dilemma={moon.dilemma}
              effectLabels={EFFECT_LABELS}
              continueLabel="Cerrar la luna"
              onDecide={(option) => {
                chosen.current = option.id;
                record(moon.tier, option.quality);
              }}
              onContinue={() => {
                if (!chosen.current) return;
                const next = resolveMoon(state, moon, chosen.current);
                chosen.current = null;
                update(next);
                const result = next.log.at(-1);
                if (result) onBrujula({ text: moonTip(result), source: 'local' });
              }}
            />
          )}
          {state.phase === 'cierre' && done && (
            <MoonClose
              key={`${moon.id}-cierre`}
              moon={moon}
              result={done}
              state={state}
              names={names}
              last={state.index + 1 === queue.length}
              onNext={() => {
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
                  setStage({ kind: 'informe', queue, state: next, result });
                } else {
                  update(next);
                }
              }}
            />
          )}
        </div>

        <aside
          aria-label="Estado de la huerta"
          className="grid content-start gap-4 border-t-[1.5px] border-ink pt-4 lg:border-t-0 lg:border-l-[1.5px] lg:pt-0 lg:pl-6"
        >
          <div>
            <p className="text-sm text-ink-soft">Familias que alimenta la huerta</p>
            <p className="font-display text-3xl font-extrabold tabular-nums">
              {state.familias}{' '}
              <span className="text-base font-bold text-ink-soft">de {content.goal}</span>
            </p>
          </div>
          <Meter
            label="Salud del suelo"
            value={state.suelo}
            valueText={`${String(Math.round(state.suelo))} de 100`}
            tone="low"
          />
          <Meter
            label="Participación"
            value={state.comunidad}
            valueText={`${String(Math.round(state.comunidad))} de 100`}
            tone={state.comunidad < 40 ? 'high' : 'ink'}
          />
          <h3 className="font-display text-lg font-extrabold">Energía de los grupos</h3>
          {content.groups.map((g) => {
            const left = energyLeft(state, g.id);
            const max = state.stamina[g.id] ?? 1;
            const forced = state.phase === 'reparto' && state.resting.includes(g.id);
            return (
              <Meter
                key={g.id}
                label={g.name}
                value={left}
                max={max}
                valueText={
                  forced
                    ? 'Agotado: descansa'
                    : `${String(left)} de ${String(max)} ${max === 1 ? 'luna' : 'lunas'}`
                }
                tone={left === 0 ? 'high' : 'low'}
              />
            );
          })}
        </aside>
      </div>
    </div>
  );
}

function moonTip(result: MoonResult): string {
  const works = Object.values(result.assignment).filter((c) => c !== REST).length;
  if (result.exhausted.length > 0)
    return 'Un grupo trabajó más allá de lo que aguantaba: rindió la mitad y la comunidad lo resintió. El descanso también se planea.';
  if (works === 0)
    return 'Nadie trabajó esta luna. Descansar está bien, pero la huerta necesita manos para dar frutos.';
  if (usedChances(result).length < result.chances.length)
    return 'Algún grupo podía trabajar en lo que mejor sabe hacer y quedó en otra tarea. Lee qué sabe cada uno antes de repartir.';
  return 'Cada grupo aportó desde lo que sabe hacer: así rinde el trabajo comunitario.';
}

function Assignment({
  moon,
  content,
  state,
  onAssign,
}: {
  moon: Moon;
  content: HuertaContent;
  state: HuertaState;
  onAssign: (assignment: Record<string, string>) => void;
}) {
  const [choices, setChoices] = useState<Record<string, string>>(() =>
    Object.fromEntries(state.resting.map((g) => [g, REST])),
  );
  const heading = useRef<HTMLHeadingElement>(null);
  const name = useId();
  useEffect(() => {
    heading.current?.focus();
  }, []);
  const ready = validAssignment(state, content, moon, choices);
  const options = [
    ...moon.tasks.map((t) => ({ id: t.id, label: t.label })),
    { id: REST, label: 'Descansar' },
  ];

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (ready) onAssign(choices);
      }}
    >
      <h2 ref={heading} tabIndex={-1} className="font-display text-xl font-extrabold outline-none">
        {moon.title}: ¿quién hace qué?
      </h2>
      <p className="mt-2">{moon.situation}</p>
      <h3 className="mt-4 font-display text-base font-bold">Tareas de esta luna</h3>
      <ul className="mt-2 grid gap-2">
        {moon.tasks.map((t) => (
          <li key={t.id} className="border-l-[3px] border-ink bg-plate-sunk px-4 py-2 text-sm">
            <span className="font-semibold">{t.label}.</span> {t.detail}
          </li>
        ))}
      </ul>

      <div className="mt-5 grid gap-3">
        {content.groups.map((g) => {
          const forced = state.resting.includes(g.id);
          const left = energyLeft(state, g.id);
          return (
            <fieldset key={g.id} className="border-[1.5px] border-plate-edge p-4">
              <legend className="px-1 font-display text-lg font-bold">{g.name}</legend>
              <p className="text-sm">{g.strength}</p>
              <p
                className={cx(
                  'mt-1 text-sm font-semibold',
                  forced || left === 0 ? 'text-route' : 'text-ink-soft',
                )}
              >
                {forced
                  ? 'Se agotó la luna pasada: esta luna descansa.'
                  : left === 0
                    ? 'Si trabaja esta luna, se agota.'
                    : `Puede trabajar ${String(left)} ${left === 1 ? 'luna más' : 'lunas más'} sin agotarse.`}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {options.map((option) => {
                  const on = choices[g.id] === option.id;
                  const blocked = forced && option.id !== REST;
                  return (
                    <label
                      key={option.id}
                      className={cx(
                        'inline-flex min-h-11 cursor-pointer items-center border-[1.5px] px-3 py-1.5 text-sm',
                        'has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-(--focus)',
                        on
                          ? 'border-ink bg-ink text-land-sun'
                          : 'border-plate-edge hover:border-ink',
                        blocked && 'cursor-not-allowed opacity-45 hover:border-plate-edge',
                      )}
                    >
                      <input
                        type="radio"
                        className="sr-only"
                        name={`${name}-${g.id}`}
                        checked={on}
                        disabled={blocked}
                        onChange={() => {
                          setChoices((c) => ({ ...c, [g.id]: option.id }));
                        }}
                      />
                      {option.label}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          );
        })}
      </div>
      <Button type="submit" size="lg" className="mt-5" disabled={!ready}>
        Repartir el trabajo
      </Button>
    </form>
  );
}

const signed = (value: number) => `${value >= 0 ? '+' : '−'}${String(Math.abs(value))}`;

function MoonClose({
  moon,
  result,
  state,
  names,
  last,
  onNext,
}: {
  moon: Moon;
  result: MoonResult;
  state: HuertaState;
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
    <section aria-labelledby="balance-luna">
      <h2
        id="balance-luna"
        ref={heading}
        tabIndex={-1}
        className="font-display text-xl font-extrabold outline-none"
      >
        Balance de la luna
      </h2>
      <dl className="mt-3 grid grid-cols-3 gap-4 border-y-[1.5px] border-ink py-4">
        {INDICATORS.map((key) => (
          <div key={key}>
            <dt className="text-sm text-ink-soft">{EFFECT_LABELS[key]}</dt>
            <dd className="font-display text-2xl font-extrabold tabular-nums">
              {signed(Math.round(state[key] - result.before[key]))}
            </dd>
          </div>
        ))}
      </dl>
      <ul className="mt-4 grid gap-2">
        {Object.entries(result.assignment).map(([group, choice]) => {
          const fit = result.fits.includes(group);
          const tired = result.exhausted.includes(group);
          return (
            <li
              key={group}
              className={cx(
                'border-l-[3px] bg-plate-sunk px-4 py-2 text-sm',
                tired ? 'border-land-high' : fit ? 'border-isle-latidosocial' : 'border-plate-edge',
              )}
            >
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
      <Button size="lg" className="mt-5" onClick={onNext}>
        {last ? 'Ver el balance de la temporada' : 'Siguiente luna'}
      </Button>
    </section>
  );
}

function HuertaReportView({
  content,
  queue,
  state,
  result,
  competency,
  back,
  onComplete,
  onRetry,
}: {
  content: HuertaContent;
  queue: Moon[];
  state: HuertaState;
  result: HuertaReport;
  competency: string;
  back: string;
  onComplete: () => void;
  onRetry: () => void;
}) {
  const moons = state.log.length;
  const solid = state.log.filter((m) => m.quality === 1).length;
  const [brujula] = useState(() => {
    const parts: string[] = [];
    if (result.familias >= content.goal)
      parts.push(
        'La huerta alimenta a las familias que se propuso: el trabajo de todos dio frutos.',
      );
    else
      parts.push(
        'La huerta no alcanzó a las familias de la meta. Revisa si cada grupo trabajó donde rendía más y si se cuidó el suelo.',
      );
    if (result.exhaustions > 0)
      parts.push(
        'Hubo grupos agotados: en un proyecto comunitario, el bienestar de quienes lo sostienen es parte del resultado.',
      );
    else parts.push('Nadie se agotó: planeaste el descanso como parte del trabajo.');
    if (result.criteria >= 0.75)
      parts.push('En los dilemas decidiste con la comunidad y con criterios claros.');
    else
      parts.push(
        'En los dilemas, busca la salida que incluya a la comunidad y cuide el territorio, no solo la cosecha.',
      );
    return {
      text: parts.join(' '),
      highlights: [
        `Familias alimentadas: ${String(result.familias)} de ${String(content.goal)}.`,
        `Veces que un grupo pudo trabajar en su saber y lo hizo: ${String(Math.round(result.accuracy * 100))} %.`,
        `Veces que un grupo se agotó: ${String(result.exhaustions)}.`,
        `Decisiones comunitarias sólidas: ${String(solid)} de ${String(moons)}.`,
        `Salud final del suelo: ${String(Math.round(state.suelo))} de 100. Participación final: ${String(Math.round(state.comunidad))} de 100.`,
      ],
    };
  });

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
        { label: 'Saberes aprovechados', value: `${String(Math.round(result.accuracy * 100))} %` },
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
      brujula={brujula}
      game="La huerta comunitaria"
      competency={competency}
      back={back}
      onComplete={onComplete}
      onRetry={onRetry}
    >
      <h3 className="mt-8 font-display text-lg font-bold">Bitácora de la huerta</h3>
      <table className="mt-2 w-full text-sm tabular-nums">
        <caption className="sr-only">
          Familias, suelo y participación al cierre de cada luna
        </caption>
        <thead>
          <tr className="border-b-[1.5px] border-ink text-left">
            <th scope="col" className="py-1 pr-2 font-semibold">
              Luna
            </th>
            {INDICATORS.map((key) => (
              <th key={key} scope="col" className="py-1 pr-2 text-right font-semibold">
                {EFFECT_LABELS[key]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {state.log.map((m, i) => {
            const after = state.log[i + 1]?.before ?? state;
            return (
              <tr key={m.moonId} className="border-b-[1px] border-plate-edge">
                <th scope="row" className="py-1 pr-2 text-left font-normal">
                  {i + 1}. {queue.find((q) => q.id === m.moonId)?.title}
                </th>
                {INDICATORS.map((key) => (
                  <td key={key} className="py-1 pr-2 text-right">
                    {signed(Math.round(after[key] - m.before[key]))}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </GameReport>
  );
}
