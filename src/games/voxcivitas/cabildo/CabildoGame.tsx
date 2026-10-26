import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePreferences } from '@/a11y/preferences';
import { useReducedMotion } from '@/a11y/useReducedMotion';
import { minigameLevel } from '@/ai/adaptiveEngine';
import type { CabildoContent } from '@/data/contentSchemas';
import { Controls } from '@/games/shared/controls';
import { GameStage } from '@/games/shared/GameStage';
import { HudMeter, HudPanel } from '@/games/shared/hud';
import { Explorer } from '@/games/shared/scene/Explorer';
import { ArenaLights, ArenaPlatform } from '@/games/shared/scene/ArenaScenery';
import type { ControlHelp } from '@/games/shared/stage';
import { effectSummary, QUALITY_LABEL } from '@/minigames/shared/effects';
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
} from '@/minigames/sesion-de-cabildo/engine';
import { GameBriefing } from '@/minigames/shared/GameBriefing';
import { GameReport } from '@/minigames/shared/GameReport';
import type { MinigameProps } from '@/minigames/shared/types';
import { useProgress } from '@/progress/store';
import { useMastery } from '@/stations/useMastery';
import { Button } from '@/ui/Button';
import { cx } from '@/ui/cx';
import { BUILD, ISLE } from '@/world/palette';
import { Wheel, type WheelFeedback } from '../hud/Wheel';
import { groupInk } from '../palette';
import { shortName } from '../plazaData';
import { PlazaBackdrop } from '../scene/Backdrop';
import {
  ActaScroll,
  CouncilCamera,
  Representative,
  RoundTable,
  SpeakerLight,
} from '../scene/Council';
import { Crowd } from '../scene/Crowd';
import type { CrowdPose } from '../scene/crowdPose';
import { audienceLayout, raisedCount } from '../scene/layout';
import {
  ballots,
  crowdSupport,
  debrief,
  moderatorSpot,
  MOVE_LABEL,
  seatSpot,
  trustDeltas,
  VERDICT_TITLE,
} from './session';

const AUDIENCE = 26;
const HELP: ControlHelp[] = [
  { keys: '1 a 6', action: 'Elegir tu intervención' },
  { keys: 'Tab', action: 'Moverte entre las intervenciones y los botones' },
  { keys: 'Enter', action: 'Seguir con la sesión' },
  { keys: 'Esc o P', action: 'Pausa' },
];

type Stage =
  | { kind: 'briefing' }
  | { kind: 'sesion'; queue: Round[] }
  | { kind: 'informe'; state: CabildoState; result: CabildoReport };

/**
 * Sesión de cabildo en 3D (Voxcivitas): la plaza con el cabildo, los grupos
 * alrededor de la mesa y la rueda de intervenciones de quien modera. Usa el
 * mismo motor y los mismos criterios que la versión accesible.
 */
