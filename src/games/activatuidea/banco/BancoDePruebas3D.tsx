import { useThree } from '@react-three/fiber';
import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from 'react';
import { useReducedMotion } from '@/a11y/useReducedMotion';
import { minigameLevel } from '@/ai/adaptiveEngine';
import type { BancoContent, FeedbackKind } from '@/data/contentSchemas';
import {
  bancoPlan,
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
} from '@/minigames/banco-de-pruebas/engine';
import { GameBriefing } from '@/minigames/shared/GameBriefing';
import { GameReport } from '@/minigames/shared/GameReport';
import type { MinigameProps } from '@/minigames/shared/types';
import { useProgress } from '@/progress/store';
import { useMastery } from '@/stations/useMastery';
import { cx } from '@/ui/cx';
import { ATLAS } from '@/world/palette';
import { Controls } from '../../shared/controls';
import { GameStage } from '../../shared/GameStage';
import { Banner, HudMeter, HudPanel } from '../../shared/hud';
import { ArenaLights } from '../../shared/scene/ArenaScenery';
import { Button } from '@/ui/Button';
import { TextLabel } from '../labels';
import { partKind, personLook } from './model';
import {
  allClassified,
  askersOf,
  BASKETS,
  buildMessage,
  buildScore,
  canAdd,
  cycle,
  KIND_LABEL,
  listenMessage,
  listenScore,
  nextPending,
  reportView,
  reviewNotes,
  sendToBasket,
  togglePick,
  type Answers,
} from './session';
import { BASKET_COLOR, personSpots } from './sceneData';
import { Baskets, Coins, Person, Prototype, Rain, Shelf, Workshop } from './TallerScene';

const TALLER_HELP = [
  { keys: '↑ ↓', action: 'Elegir el comentario o la pieza' },
  { keys: '1 a 3', action: 'Mandar el comentario a una canasta' },
  { keys: '1 a 4', action: 'Poner o quitar una pieza del estante' },
  { keys: 'Tab y Enter', action: 'Recorrer y pulsar los botones del banco' },
  { keys: 'Esc o P', action: 'Pausa' },
];

type Stage =
  | { kind: 'briefing' }
  | { kind: 'taller'; queue: BancoRound[]; state: BancoState }
  | { kind: 'informe'; state: BancoState; result: BancoReport };

/**
 * Banco de pruebas en 3D (ActivaTuIdea): el taller con el prototipo en un
 * banco giratorio. Quienes lo prueban hablan, los comentarios se mandan a
 * canastas, las mejoras se eligen del estante con los materiales a la vista y
 * la prueba de agua se ve. Mismo motor, mismas métricas y mismo informe que la
 * versión accesible (src/minigames/banco-de-pruebas).
 */
