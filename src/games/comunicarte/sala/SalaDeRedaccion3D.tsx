import { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '@/a11y/useReducedMotion';
import { minigameLevel } from '@/ai/adaptiveEngine';
import type { NewsItem, SalaContent, Signal } from '@/data/contentSchemas';
import {
  currentNewsId,
  DECIDE_COST,
  INVESTIGATE_COST,
  newsroomPlan,
  report,
  selectNews,
  startNewsroom,
  type NewsroomReport,
  type NewsroomState,
  type Verdict,
} from '@/minigames/sala-de-redaccion/engine';
import {
  clockTime,
  SIGNAL_LABEL,
  VERDICT_LABEL,
  VERDICT_SLIP,
} from '@/minigames/sala-de-redaccion/labels';
import { GameBriefing } from '@/minigames/shared/GameBriefing';
import type { MinigameProps } from '@/minigames/shared/types';
import { useProgress } from '@/progress/store';
import { useMastery } from '@/stations/useMastery';
import { cx } from '@/ui/cx';
import { Controls } from '../../shared/controls';
import { GameStage } from '../../shared/GameStage';
import { Banner, HudMeter, HudPanel } from '../../shared/hud';
import type { ControlHelp } from '../../shared/stage';
import {
  decideStep,
  deskKey,
  investigateStep,
  SIGNALS,
  STAMP_KEY,
  TOOL_OF,
  TRAY_LABEL,
  TRAY_OF,
  trayIndex,
  VERDICTS,
} from './desk';
import { DeskScene, type SealedNote } from './DeskScene';
import { DeskReport } from './report';

const HELP: ControlHelp[] = [
  { keys: '1 a 4', action: 'Investigar con lupa, calendario, archivador o mesa de luz' },
  { keys: 'A · D · C', action: 'Tomar el sello de Publicar, Descartar o Pedir corrección' },
  { keys: '1 a 4 con sello', action: 'Justificar con la señal que decide el caso' },
  { keys: 'X', action: 'Soltar el sello sin decidir' },
  { keys: 'Clic', action: 'Usar los objetos de la mesa' },
  { keys: 'Esc o P', action: 'Pausa' },
];

type Stage =
  | { kind: 'briefing' }
  | { kind: 'edicion'; queue: NewsItem[]; state: NewsroomState; round: number }
  | { kind: 'informe'; result: NewsroomReport };

/**
 * Sala de Redacción en 3D: el escritorio de Radio Puerto de noche. Mismo motor
 * y mismas métricas que la versión accesible; cambia el modo de jugarla, con
 * objetos para investigar, sellos para decidir y la nota que sale al aire.
 */
export function SalaDeRedaccion3D({
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

  const begin = () => {
    const queue = selectNews(content.news, plan, Math.random);
    onBrujula(null);
    setStage({ kind: 'edicion', queue, state: startNewsroom(queue, plan), round: Date.now() });
  };

  const finish = (state: NewsroomState): NewsroomReport => {
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
    return result;
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
          'Las notas llegan por el tubo neumático. Investiga con la lupa, el calendario, el archivador y la mesa de luz: cada pista consume minutos del cierre.',
          'Toma un sello (Publicar, Descartar o Pedir corrección) y justifica con la señal que decide el caso. La nota sale al aire, a la papelera o a corrección.',
          'Lo que no alcances a revisar antes de las 6:00 p. m. no sale al aire. Se evalúan tus decisiones y los criterios que aplicaste.',
        ]}
        beginLabel="Entrar a la cabina"
        onBegin={begin}
      />
    );
  }

  if (stage.kind === 'informe') {
    return (
      <DeskReport
        result={stage.result}
        island={island}
        onComplete={() => {
          onComplete(stage.result.score);
        }}
        onRetry={begin}
      />
    );
  }

  return (
    <Desk
      key={stage.round}
      queue={stage.queue}
      initial={stage.state}
      budget={plan.budget}
      onBrujula={onBrujula}
      onFinish={(state) => {
        setStage({ kind: 'informe', result: finish(state) });
      }}
    />
  );
}

