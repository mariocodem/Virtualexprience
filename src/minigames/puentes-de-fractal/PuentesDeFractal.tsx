import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '@/a11y/useReducedMotion';
import { minigameLevel } from '@/ai/adaptiveEngine';
import type { Bridge, PuentesContent } from '@/data/contentSchemas';
import { useProgress } from '@/progress/store';
import { useMastery } from '@/stations/useMastery';
import { Button } from '@/ui/Button';
import { cx } from '@/ui/cx';
import { GameBriefing } from '../shared/GameBriefing';
import { GameReport } from '../shared/GameReport';
import type { MinigameProps } from '../shared/types';
import { BridgeScene } from './BridgeScene';
import {
  bridgePlan,
  clearPieces,
  currentBridgeId,
  isFinished,
  nextBridge,
  report,
  selectBridges,
  solutions,
  startBridges,
  testBridge,
  togglePiece,
  type BridgeReport,
  type BridgeState,
} from './engine';

const CONCEPT_LABEL: Record<Bridge['concept'], string> = {
  fraccion: 'Fracciones',
  porcentaje: 'Porcentajes',
  escala: 'Escalas',
  ecuacion: 'Ecuaciones',
  proporcion: 'Proporciones',
};

type Stage =
  | { kind: 'briefing' }
  | { kind: 'obra'; queue: Bridge[]; state: BridgeState }
  | { kind: 'informe'; result: BridgeReport };

/**
 * Puentes de Fractal (NeuroMath, CLAUDE.md §7). Estimar con el dibujo a escala
 * y calcular para confirmar: las piezas están escritas de formas distintas y
 * solo una combinación exacta resiste la vagoneta.
 */
export function PuentesDeFractal({
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
    window.scrollTo({ top: 0 });
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
          'Cada hueco tiene un largo y un número de apoyos. Elige tramos del taller hasta cubrirlo exactamente.',
          'Los tramos se dibujan a escala: estima con el dibujo, pero calcula antes de probar. Algunas piezas difieren por centímetros.',
          'La vagoneta dice si el puente resiste, queda corto o no encaja. Si se acaban las cargas de prueba, el puente se derrumba.',
          'Se evalúan los puentes que resisten y los que resuelves en la primera prueba.',
        ]}
        beginLabel="Entrar al taller"
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
    <Workshop
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