export function BancoDePruebas3D({
  content,
  island,
  onBrujula,
  onEvents,
  onComplete,
  onFail,
}: MinigameProps<BancoContent>) {
  const { mastery, record } = useMastery(island.id);
  const recordMinigame = useProgress((s) => s.recordMinigame);
  const [level] = useState(() => minigameLevel(mastery));
  const plan = bancoPlan(level);
  const [stage, setStage] = useState<Stage>({ kind: 'briefing' });
  const [run, setRun] = useState(0);

  const begin = () => {
    const queue = selectRounds(content.rounds, plan, Math.random);
    onBrujula(null);
    setRun((n) => n + 1);
    setStage({ kind: 'taller', queue, state: startBanco(content, queue, plan) });
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
          'Quienes lo prueban hablan: manda cada comentario a una canasta (se repite, caso aislado o fuera del problema).',
          'Con los materiales de la bandeja, elige hasta dos mejoras del estante. Luego mira la prueba de agua: cuenta la satisfacción de quienes tienen el problema.',
        ]}
        beginLabel="Abrir el taller"
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
    const view = reportView(content, stage.state, stage.result);
    return (
      <GameReport
        title={view.title}
        score={stage.result.score}
        figures={view.figures}
        criteria={view.criteria}
        brujula={view.brujula}
        game="Banco de pruebas"
        competency={island.competency}
        back={`/mundo/${island.id}?estacion=activatuidea-taller`}
        onComplete={() => {
          onComplete(stage.result.score);
        }}
        onRetry={begin}
      >
        <h3 className="mt-8 font-display text-lg font-bold">Lo que construiste</h3>
        {stage.state.built.length === 0 ? (
          <p className="mt-2 text-ink-soft">El prototipo no cambió en toda la temporada.</p>
        ) : (
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            {stage.state.built.map((b) => (
              <li key={b.changeId}>{b.part}</li>
            ))}
          </ol>
        )}
      </GameReport>
    );
  }

  return (
    <TallerGame
      key={run}
      content={content}
      queue={stage.queue}
      initial={stage.state}
      onListen={(round, answers) => {
        record(round.tier, listenScore(round, answers));
        onBrujula({ text: listenMessage(round, answers), source: 'local' });
      }}
      onBuild={(round, ids) => {
        record(round.tier, buildScore(round, ids));
        onBrujula({ text: buildMessage(round, ids), source: 'local' });
      }}
      onFinish={(state) => {
        onBrujula(null);
        const result = report(state, content);
        onEvents(
          recordMinigame('banco-de-pruebas', {
            accuracy: result.accuracy,
            criteria: result.criteria,
            toolsUsed: result.toolsUsed,
          }),
        );
        if (result.score < 0.6) onFail(result.score);
        setStage({ kind: 'informe', state, result });
      }}
    />
  );
}

/** Encuadra el banco y las personas según el ancho disponible. */
function CameraAim() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  useEffect(() => {
    const distance = Math.min(30, Math.max(10, 19.5 / (size.width / size.height)));
    camera.position.set(0, distance * 0.55, distance);
    // El banco queda en la franja libre entre la franja de arriba y el panel de abajo.
    camera.lookAt(0, 0.5, 0.8);
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height]);
  return null;
}