/** Lo que se anuncia al llegar una nota nueva por el tubo. */
function noteIntro(queue: NewsItem[], state: NewsroomState, index: number): string {
  const id = currentNewsId(state);
  const news = queue.find((n) => n.id === id);
  if (!news) return 'La edición cerró.';
  return `Nota ${String(index + 1)} de ${String(queue.length)}: ${news.headline}. Fuente: ${news.source}. Fecha: ${news.date}.`;
}

/** Un cierre con pausa breve, para que se vea salir la última nota. */
const CLOSING_MS = 1500;

function Desk({
  queue,
  initial,
  budget,
  onBrujula,
  onFinish,
}: {
  queue: NewsItem[];
  initial: NewsroomState;
  budget: number;
  onBrujula: MinigameProps<SalaContent>['onBrujula'];
  onFinish: (state: NewsroomState) => void;
}) {
  const [controls] = useState(() => new Controls());
  const [state, setState] = useState(initial);
  const [held, setHeld] = useState<Verdict | null>(null);
  const [sealed, setSealed] = useState<SealedNote[]>([]);
  const [airPulse, setAirPulse] = useState(0);
  const [paused, setPaused] = useState(false);
  const [closing, setClosing] = useState(false);
  const [announce, setAnnounce] = useState(() => noteIntro(queue, initial, 0));
  const [banner, setBanner] = useState<{ text: string; at: number } | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const blind = useRef(0);
  const closed = useRef(false);
  const still = useReducedMotion();

  const id = currentNewsId(state);
  const news = queue.find((n) => n.id === id) ?? null;
  const revealed = id ? (state.revealed[id] ?? []) : [];
  const total = queue.length;

  const say = (text: string) => {
    setAnnounce(text);
  };

  const close = (next: NewsroomState) => {
    if (closed.current) return;
    closed.current = true;
    setClosing(true);
    setHeld(null);
    setBanner({ text: 'Cierre de edición: la radio sale al aire', at: performance.now() });
    window.setTimeout(
      () => {
        onFinish(next);
      },
      closing ? 0 : CLOSING_MS,
    );
  };

  const refocus = () => {
    heading.current?.focus();
  };

  const investigate = (signal: Signal) => {
    if (!news || closed.current || held) return;
    if (revealed.includes(signal)) return;
    const step = investigateStep(state, signal);
    setState(step.state);
    say(
      `${TOOL_OF[signal]}: ${SIGNAL_LABEL[signal]} revisada. ${news.clues[signal]} Quedan ${String(step.state.clock)} minutos.`,
    );
    if (step.warning) onBrujula({ text: step.warning, source: 'local' });
    if (step.closed) close(step.state);
    refocus();
  };

  const takeStamp = (verdict: Verdict) => {
    if (!news || closed.current) return;
    setHeld(verdict);
    say(
      `Sello de ${VERDICT_LABEL[verdict]} en la mano. Elige con 1 a 4 la señal que decide el caso, o X para soltarlo.`,
    );
  };

  const justify = (signal: Signal) => {
    if (!news || !held || closed.current) return;
    const step = decideStep(state, held, signal, blind.current);
    blind.current = step.blind;
    const tray = TRAY_OF[held];
    const slot = trayIndex(step.state.decisions, news.id);
    setSealed((list) => [...list, { id: news.id, tray, slot: Math.max(0, slot) }]);
    if (held === 'publicar') setAirPulse((n) => n + 1);
    setState(step.state);
    setHeld(null);
    onBrujula(step.brujula ? { text: step.brujula, source: 'local' } : null);
    say(
      `${VERDICT_SLIP[held]}: la nota va a ${TRAY_LABEL[tray]}, justificada por ${SIGNAL_LABEL[signal].toLowerCase()}. ${noteIntro(queue, step.state, step.state.index)}`,
    );
    if (step.closed) close(step.state);
    refocus();
  };

  const handleKey = useCallback(
    (event: KeyboardEvent) => {
      if (paused || closed.current || event.altKey || event.ctrlKey || event.metaKey) return;
      const active = document.activeElement;
      if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return;
      if (active !== document.body && !active?.closest('[role="application"]')) return;
      const action = deskKey(event.key, held ? 'justificar' : 'mesa');
      if (!action) return;
      event.preventDefault();
      if (action.kind === 'investigar') investigate(action.signal);
      else if (action.kind === 'sello') takeStamp(action.verdict);
      else if (action.kind === 'criterio') justify(action.signal);
      else {
        setHeld(null);
        say('Sello soltado.');
      }
    },
    // Las acciones leen el estado actual en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [paused, held, state, news],
  );
  useEffect(() => {
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
    };
  }, [handleKey]);

  // Cada nota nueva se anuncia y recibe el foco.
  const noteId = news?.id;
  useEffect(() => {
    if (!news) return;
    refocus();
    // Solo cuando llega otra nota.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId]);

  const urgent = state.clock <= 30;
  const fields: { signal: Signal; label: string; value: string }[] = news
    ? [
        { signal: 'fuente', label: 'Fuente', value: news.source },
        { signal: 'fecha', label: 'Fecha', value: news.date },
        { signal: 'cita', label: 'Cita', value: news.quote },
        { signal: 'imagen', label: 'Imagen', value: news.image },
      ]
    : [];

  return (
    <GameStage
      label="Sala de Redacción en 3D"
      controls={controls}
      paused={paused}
      onPause={setPaused}
      help={HELP}
      announce={announce}
      touch={false}
      camera={{ fov: 40, position: [0, 6, 12], near: 0.5, far: 120 }}
      hud={
        <>
          <div className="absolute top-14 left-3 w-60 sm:top-3 sm:w-72">
            <HudPanel className="grid gap-2">
              <HudMeter
                label="Cierre de edición"
                value={state.clock / budget}
                text={clockTime(state.clock)}
                tone={urgent ? 'low' : 'sun'}
              />
              <p className="text-xs text-sea-100">
                Nota {String(Math.min(state.index + 1, total))} de {String(total)} · al aire{' '}
                {String(sealed.filter((n) => n.tray === 'aire').length)}
              </p>
            </HudPanel>
          </div>
          {banner && <Banner text={banner.text} at={banner.at} />}
          {news && !closing && (
            <aside
              aria-label="Nota en la mesa"
              className={cx(
                'pointer-events-auto absolute inset-x-0 bottom-0 flex max-h-[52%] flex-col overflow-hidden bg-plate/95 text-ink [--focus:var(--route)] plate-rule',
                'sm:inset-x-auto sm:top-[6.5rem] sm:bottom-3 sm:left-3 sm:max-h-none sm:w-[min(26rem,36%)]',
              )}
            >
              <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-2">
                <p className="toponym text-[0.625rem] text-ink-soft">
                  Mesa de edición · Nota {String(state.index + 1)} de {String(total)}
                </p>
                <h2
                  ref={heading}
                  tabIndex={-1}
                  className="mt-1 font-display text-lg leading-snug font-extrabold outline-none"
                >
                  {news.headline}
                </h2>
                <dl className="mt-3 grid gap-2">
                  {fields.map((field) => {
                    const seen = revealed.includes(field.signal);
                    const n = SIGNALS.indexOf(field.signal) + 1;
                    return (
                      <div key={field.signal} className="border-t border-plate-edge pt-2">
                        <dt className="flex items-baseline justify-between gap-2 text-xs font-semibold text-ink-soft">
                          {field.label}
                          {!seen && (
                            <button
                              type="button"
                              disabled={held !== null}
                              aria-keyshortcuts={held ? undefined : String(n)}
                              onClick={() => {
                                investigate(field.signal);
                              }}
                              className="inline-flex min-h-8 items-center gap-1 border-[1.5px] border-ink px-2 font-display text-xs font-bold hover:bg-plate-sunk disabled:opacity-40"
                            >
                              <kbd className="font-display">{n}</kbd> {TOOL_OF[field.signal]} ·{' '}
                              {String(INVESTIGATE_COST)} min
                            </button>
                          )}
                        </dt>
                        <dd
                          className={cx(
                            'text-sm',
                            field.signal === 'imagen' && 'italic',
                            field.signal === 'cita' && 'font-display',
                          )}
                        >
                          {field.value}
                        </dd>
                        {seen && (
                          <dd className="mt-1 border-l-[3px] border-sea-700 bg-plate-sunk px-2 py-1 text-sm">
                            <span className="font-semibold">Verificación: </span>
                            {news.clues[field.signal]}
                          </dd>
                        )}
                      </div>
                    );
                  })}
                </dl>
              </div>

              <div className="shrink-0 border-t-[1.5px] border-ink px-4 pt-3 pb-4">
                <p className="text-sm font-semibold">
                  {held ? '¿Qué señal decide tu decisión?' : '¿Qué hace la radio con esta nota?'}
                </p>
                <div className="mt-2 flex border-[1.5px] border-ink">
                  {VERDICTS.map((v) => (
                    <button
                      key={v}
                      type="button"
                      aria-pressed={held === v}
                      aria-keyshortcuts={STAMP_KEY[v]}
                      onClick={() => {
                        takeStamp(v);
                      }}
                      className={cx(
                        'flex min-h-11 flex-1 flex-col items-center justify-center px-1 text-center font-display text-xs font-bold not-last:border-r-[1.5px] not-last:border-ink',
                        held === v ? 'bg-ink text-land-sun' : 'hover:bg-plate-sunk',
                      )}
                    >
                      {VERDICT_LABEL[v]}
                      <kbd className="text-[0.65rem] font-normal opacity-80">{STAMP_KEY[v]}</kbd>
                    </button>
                  ))}
                </div>
                {held && (
                  <div className="mt-3">
                    <div className="grid grid-cols-2 gap-2">
                      {SIGNALS.map((signal, i) => (
                        <button
                          key={signal}
                          type="button"
                          aria-keyshortcuts={String(i + 1)}
                          onClick={() => {
                            justify(signal);
                          }}
                          className="flex min-h-11 items-center gap-2 border-[1.5px] border-plate-edge px-2 text-left text-sm hover:border-ink"
                        >
                          <kbd className="inline-flex size-6 shrink-0 items-center justify-center border-[1.5px] border-ink font-display text-xs font-bold">
                            {i + 1}
                          </kbd>
                          <span>
                            {SIGNAL_LABEL[signal]}
                            {revealed.includes(signal) && (
                              <span className="block text-xs text-ink-soft">revisada</span>
                            )}
                          </span>
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setHeld(null);
                        say('Sello soltado.');
                      }}
                      className="mt-2 min-h-9 px-2 text-sm underline underline-offset-2"
                    >
                      Soltar el sello <kbd className="text-xs">X</kbd>
                    </button>
                    <p className="mt-1 text-xs text-ink-soft">
                      Sellar cuesta {String(DECIDE_COST)} min del cierre.
                    </p>
                  </div>
                )}
              </div>
            </aside>
          )}
        </>
      }
    >
      <DeskScene
        index={state.index}
        hasNote={Boolean(news) && !closing}
        clock={state.clock}
        revealed={revealed}
        held={held}
        sealed={sealed}
        airPulse={airPulse}
        still={still}
        interactive={!paused && !closing}
        onInvestigate={investigate}
        onStamp={takeStamp}
      />
    </GameStage>
  );
}
