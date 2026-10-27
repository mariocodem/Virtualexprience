import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { useReducedMotion } from '@/a11y/useReducedMotion';
import { minigameLevel } from '@/ai/adaptiveEngine';
import type { Bridge, PuentesContent } from '@/data/contentSchemas';
import {
  bridgePlan,
  currentBridgeId,
  isFinished,
  nextBridge,
  report,
  selectBridges,
  solutions,
  startBridges,
  testBridge,
  type BridgeReport,
  type BridgeState,
} from '@/minigames/puentes-de-fractal/engine';
import { GameBriefing } from '@/minigames/shared/GameBriefing';
import type { MinigameProps } from '@/minigames/shared/types';
import { useProgress } from '@/progress/store';
import { useMastery } from '@/stations/useMastery';
import { Button } from '@/ui/Button';
import { cx } from '@/ui/cx';
import { Controls } from '../shared/controls';
import { GameStage } from '../shared/GameStage';
import { Banner, HudPanel, KeyHint } from '../shared/hud';
import type { ControlHelp } from '../shared/stage';
import { CanyonScene, type CanyonRun } from './CanyonScene';
import { ArenaLights } from '../shared/scene/ArenaScenery';
import { moveTarget, pieceForKey, pressPiece, removeAt, withSelection } from './workbench';
import { CONCEPT_LABEL } from './concepts';
import { BridgesReport } from './retoReport';

const HELP: ControlHelp[] = [
  { keys: '1 a 9', action: 'Poner o quitar la pieza del estante' },
  { keys: '← → o A D', action: 'Elegir la ranura del puente' },
  { keys: 'Retroceso o X', action: 'Quitar el tramo de la ranura elegida' },
  { keys: 'T o Enter', action: 'Probar con la vagoneta (o pasar al siguiente puente)' },
  { keys: 'Clic', action: 'En una pieza del estante o en un tramo del puente' },
  { keys: 'Esc o P', action: 'Pausa' },
];

type Stage =
  | { kind: 'briefing' }
  | { kind: 'obra'; queue: Bridge[]; state: BridgeState }
  | { kind: 'informe'; result: BridgeReport };

/**
 * Puentes de Fractal en 3D: un cañón entre acantilados geométricos. Las
 * piezas esperan en el estante rotuladas con su expresión; se encajan en las
 * ranuras del puente y la vagoneta lo pone a prueba. Mismo motor, mismas
 * métricas y mismos mensajes de Brújula que la versión accesible.
 */