export function CabildoGame({
  content,
  island,
  onBrujula,
  onEvents,
  onComplete,
  onFail,
}: MinigameProps<CabildoContent>) {
  const { mastery } = useMastery(island.id);
  const [level] = useState(() => minigameLevel(mastery));
  const plan = cabildoPlan(level);
  const [stage, setStage] = useState<Stage>({ kind: 'briefing' });
  const [run, setRun] = useState(0);

  const begin = () => {
    onBrujula(null);
    setRun((n) => n + 1);
    setStage({ kind: 'sesion', queue: selectRounds(content.rounds, plan, Math.random) });
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
          'Cada grupo toma la palabra y se ilumina. Elige en la rueda cómo respondes: tu intervención crece o apaga el aura de confianza de cada grupo.',
          'Algunas respuestas suenan bien y esconden una falacia. Lee con cuidado: se evalúa la calidad de la deliberación.',
          `Al final se vota con faroles: un grupo respalda el acuerdo si su aura llega al ${String(content.threshold)} %.`,
        ]}
        beginLabel="Abrir la sesión"
        onBegin={begin}
      >
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {content.factions.map((f, i) => (
            <li
              key={f.id}
              className="border-l-[6px] bg-plate-sunk px-3 py-2 text-sm"
              style={{ borderColor: groupInk(i) }}
            >
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

  return (
    <Session
      key={run}
      content={content}
      islandId={island.id}
      queue={stage.queue}
      onBrujula={onBrujula}
      onVote={(_state, result) => {
        onEvents(
          useProgress.getState().recordMinigame('sesion-de-cabildo', {
            accuracy: result.accuracy,
            criteria: result.criteria,
            toolsUsed: result.toolsUsed,
          }),
        );
        if (result.score < 0.6) onFail(result.score);
        onBrujula(null);
      }}
      onFinish={(state, result) => {
        setStage({ kind: 'informe', state, result });
        window.scrollTo({ top: 0 });
      }}
    />
  );
}

interface Decided {
  option: Intervention;
  preview: CabildoState;
  deltas: Record<string, number>;
}

interface Vote {
  state: CabildoState;
  result: CabildoReport;
  shown: number;
}

function Session({
  content,
  islandId,
  queue,
  onBrujula,
  onVote,
  onFinish,
}: {
  content: CabildoContent;
  islandId: Parameters<typeof useMastery>[0];
  queue: Round[];
  onBrujula: MinigameProps<CabildoContent>['onBrujula'];
  onVote: (state: CabildoState, result: CabildoReport) => void;
  onFinish: (state: CabildoState, result: CabildoReport) => void;
}) {
  const still = useReducedMotion();
  const setMode = usePreferences((s) => s.setGameMode);
  const { record } = useMastery(islandId);
  const [controls] = useState(() => new Controls());
  const [state, setState] = useState(() => startCabildo(content, queue));
  const [decided, setDecided] = useState<Decided | null>(null);
  const [vote, setVote] = useState<Vote | null>(null);
  const [paused, setPaused] = useState(false);
  const [announce, setAnnounce] = useState('');

  const names = useMemo(
    () => Object.fromEntries(content.factions.map((f) => [f.id, f.name])),
    [content],
  );
  const count = content.factions.length;
  const round = queue.find((r) => r.id === currentRoundId(state));
  const shownState = decided?.preview ?? vote?.state ?? state;
  const speaker = vote ? null : (round?.speaker ?? null);
  const voteDone = vote !== null && vote.shown >= count;
  const verdict = vote?.result.verdict ?? null;

  // Lo que lee el lienzo en cada cuadro (sin re-renderizar React).
  const live = useRef({
    trust: shownState.trust,
    speaker,
    ballots: [] as boolean[],
    support: 0,
    mood: 0.5,
  });
  useEffect(() => {
    const trusts = Object.values(shownState.trust);
    live.current = {
      trust: shownState.trust,
      speaker,
      ballots: vote ? ballots(vote.state, content).map((b) => b.yes) : [],
      support: voteDone && verdict ? crowdSupport(verdict) : 0,
      mood: trusts.length ? trusts.reduce((a, b) => a + b, 0) / trusts.length / 100 : 0.5,
    };
  }, [shownState, speaker, vote, voteDone, verdict, content]);

  // La votación se revela grupo por grupo.
  useEffect(() => {
    if (!vote || vote.shown >= count) return;
    const id = window.setTimeout(
      () => {
        setVote((v) => (v ? { ...v, shown: v.shown + 1 } : v));
      },
      still ? 0 : 750,
    );
    return () => {
      window.clearTimeout(id);
    };
  }, [vote, count, still]);

  const audience = useMemo(() => audienceLayout(AUDIENCE), []);
  const readAudience = useCallback(
    (i: number, out: CrowdPose) => {
      const p = audience[i];
      if (!p) return;
      const { mood, support } = live.current;
      out.x = p.x;
      out.z = p.z;
      out.rotY = p.rotY;
      out.ink = groupInk(i);
      out.warmth = 0.45 + 0.55 * mood;
      out.lit = i < raisedCount(AUDIENCE, support);
      out.calling = false;
    },
    [audience],
  );

  const seats = useMemo(
    () => content.factions.map((_, i) => seatSpot(i, content.factions.length)),
    [content],
  );
  const mod = useMemo(() => moderatorSpot(), []);

  const onChoose = (optionId: string) => {
    if (!round || decided || vote) return;
    const option = round.options.find((o) => o.id === optionId);
    if (!option) return;
    const preview = intervene(state, round, optionId);
    record(round.tier, option.quality);
    setDecided({ option, preview, deltas: trustDeltas(state.trust, preview.trust) });
    onBrujula({
      text: `${MOVE_LABEL[option.move]}. ${content.tips[option.move]}`,
      source: 'local',
    });
    setAnnounce(
      `${QUALITY_LABEL[option.quality]}. ${option.feedback}${option.agreement ? ` Queda en el acta: ${option.agreement}` : ''}`,
    );
  };

  const onContinue = () => {
    if (!decided) return;
    const next = decided.preview;
    setDecided(null);
    onBrujula(null);
    setState(next);
    if (isFinished(next)) {
      const result = report(next, content);
      onVote(next, result);
      setVote({ state: next, result, shown: 0 });
      setAnnounce('Se llama a votación: cada grupo alza su farol si respalda el acuerdo.');
    } else {
      const upcoming = queue.find((r) => r.id === currentRoundId(next));
      if (upcoming) setAnnounce(`Toma la palabra ${names[upcoming.speaker] ?? upcoming.speaker}.`);
    }
  };

  const feedback: WheelFeedback | null = decided
    ? {
        optionId: decided.option.id,
        label: `${MOVE_LABEL[decided.option.move]} · ${QUALITY_LABEL[decided.option.quality]}`,
        tone:
          decided.option.quality === 1 ? 'good' : decided.option.quality === 0.5 ? 'mid' : 'bad',
        text: decided.option.feedback,
        notes: [
          effectSummary(decided.option.effects, names) &&
            `Confianza: ${effectSummary(decided.option.effects, names)}`,
          decided.option.agreement ? `Queda en el acta: ${decided.option.agreement}` : '',
          content.tips[decided.option.move],
        ].filter(Boolean),
      }
    : null;

  const speakerName = round ? (names[round.speaker] ?? round.speaker) : '';
  const trustNow = shownState.trust;

  return (
    <div className="grid gap-4">
      <p className="toponym text-[0.625rem] text-ink-soft">
        Plaza de Voxcivitas ·{' '}
        {vote ? 'Votación' : `Intervención ${String(state.index + 1)} de ${String(queue.length)}`}
      </p>
      <GameStage
        label="Sesión de cabildo en la plaza de Voxcivitas"
        controls={controls}
        camera={{ fov: 42, position: [0, 5.2, 7.6], near: 0.5, far: 120 }}
        paused={paused}
        onPause={setPaused}
        help={HELP}
        announce={
          voteDone
            ? `${VERDICT_TITLE[vote.result.verdict]}. Respaldan ${String(vote.result.supporters.length)} de ${String(count)} grupos.`
            : announce
        }
        touch={false}
        onAccessible={() => {
          setMode('accesible');
        }}
        hud={
          <>
            <div className="absolute top-3 left-3 grid w-[min(15rem,calc(100%-9rem))] gap-2 sm:w-64">
              <HudPanel className="grid gap-2">
                <p className="text-xs font-semibold">{content.matter}</p>
                <div className="hidden gap-2 sm:grid">
                  {content.factions.map((f) => (
                    <HudMeter
                      key={f.id}
                      label={shortName(f.id, f.name)}
                      value={(trustNow[f.id] ?? 0) / 100}
                      text={`${String(Math.round(trustNow[f.id] ?? 0))} %`}
                      tone={(trustNow[f.id] ?? 0) >= content.threshold ? 'route' : 'fog'}
                    />
                  ))}
                  <p className="text-[0.6875rem] text-sea-100">
                    Respaldan desde el {content.threshold} % (marca fina en el aura).
                  </p>
                </div>
                <p className="text-[0.6875rem] text-sea-100 sm:hidden">
                  {content.factions
                    .map(
                      (f) =>
                        `${shortName(f.id, f.name)} ${String(Math.round(trustNow[f.id] ?? 0))} %`,
                    )
                    .join(' · ')}
                </p>
              </HudPanel>
            </div>
            {shownState.acta.length > 0 && (
              <HudPanel className="absolute top-16 right-3 hidden max-h-[38%] w-60 overflow-y-auto lg:block">
                <p className="text-xs font-semibold">Acta del cabildo</p>
                <ol className="mt-1 list-decimal space-y-1 pl-4 text-xs text-sea-100">
                  {shownState.acta.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ol>
              </HudPanel>
            )}
            <div className="absolute inset-x-3 bottom-3 flex max-h-[62%] justify-center">
              {vote ? (
                <VoteCard
                  content={content}
                  vote={vote}
                  done={voteDone}
                  onReport={() => {
                    onFinish(vote.state, vote.result);
                  }}
                />
              ) : round ? (
                <Wheel
                  key={round.id}
                  kicker={`Toma la palabra: ${speakerName}`}
                  quote={round.statement}
                  options={round.options}
                  feedback={feedback}
                  onChoose={onChoose}
                  onContinue={onContinue}
                  continueLabel={
                    state.index + 1 === queue.length
                      ? 'Llamar a votación'
                      : 'Dar la palabra al siguiente grupo'
                  }
                />
              ) : null}
            </div>
          </>
        }
      >
        <ArenaLights />
        <ArenaPlatform radius={10} ground={BUILD.paving} rim={ISLE.voxcivitas} />
        <PlazaBackdrop radius={10.2} />
        <CouncilCamera still={still} />
        <RoundTable />
        <ActaScroll agreements={shownState.acta.length} />
        <SpeakerLight
          get={() => {
            const id = live.current.speaker;
            const i = content.factions.findIndex((f) => f.id === id);
            return seats[i] ?? null;
          }}
        />
        {content.factions.map((f, i) => {
          const spot = seats[i];
          if (!spot) return null;
          return (
            <Representative
              key={f.id}
              spot={spot}
              ink={groupInk(i)}
              name={shortName(f.id, f.name)}
              threshold={content.threshold}
              seed={i + 1}
              still={still}
              delta={decided ? (decided.deltas[f.id] ?? 0) : null}
              get={() => ({
                trust: live.current.trust[f.id] ?? 0,
                speaking: live.current.speaker === f.id,
                lantern: Boolean(live.current.ballots[i]) && i < (vote?.shown ?? 0),
              })}
            />
          );
        })}
        <Explorer
          get={() => ({ x: mod.x, z: mod.z, facing: -Math.PI / 2, moving: false })}
          glow={0.5}
          still
        />
        <Crowd count={AUDIENCE} read={readAudience} still={still} />
      </GameStage>
    </div>
  );
}

function VoteCard({
  content,
  vote,
  done,
  onReport,
}: {
  content: CabildoContent;
  vote: Vote;
  done: boolean;
  onReport: () => void;
}) {
  const proceed = useRef<HTMLButtonElement>(null);
  const list = ballots(vote.state, content);
  useEffect(() => {
    if (done) proceed.current?.focus();
  }, [done]);
  return (
    <section
      aria-labelledby="votacion-titulo"
      className="pointer-events-auto w-full max-w-2xl overflow-y-auto bg-plate p-4 text-ink [--focus:var(--route)] plate-rule sm:p-5"
    >
      <p className="toponym text-[0.625rem] text-ink-soft">Votación con faroles</p>
      <h2 id="votacion-titulo" className="mt-1 font-display text-lg font-extrabold">
        {done ? VERDICT_TITLE[vote.result.verdict] : 'Cada grupo decide si alza su farol…'}
      </h2>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {list.map((b, i) => {
          const shown = i < vote.shown;
          return (
            <li
              key={b.id}
              className={cx(
                'border-l-[3px] bg-plate-sunk px-3 py-1.5 text-sm',
                !shown && 'opacity-50',
                shown && b.yes && 'border-isle-latidosocial',
                shown && !b.yes && 'border-land-high',
                !shown && 'border-plate-edge',
              )}
            >
              <span className="font-semibold">{b.name}</span>
              <span className="block text-xs">
                {shown
                  ? `${b.yes ? 'Alza su farol: respalda' : 'No alza su farol'} · ${String(Math.round(b.trust))} %`
                  : 'Deliberando…'}
              </span>
            </li>
          );
        })}
      </ul>
      {done && (
        <Button ref={proceed} className="mt-3" size="lg" onClick={onReport}>
          Ver el informe de la sesión
        </Button>
      )}
    </section>
  );
}

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
  const [summary] = useState(() => debrief(state, result, content));
  return (
    <GameReport
      title={summary.title}
      score={result.score}
      figures={summary.figures}
      criteria={summary.criteria}
      brujula={summary.brujula}
      game="Sesión de cabildo"
      competency={competency}
      back={back}
      onComplete={onComplete}
      onRetry={onRetry}
    >
      <h3 className="mt-8 font-display text-lg font-bold">Votación</h3>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {ballots(state, content).map((b) => (
          <li
            key={b.id}
            className={cx(
              'border-l-[3px] bg-plate-sunk px-4 py-2',
              b.yes ? 'border-isle-latidosocial' : 'border-land-high',
            )}
          >
            <span className="font-semibold">{b.name}</span>
            <span className="block text-sm">
              {b.yes ? 'Respalda el acuerdo' : 'No lo respalda'} · {Math.round(b.trust)} % de
              confianza
            </span>
          </li>
        ))}
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