function Workshop({
  bridge,
  number,
  total,
  state,
  onChange,
  onTest,
  onNext,
}: {
  bridge: Bridge;
  number: number;
  total: number;
  state: BridgeState;
  onChange: (state: BridgeState) => void;
  onTest: () => void;
  onNext: () => void;
}) {
  const still = useReducedMotion();
  const heading = useRef<HTMLHeadingElement>(null);
  const proceed = useRef<HTMLButtonElement>(null);
  const full = state.selected.length >= bridge.slots;
  const result = state.settled ? state.results.at(-1) : undefined;
  const solution = solutions(bridge)[0] ?? [];

  useEffect(() => {
    heading.current?.focus();
  }, []);
  useEffect(() => {
    if (state.settled) proceed.current?.focus();
  }, [state.settled]);

  const outcomeText =
    state.last?.outcome === 'resiste'
      ? 'La vagoneta cruzó: el puente resiste y el faro del islote se enciende.'
      : state.last?.outcome === 'corto'
        ? 'Quedó corto: la vagoneta llegó al último tramo y cayó al agua.'
        : state.last?.outcome === 'largo'
          ? 'No encaja: los tramos suman más que el hueco y el puente se arquea.'
          : null;

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="toponym text-[0.625rem] text-ink-soft">
          Taller del observatorio · Puente {number} de {total} · {CONCEPT_LABEL[bridge.concept]}
        </p>
        <p className="flex items-center gap-2 text-sm">
          <span className="font-semibold">Cargas de prueba</span>
          <span aria-hidden="true" className="flex gap-1">
            {Array.from({ length: state.tests }, (_, i) => (
              <span
                key={i}
                className={cx(
                  'inline-block size-3 border-[1.5px] border-ink',
                  i < state.testsLeft && 'bg-ink',
                )}
              />
            ))}
          </span>
          <span className="sr-only">
            {state.testsLeft} de {state.tests}
          </span>
        </p>
      </div>

      <h2
        ref={heading}
        tabIndex={-1}
        className="font-display text-[clamp(1.35rem,1.1rem+0.9vw,1.85rem)] leading-tight font-extrabold outline-none"
      >
        {bridge.prompt}
      </h2>

      <div className="bg-plate-sunk plate-rule">
        <BridgeScene bridge={bridge} selected={state.selected} last={state.last} still={still} />
      </div>

      <div role="status" aria-live="polite" className="min-h-6">
        {outcomeText && (
          <p className="font-semibold">
            {outcomeText}
            {state.last?.outcome !== 'resiste' && !state.settled && (
              <span className="font-normal">
                {' '}
                Te quedan {state.testsLeft} {state.testsLeft === 1 ? 'carga' : 'cargas'} de prueba.
              </span>
            )}
          </p>
        )}
        {state.settled && result && !result.solved && (
          <p className="mt-1 font-semibold">Sin cargas de prueba: el puente se derrumba.</p>
        )}
      </div>

      {state.settled ? (
        <div className="grid gap-4">
          <div className="border-l-[3px] border-sea-700 bg-plate-sunk px-4 py-3">
            {!result?.solved && (
              <p>
                <span className="font-semibold">Una combinación que resiste: </span>
                {solution.map((id) => bridge.pieces.find((p) => p.id === id)?.label).join(' + ')}.
              </p>
            )}
            <p className={cx(!result?.solved && 'mt-1')}>{bridge.explanation}</p>
          </div>
          <div>
            <Button ref={proceed} size="lg" onClick={onNext}>
              {number === total ? 'Ver el informe del taller' : 'Siguiente puente'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <fieldset>
            <legend className="font-display text-lg font-extrabold">Tramos del taller</legend>
            <p className="mt-1 text-sm text-ink-soft">
              Apoyos usados: {state.selected.length} de {bridge.slots}. Pulsa un tramo para ponerlo
              o quitarlo.
            </p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {bridge.pieces.map((piece) => {
                const on = state.selected.includes(piece.id);
                return (
                  <li key={piece.id}>
                    <button
                      type="button"
                      aria-pressed={on}
                      disabled={!on && full}
                      onClick={() => {
                        onChange(togglePiece(state, bridge, piece.id));
                      }}
                      className={cx(
                        'flex min-h-14 w-full items-center justify-between gap-3 border-[1.5px] px-4 py-2 text-left',
                        'transition-colors duration-(--dur-fast) ease-out disabled:cursor-not-allowed disabled:opacity-45',
                        on ? 'border-ink bg-ink text-land-sun' : 'border-ink hover:bg-plate-sunk',
                      )}
                    >
                      <span className="font-display text-lg font-bold">{piece.label}</span>
                      <span className={cx('text-sm', on ? 'text-plate' : 'text-ink-soft')}>
                        {on
                          ? `Tramo ${String(state.selected.indexOf(piece.id) + 1)}`
                          : 'En el taller'}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </fieldset>
          <div className="grid content-start gap-3 border-t-[1.5px] border-ink pt-4 lg:border-t-0 lg:border-l-[1.5px] lg:pt-0 lg:pl-6">
            <h3 className="font-display text-lg font-extrabold">Tu puente</h3>
            {state.selected.length === 0 ? (
              <p className="text-ink-soft">Aún no hay tramos sobre el hueco.</p>
            ) : (
              <ol className="list-decimal space-y-1 pl-5">
                {state.selected.map((id) => (
                  <li key={id}>{bridge.pieces.find((p) => p.id === id)?.label}</li>
                ))}
              </ol>
            )}
            <div className="mt-2 flex flex-wrap gap-3">
              <Button size="lg" disabled={state.selected.length === 0} onClick={onTest}>
                Probar con la vagoneta
              </Button>
              <Button
                variant="secondary"
                size="lg"
                disabled={state.selected.length === 0}
                onClick={() => {
                  onChange(clearPieces(state));
                }}
              >
                Retirar los tramos
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BridgesReport({
  result,
  competency,
  back,
  onComplete,
  onRetry,
}: {
  result: BridgeReport;
  competency: string;
  back: string;
  onComplete: () => void;
  onRetry: () => void;
}) {
  const total = result.results.length;
  const solved = result.results.filter((r) => r.solved);
  const firstTry = solved.filter((r) => r.tries === 1).length;
  const concepts = [...new Set(result.results.map((r) => r.bridge.concept))];
  const [brujula] = useState(() => {
    const parts: string[] = [];
    if (solved.length === total)
      parts.push('Todos tus puentes resisten: el observatorio vuelve a estar unido.');
    else parts.push(`Resistieron ${String(solved.length)} de ${String(total)} puentes.`);
    if (firstTry < solved.length)
      parts.push(
        'Algunos los resolviste probando: convierte cada pieza a metros antes de cargar la vagoneta.',
      );
    else if (firstTry > 0)
      parts.push('Calculaste antes de probar: así se ahorran cargas y materiales.');
    const weak = concepts.filter((c) => !solved.some((r) => r.bridge.concept === c));
    if (weak.length > 0)
      parts.push(
        `Repasa ${weak.map((c) => CONCEPT_LABEL[c].toLowerCase()).join(' y ')} en «Escalas y proporciones».`,
      );
    return {
      text: parts.join(' '),
      highlights: [
        `Puentes que resistieron: ${String(solved.length)} de ${String(total)}.`,
        `Resueltos en la primera prueba: ${String(firstTry)}.`,
        `Conceptos dominados: ${String(result.toolsUsed)} de ${String(concepts.length)}.`,
        ...result.results.map(
          (r) =>
            `${CONCEPT_LABEL[r.bridge.concept]}: ${r.solved ? `resistió en ${String(r.tries)} prueba(s)` : 'se derrumbó'}.`,
        ),
      ],
    };
  });

  return (
    <GameReport
      title={solved.length === total ? 'Todos los puentes resisten' : 'El taller cierra por hoy'}
      score={result.score}
      figures={[
        { label: 'Puentes en pie', value: `${String(solved.length)} de ${String(total)}` },
        { label: 'A la primera', value: `${String(firstTry)} de ${String(total)}` },
        { label: 'Conceptos', value: `${String(result.toolsUsed)} de ${String(concepts.length)}` },
      ]}
      criteria={[
        {
          label: 'Cubriste cada hueco con exactitud',
          met: result.accuracy >= 0.75,
          detail: 'Sumar medidas escritas de formas distintas exige pasarlas a una misma unidad.',
        },
        {
          label: 'Calculaste antes de probar',
          met: result.criteria >= 0.5,
          detail: `${String(firstTry)} puente(s) resistieron en la primera prueba.`,
        },
        ...concepts.map((c) => ({
          label: CONCEPT_LABEL[c],
          met: solved.some((r) => r.bridge.concept === c),
        })),
      ]}
      brujula={brujula}
      game="Puentes de Fractal"
      competency={competency}
      back={back}
      onComplete={onComplete}
      onRetry={onRetry}
    />
  );
}