export function PuentesReto({
  content,
  island,
  onBrujula,
  onEvents,
  onComplete,
  onFail,
}: MinigameProps<PuentesContent>) {
  const { mastery, record } = useMastery(island.id);
  const recordMinigame = useProgress((s) => s.recordMinigame);
  const [level] = useState(() => minigameLevel(mastery));
  const plan = bridgePlan(level);
  const [stage, setStage] = useState<Stage>({ kind: 'briefing' });

  const begin = () => {
    const queue = selectBridges(content.bridges, plan, Math.random);
    onBrujula(null);
    setStage({ kind: 'obra', queue, state: startBridges(queue, plan) });
  };

  const finish = (state: BridgeState) => {
    const result = report(state, content.bridges);
    onEvents(
      recordMinigame('puentes-de-fractal', {
        accuracy: result.accuracy,
        criteria: result.criteria,
        toolsUsed: result.toolsUsed,
      }),
    );
    if (result.score < 0.6) onFail(result.score);
    onBrujula(null);
    setStage({ kind: 'informe', result });
  };

  if (stage.kind === 'briefing') {
    return (
      <GameBriefing
        intro={content.intro}
        level={level}
        figures={[
          { label: 'Puentes', value: String(plan.count) },
          { label: 'Cargas por puente', value: String(plan.tests) },
          {
            label: 'Conceptos',
            value: String(new Set(content.bridges.map((b) => b.concept)).size),
          },
          { label: 'Tolerancia', value: '0 cm' },
        ]}
        rules={[
          'Cada hueco tiene un largo y un número de apoyos. Elige tramos del estante hasta cubrirlo exactamente.',
          'Los tramos se dibujan a escala: estima con el dibujo, pero calcula antes de probar. Algunas piezas difieren por centímetros.',
          'La vagoneta cruza el puente: si la suma no da, el puente se arquea o queda corto y se derrumba. Si se acaban las cargas de prueba, el puente cae.',
          'Se evalúan los puentes que resisten y los que resuelves en la primera prueba.',
        ]}
        beginLabel="Entrar al cañón"
        onBegin={begin}
      />
    );
  }

  if (stage.kind === 'informe') {
    return (
      <BridgesReport
        result={stage.result}
        competency={island.competency}
        back={`/mundo/${island.id}?estacion=neuromath-puentes`}
        onComplete={() => {
          onComplete(stage.result.score);
        }}
        onRetry={begin}
      />
    );
  }

  const { queue, state } = stage;
  const bridge = queue.find((b) => b.id === currentBridgeId(state));
  if (!bridge) return null;

  return (
    <Canyon
      key={bridge.id}
      bridge={bridge}
      number={state.index + 1}
      total={queue.length}
      state={state}
      onChange={(next) => {
        setStage({ kind: 'obra', queue, state: next });
      }}
      onTest={() => {
        const next = testBridge(state, bridge);
        setStage({ kind: 'obra', queue, state: next });
        return next;
      }}
      onVerdict={(next) => {
        const outcome = next.last?.outcome;
        if (outcome === 'resiste') {
          onBrujula({
            text:
              next.testsLeft === next.tests
                ? 'Resistió a la primera: calculaste antes de probar.'
                : 'Resistió. La próxima vez, calcula cada pieza antes de cargar la vagoneta.',
            source: 'local',
          });
        } else if (outcome) {
          onBrujula({ text: content.hints[bridge.concept], source: 'local' });
        }
        if (next.settled) {
          const result = next.results.at(-1);
          record(bridge.tier, result?.solved ? (result.tries === 1 ? 1 : 0.6) : 0);
        }
      }}
      onNext={() => {
        const next = nextBridge(state);
        onBrujula(null);
        if (isFinished(next)) finish(next);
        else setStage({ kind: 'obra', queue, state: next });
      }}
    />
  );
}

const OUTCOME_TEXT = {
  resiste: 'La vagoneta cruzó: el puente resiste y se ilumina.',
  corto: 'Quedó corto: la vagoneta llegó al último tramo y cayó al agua.',
  largo: 'No encaja: los tramos suman más que el hueco y el puente se arquea y cae.',
} as const;

interface RunState extends CanyonRun {
  /** Estado del motor tras la prueba: lo que se anuncia al terminar la animación. */
  after: BridgeState;
}