function TallerGame({
  content,
  queue,
  initial,
  onListen,
  onBuild,
  onFinish,
}: {
  content: BancoContent;
  queue: BancoRound[];
  initial: BancoState;
  onListen: (round: BancoRound, answers: Answers) => void;
  onBuild: (round: BancoRound, ids: string[]) => void;
  onFinish: (state: BancoState) => void;
}) {
  const still = useReducedMotion();
  const [controls] = useState(() => new Controls());
  const [state, setState] = useState(initial);
  const [answers, setAnswers] = useState<Answers>({});
  const [picks, setPicks] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [announce, setAnnounce] = useState('');
  const [banner, setBanner] = useState<{ text: string; at: number } | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  const round = queue.find((r) => r.id === currentRoundId(state));
  if (!round) throw new Error('Ronda de prueba inexistente.');
  const names = Object.fromEntries(content.users.map((u) => [u.id, u.name]));
  const total = initial.budget;
  const spots = personSpots(content.users.length);
  const current = round.feedback.find((f) => f.id === (selected ?? round.feedback[0]?.id));

  // Al cambiar de momento, el foco va al encabezado del panel.
  const moment = `${state.phase}-${String(state.index)}`;
  useEffect(() => {
    heading.current?.focus();
  }, [moment]);

  const say = (text: string) => {
    setBanner({ text, at: performance.now() });
  };

  const send = (feedbackId: string, kind: FeedbackKind) => {
    if (state.phase !== 'escuchar') return;
    const next = sendToBasket(answers, feedbackId, kind);
    setAnswers(next);
    const f = round.feedback.find((x) => x.id === feedbackId);
    setAnnounce(
      `${f ? (names[f.userId] ?? '') : ''}: ${KIND_LABEL[kind]}. ${String(Object.keys(next).length)} de ${String(round.feedback.length)} clasificados.`,
    );
    const pending = nextPending(round, next, feedbackId);
    if (pending) setSelected(pending);
  };

  const finishListening = () => {
    if (!allClassified(round, answers)) return;
    const next = classify(state, round, answers);
    onListen(round, answers);
    setState(next);
    setAnnounce('Notas guardadas. Elige hasta dos mejoras del estante.');
  };

  const toggle = (changeId: string) => {
    if (state.phase !== 'iterar') return;
    const next = togglePick(state, round, picks, changeId);
    setPicks(next);
    const change = round.changes.find((c) => c.id === changeId);
    setAnnounce(
      `${change?.label ?? 'Pieza'}: ${next.includes(changeId) ? 'elegida' : 'sin elegir'}. Materiales: ${String(costOf(round, next))} de ${String(state.budget)}.`,
    );
  };

  const build = () => {
    if (state.phase !== 'iterar') return;
    const next = iterate(state, round, picks);
    onBuild(round, picks);
    setState(next);
    say('Prueba de agua');
    setAnnounce('Se construyó el prototipo y se puso a prueba bajo el agua.');
  };

  const advance = () => {
    const next = nextRound(state);
    if (isFinished(next)) {
      onFinish(next);
      return;
    }
    const following = queue.find((r) => r.id === currentRoundId(next));
    setState(next);
    setAnswers({});
    setPicks([]);
    setSelected(following?.feedback[0]?.id ?? null);
    setAnnounce(
      `Prueba ${String(next.index + 1)} de ${String(queue.length)}: ${following?.title ?? ''}. Quienes probaron el prototipo comentan.`,
    );
  };

  const onKey = useEffectEvent((event: KeyboardEvent) => {
    if (paused || event.altKey || event.ctrlKey || event.metaKey) return;
    if (state.phase === 'escuchar') {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const from = current?.id ?? round.feedback[0]?.id;
        if (from) setSelected(cycle(round, from, event.key === 'ArrowDown' ? 1 : -1));
        return;
      }
      const kind = BASKETS[['1', '2', '3'].indexOf(event.key)];
      if (kind && current) {
        event.preventDefault();
        send(current.id, kind);
      }
    } else if (state.phase === 'iterar') {
      const change = round.changes[['1', '2', '3', '4', '5'].indexOf(event.key)];
      if (change) {
        event.preventDefault();
        toggle(change.id);
      }
    }
  });
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      onKey(event);
    };
    document.addEventListener('keydown', listener);
    return () => {
      document.removeEventListener('keydown', listener);
    };
  }, []);

  const speakerId = state.phase === 'escuchar' ? current?.userId : undefined;
  const cost = costOf(round, picks);
  const avg = Math.round(targetSatisfaction(state, content));
  const notesByUser = new Map(round.feedback.map((f) => [f.userId, f.id]));
  const ghostKinds = picks.flatMap((id) => {
    const c = round.changes.find((x) => x.id === id);
    return c ? [partKind(c.id)] : [];
  });

  return (
    <GameStage
      label="Banco de pruebas de ActivaTuIdea"
      controls={controls}
      camera={{ fov: 42, position: [0, 4.9, 9.8], near: 0.5, far: 80 }}
      paused={paused}
      onPause={setPaused}
      help={TALLER_HELP}
      announce={announce}
      touch={false}
      hud={
        <>
          <div className="absolute top-3 right-44 left-3 max-sm:top-14 max-sm:right-3 sm:right-72">
            <HudPanel className="flex flex-wrap items-center gap-x-6 gap-y-1 py-2">
              <p className="toponym text-[0.625rem] text-sea-100">
                Prueba {state.index + 1} de {queue.length} · {round.title}
              </p>
              <p
                className="font-display text-lg font-extrabold text-land-sun tabular-nums"
                aria-label={`Materiales disponibles: ${String(state.budget)}`}
              >
                <span className="mr-2 text-xs font-semibold text-sea-100">Materiales</span>
                {state.budget}
                {state.phase === 'iterar' && cost > 0 && (
                  <span className="ml-2 text-sm font-bold text-plate">− {cost}</span>
                )}
              </p>
              <HudMeter
                className="min-w-44 flex-1"
                label="Satisfacción de quienes tienen el problema"
                value={avg / 100}
                text={`${String(avg)} % · meta ${String(content.goal)} %`}
              />
            </HudPanel>
          </div>
          {banner && <Banner text={banner.text} at={banner.at} />}
          <div
            className={cx(
              'pointer-events-auto absolute inset-x-3 bottom-3 max-h-[46%] overflow-y-auto bg-plate p-3 text-ink [--focus:var(--route)] plate-rule',
            )}
          >
            {state.phase === 'escuchar' && (
              <ListenPanel
                heading={heading}
                round={round}
                names={names}
                answers={answers}
                selected={current?.id ?? null}
                onSelect={setSelected}
                onSend={send}
                onDone={finishListening}
              />
            )}
            {state.phase === 'iterar' && (
              <BuildPanel
                heading={heading}
                round={round}
                state={state}
                names={names}
                picks={picks}
                cost={cost}
                onToggle={toggle}
                onBuild={build}
              />
            )}
            {state.phase === 'probar' && (
              <TestPanel
                heading={heading}
                state={state}
                names={names}
                last={state.index + 1 === queue.length}
                onNext={advance}
              />
            )}
          </div>
        </>
      }
    >
      <ArenaLights />
      <CameraAim />
      <Workshop />
      <Prototype
        built={state.built.map((b) => partKind(b.changeId))}
        ghost={state.phase === 'iterar' ? ghostKinds : []}
        still={still}
        wet={state.phase === 'probar'}
      />
      <Rain active={state.phase === 'probar'} still={still} />
      <Baskets highlight={current ? (answers[current.id] ?? null) : null} />
      <Coins budget={state.budget} total={total} preview={state.phase === 'iterar' ? cost : 0} />
      {state.phase === 'iterar' && (
        <Shelf
          still={still}
          items={round.changes.map((c) => ({
            id: c.id,
            kind: partKind(c.id),
            picked: picks.includes(c.id),
          }))}
        />
      )}
      {content.users.map((u, i) => {
        const look = personLook(u.id, i);
        const fid = notesByUser.get(u.id);
        const said = fid ? round.feedback.find((f) => f.id === fid) : undefined;
        const mine = fid ? answers[fid] : undefined;
        const delta = state.last[u.id] ?? 0;
        const mood = state.phase === 'probar' ? (delta > 0 ? 1 : delta < 0 ? -1 : 0) : 0;
        const spot = spots[i] ?? [0, -3];
        return (
          <Person
            key={u.id}
            look={look}
            spot={spot}
            speaking={speakerId === u.id}
            mood={mood}
            still={still}
          >
            {state.phase === 'escuchar' && speakerId === u.id && said && (
              <TextLabel
                position={[0, 1.65, 0]}
                anchor={-1}
                title={u.name}
                text={`«${said.quote}»`}
                bg={ATLAS.plate}
                fg={ATLAS.ink}
                font={28}
                wrap={330}
              />
            )}
            {state.phase === 'escuchar' && speakerId !== u.id && mine && (
              <TextLabel
                position={[0, 1.7, 0]}
                anchor={-1}
                text={KIND_LABEL[mine]}
                bg={BASKET_COLOR[mine]}
                fg={ATLAS.ink}
                font={22}
                bold
                wrap={500}
              />
            )}
            {state.phase === 'probar' && delta !== 0 && (
              <TextLabel
                position={[0, 1.8, 0]}
                anchor={-1}
                text={`${delta > 0 ? '+' : '−'}${String(Math.abs(delta))}`}
                bg={delta > 0 ? ATLAS.sun : ATLAS.route}
                fg={delta > 0 ? ATLAS.ink : ATLAS.plate}
                font={30}
                bold
                wrap={200}
              />
            )}
            <mesh position={[0, 0.02, 0]} rotation-x={-Math.PI / 2}>
              <ringGeometry args={[0.5, 0.58, 16]} />
              <meshBasicMaterial color={u.target ? ATLAS.sun : ATLAS.sea[1]} />
            </mesh>
          </Person>
        );
      })}
    </GameStage>
  );
}

function PanelHeading({
  heading,
  children,
}: {
  heading: React.RefObject<HTMLHeadingElement | null>;
  children: ReactNode;
}) {
  return (
    <h2 ref={heading} tabIndex={-1} className="font-display text-lg font-extrabold outline-none">
      {children}
    </h2>
  );
}

function ListenPanel({
  heading,
  round,
  names,
  answers,
  selected,
  onSelect,
  onSend,
  onDone,
}: {
  heading: React.RefObject<HTMLHeadingElement | null>;
  round: BancoRound;
  names: Record<string, string>;
  answers: Answers;
  selected: string | null;
  onSelect: (id: string) => void;
  onSend: (id: string, kind: FeedbackKind) => void;
  onDone: () => void;
}) {
  const done = allClassified(round, answers);
  return (
    <section aria-label="Comentarios de la prueba">
      <PanelHeading heading={heading}>Lo que dijeron en la prueba</PanelHeading>
      <p className="mt-1 text-xs text-ink-soft">
        Elige un comentario (↑ ↓) y mándalo a una canasta con 1, 2 o 3.
      </p>
      <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
        {round.feedback.map((f) => {
          const mine = answers[f.id];
          const on = f.id === selected;
          return (
            <li
              key={f.id}
              className={cx(
                'border-[1.5px] p-3',
                on ? 'border-ink bg-plate-sunk' : 'border-plate-edge',
              )}
            >
              <button
                type="button"
                aria-current={on ? 'true' : undefined}
                onClick={() => {
                  onSelect(f.id);
                }}
                className="block w-full text-left"
              >
                <span className="text-xs font-semibold text-ink-soft">{names[f.userId]}</span>
                <span className="block text-sm">«{f.quote}»</span>
              </button>
              <div
                role="group"
                aria-label={`Canasta de ${names[f.userId] ?? ''}`}
                className="mt-2 flex flex-wrap gap-1.5"
              >
                {BASKETS.map((kind, i) => (
                  <button
                    key={kind}
                    type="button"
                    aria-pressed={mine === kind}
                    aria-keyshortcuts={on ? String(i + 1) : undefined}
                    onClick={() => {
                      onSelect(f.id);
                      onSend(f.id, kind);
                    }}
                    className={cx(
                      'inline-flex min-h-9 items-center gap-1.5 border-[1.5px] px-2 text-xs',
                      mine === kind
                        ? 'border-ink bg-ink text-land-sun'
                        : 'border-plate-edge hover:border-ink',
                    )}
                  >
                    <kbd aria-hidden="true" className="font-display font-bold">
                      {i + 1}
                    </kbd>
                    {KIND_LABEL[kind]}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
      <Button size="lg" className="mt-3" disabled={!done} onClick={onDone}>
        Guardar mis notas
      </Button>
    </section>
  );
}

function BuildPanel({
  heading,
  round,
  state,
  names,
  picks,
  cost,
  onToggle,
  onBuild,
}: {
  heading: React.RefObject<HTMLHeadingElement | null>;
  round: BancoRound;
  state: BancoState;
  names: Record<string, string>;
  picks: string[];
  cost: number;
  onToggle: (id: string) => void;
  onBuild: () => void;
}) {
  const notes = reviewNotes(round, state.notes);
  const right = notes.filter((n) => n.right).length;
  return (
    <section aria-label="Estante de mejoras">
      <PanelHeading heading={heading}>Tus notas, revisadas</PanelHeading>
      <p className="mt-1 text-sm">
        Acertaste {right} de {notes.length}.
      </p>
      <ul className="mt-1 grid gap-1">
        {notes
          .filter((n) => !n.right)
          .map((n) => (
            <li
              key={n.id}
              className={cx(
                'border-l-[3px] bg-plate-sunk px-3 py-1.5 text-xs',
                n.right ? 'border-isle-latidosocial' : 'border-land-high',
              )}
            >
              <span className="font-semibold">{names[n.userId]}:</span>{' '}
              {`anotaste «${n.mine ? KIND_LABEL[n.mine] : '—'}»; era «${KIND_LABEL[n.kind]}». ${n.why}`}
            </li>
          ))}
      </ul>
      <h3 className="mt-2 font-display text-base font-extrabold">
        Estante: hasta {MAX_CHANGES}{' '}
        <span className="text-xs font-normal text-ink-soft tabular-nums">
          · materiales {cost} de {state.budget}
        </span>
      </h3>
      <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
        {round.changes.map((change, i) => {
          const on = picks.includes(change.id);
          const blocked = !on && !canAdd(state, round, picks, change.id);
          const askers = askersOf(round, change, names);
          return (
            <li key={change.id}>
              <button
                type="button"
                aria-pressed={on}
                aria-keyshortcuts={String(i + 1)}
                disabled={blocked}
                onClick={() => {
                  onToggle(change.id);
                }}
                className={cx(
                  'flex min-h-11 w-full items-start gap-2 border-[1.5px] px-3 py-2 text-left text-sm',
                  on ? 'border-ink bg-plate-sunk' : 'border-plate-edge hover:border-ink',
                  blocked && 'cursor-not-allowed opacity-45',
                )}
              >
                <kbd
                  aria-hidden="true"
                  className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center border-[1.5px] border-ink font-display text-xs font-bold"
                >
                  {i + 1}
                </kbd>
                <span className="flex-1">
                  <span className="font-semibold">{change.label}</span>
                  <span className="block text-xs text-ink-soft">
                    {askers.length > 0
                      ? `Responde a: ${askers.join(', ')}`
                      : 'No responde a ningún comentario'}
                    {blocked && ' · No alcanzan los materiales o ya hay dos piezas'}
                  </span>
                </span>
                <span className="text-xs font-semibold whitespace-nowrap tabular-nums">
                  {change.cost} mat.
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <Button size="lg" className="mt-3" onClick={onBuild}>
        {picks.length === 0 ? 'Probar sin cambios' : 'Construir y probar con agua'}
      </Button>
    </section>
  );
}

function TestPanel({
  heading,
  state,
  names,
  last,
  onNext,
}: {
  heading: React.RefObject<HTMLHeadingElement | null>;
  state: BancoState;
  names: Record<string, string>;
  last: boolean;
  onNext: () => void;
}) {
  const changes = Object.entries(state.last).filter(([, delta]) => delta !== 0);
  return (
    <section aria-label="Resultado de la prueba de agua">
      <PanelHeading heading={heading}>Así reaccionaron</PanelHeading>
      {changes.length === 0 ? (
        <p className="mt-2 text-sm">Nadie notó una diferencia con la versión anterior.</p>
      ) : (
        <ul className="mt-2 grid gap-1.5">
          {changes.map(([user, delta]) => (
            <li
              key={user}
              className={cx(
                'border-l-[3px] bg-plate-sunk px-3 py-1.5 text-sm',
                delta > 0 ? 'border-isle-latidosocial' : 'border-land-high',
              )}
            >
              <span className="font-semibold">{names[user]}</span>: satisfacción{' '}
              {delta > 0 ? '+' : '−'}
              {Math.abs(delta)} puntos
            </li>
          ))}
        </ul>
      )}
      <Button size="lg" className="mt-3" onClick={onNext}>
        {last ? 'Ver el informe del taller' : 'Siguiente prueba'}
      </Button>
    </section>
  );
}