function Canyon({
  bridge,
  number,
  total,
  state,
  onChange,
  onTest,
  onVerdict,
  onNext,
}: {
  bridge: Bridge;
  number: number;
  total: number;
  state: BridgeState;
  onChange: (state: BridgeState) => void;
  onTest: () => BridgeState;
  onVerdict: (state: BridgeState) => void;
  onNext: () => void;
}) {
  const still = useReducedMotion();
  const [controls] = useState(() => new Controls());
  const [paused, setPaused] = useState(false);
  const [target, setTarget] = useState(0);
  const [run, setRun] = useState<RunState | null>(null);
  const [doneSerial, setDoneSerial] = useState(0);
  const [announce, setAnnounce] = useState(
    `Puente ${String(number)} de ${String(total)}. ${bridge.prompt}`,
  );
  const [banner, setBanner] = useState<{ text: string; at: number } | null>(null);
  const proceed = useRef<HTMLButtonElement>(null);

  const running = run !== null && run.serial !== doneSerial;
  const verdictIn = run !== null && run.serial === doneSerial;
  const locked = running || state.settled;
  const full = state.selected.length >= bridge.slots;
  const result = state.settled ? state.results.at(-1) : undefined;
  const solution = solutions(bridge)[0] ?? [];
  const labelOf = (id: string) => bridge.pieces.find((p) => p.id === id)?.label ?? '';

  useEffect(() => {
    if (state.settled && verdictIn) proceed.current?.focus();
  }, [state.settled, verdictIn]);

  const press = (pieceId: string) => {
    if (locked) return;
    const placement = pressPiece(state.selected, bridge.slots, target, pieceId);
    if (placement.selected.join() === state.selected.join()) {
      setAnnounce('No quedan apoyos libres: quita un tramo antes.');
      return;
    }
    setTarget(placement.target);
    setRun(null);
    onChange(withSelection(state, bridge, placement.selected));
    setAnnounce(
      placement.selected.includes(pieceId)
        ? `${labelOf(pieceId)} encaja en el tramo ${String(placement.selected.indexOf(pieceId) + 1)}. Tramos: ${String(placement.selected.length)} de ${String(bridge.slots)}.`
        : `${labelOf(pieceId)} vuelve al estante. Tramos: ${String(placement.selected.length)} de ${String(bridge.slots)}.`,
    );
  };

  const aim = (slot: number) => {
    if (locked) return;
    const next = moveTarget(0, slot, state.selected, bridge.slots);
    setTarget(next);
    setAnnounce(`Ranura ${String(next + 1)} elegida.`);
  };

  const remove = () => {
    if (locked) return;
    const placement = removeAt(state.selected, bridge.slots, target);
    if (placement.selected.length === state.selected.length) return;
    setTarget(placement.target);
    setRun(null);
    onChange(withSelection(state, bridge, placement.selected));
    setAnnounce(`Quitaste el tramo ${String(target + 1)}.`);
  };

  const clear = () => {
    if (locked || state.selected.length === 0) return;
    setTarget(0);
    setRun(null);
    onChange(withSelection(state, bridge, []));
    setAnnounce('Retiraste todos los tramos.');
  };

  const test = () => {
    if (locked || state.selected.length === 0 || state.testsLeft <= 0) return;
    const after = onTest();
    const last = after.last;
    if (!last) return;
    setRun({ serial: last.serial, outcome: last.outcome, total: last.total, after });
    setAnnounce('La vagoneta sale hacia el puente…');
  };

  const arrived = (serial: number) => {
    if (run?.serial !== serial) return;
    setDoneSerial(serial);
    const { after, outcome } = run;
    setBanner({ text: OUTCOME_TEXT[outcome], at: performance.now() });
    const left =
      outcome !== 'resiste' && !after.settled
        ? ` Te quedan ${String(after.testsLeft)} ${after.testsLeft === 1 ? 'carga' : 'cargas'} de prueba.`
        : '';
    setAnnounce(
      `${OUTCOME_TEXT[outcome]}${left}${after.settled && outcome !== 'resiste' ? ' Sin cargas de prueba: el puente se derrumba.' : ''}`,
    );
    onVerdict(after);
    // Con cargas por gastar, el puente se rearma para otro intento.
    if (outcome !== 'resiste' && !after.settled) setRun(null);
  };

  const onKey = useEffectEvent((event: KeyboardEvent) => {
    if (paused || event.altKey || event.ctrlKey || event.metaKey) return;
    const active = document.activeElement;
    if (!(active instanceof HTMLElement) || !active.closest('[data-neuromath-reto]')) return;
    const onButton = active instanceof HTMLButtonElement;
    const pieceId = pieceForKey(bridge, event.key);
    if (pieceId) {
      event.preventDefault();
      press(pieceId);
    } else if (event.code === 'ArrowLeft' || event.code === 'KeyA') {
      aim(target - 1);
    } else if (event.code === 'ArrowRight' || event.code === 'KeyD') {
      aim(target + 1);
    } else if (event.code === 'Backspace' || event.code === 'Delete' || event.code === 'KeyX') {
      event.preventDefault();
      remove();
    } else if (event.code === 'KeyT' || (event.code === 'Enter' && !onButton)) {
      event.preventDefault();
      if (state.settled && verdictIn) onNext();
      else test();
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

  return (
    <div data-neuromath-reto="" className="grid">
      <GameStage
        label={`Puentes de Fractal: puente ${String(number)} de ${String(total)}`}
        controls={controls}
        paused={paused}
        onPause={setPaused}
        help={HELP}
        announce={announce}
        touch={false}
        camera={{ fov: 42, position: [0, 8, 21], near: 0.5, far: 200 }}
        hud={
          <>
            <div className="absolute top-3 left-3 grid w-[min(21rem,calc(100%-6rem))] gap-2 sm:w-[min(21rem,50%)]">
              <HudPanel className="grid gap-1.5">
                <p className="toponym text-[0.625rem] text-sea-100">
                  Puente {number} de {total} · {CONCEPT_LABEL[bridge.concept]}
                </p>
                <p className="font-display text-base leading-snug font-extrabold text-plate">
                  {bridge.prompt}
                </p>
                <p className="flex items-center gap-2 text-xs">
                  <span className="font-semibold">Cargas de prueba</span>
                  <span aria-hidden="true" className="flex gap-1">
                    {Array.from({ length: state.tests }, (_, i) => (
                      <span
                        key={i}
                        className={cx(
                          'inline-block h-3.5 w-3 border-[1.5px] border-sea-100',
                          i < state.testsLeft && 'bg-land-sun',
                        )}
                      />
                    ))}
                  </span>
                  <span className="sr-only">
                    {state.testsLeft} de {state.tests}
                  </span>
                </p>
              </HudPanel>
            </div>
            {banner && <Banner text={banner.text} at={banner.at} />}
            <div className="absolute inset-x-3 bottom-3 flex flex-col items-start gap-2 sm:bottom-4 sm:left-4">
              {state.settled && verdictIn ? (
                <HudPanel className="pointer-events-auto grid w-full max-w-2xl gap-2 text-sm">
                  {!result?.solved && (
                    <p>
                      <span className="font-semibold">Una combinación que resiste: </span>
                      {solution.map((id) => labelOf(id)).join(' + ')}.
                    </p>
                  )}
                  <p>{bridge.explanation}</p>
                  <div>
                    <Button ref={proceed} size="lg" onClick={onNext}>
                      {number === total ? 'Ver el informe del cañón' : 'Siguiente puente'}
                    </Button>
                  </div>
                </HudPanel>
              ) : (
                <HudPanel className="pointer-events-auto w-full max-w-2xl">
                  <p className="text-xs text-sea-100">
                    Tramos: {state.selected.length} de {bridge.slots} · ranura elegida:{' '}
                    {Math.min(target, bridge.slots - 1) + 1}
                  </p>
                  <ul className="mt-1.5 flex flex-wrap gap-1.5">
                    {bridge.pieces.map((piece, i) => {
                      const on = state.selected.includes(piece.id);
                      return (
                        <li key={piece.id}>
                          <button
                            type="button"
                            aria-pressed={on}
                            aria-keyshortcuts={String(i + 1)}
                            disabled={locked || (!on && full)}
                            onClick={() => {
                              press(piece.id);
                            }}
                            className="flex min-h-11 items-center gap-1.5 border-[1.5px] border-sea-100 px-2 py-1 text-left text-xs text-plate hover:border-land-sun disabled:opacity-45 aria-pressed:border-land-sun aria-pressed:bg-land-sun aria-pressed:text-ink"
                          >
                            <kbd className="grid size-5 shrink-0 place-items-center border-[1.5px] border-current font-display text-[0.6875rem] font-bold">
                              {i + 1}
                            </kbd>
                            {piece.label}
                            {on && (
                              <span className="text-[0.6875rem]">
                                · tramo {state.selected.indexOf(piece.id) + 1}
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      size="md"
                      disabled={locked || state.selected.length === 0}
                      onClick={test}
                    >
                      Probar con la vagoneta
                    </Button>
                    <Button
                      size="md"
                      variant="secondary"
                      disabled={locked || state.selected.length === 0}
                      onClick={clear}
                    >
                      Retirar los tramos
                    </Button>
                  </div>
                </HudPanel>
              )}
              {!state.settled && !running && (
                <KeyHint keys="T">
                  Probar con la vagoneta · 1 a {bridge.pieces.length} elige piezas
                </KeyHint>
              )}
            </div>
          </>
        }
      >
        <ArenaLights fog="#9ccbe4" near={30} far={90} />
        <CanyonScene
          bridge={bridge}
          selected={state.selected}
          target={target}
          run={run}
          clickable={!locked}
          still={still}
          onPiece={press}
          onTarget={aim}
          onDone={arrived}
        />
      </GameStage>
    </div>
  );
}
