import { useFrame } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { pickItem, phaseFor } from '@/boss/engine';
import type { QuizItem } from '@/data/contentSchemas';
import { Controls } from '@/games/shared/controls';
import { GameStage } from '@/games/shared/GameStage';
import {
  Banner,
  DecisionCard,
  HudMeter,
  HudPanel,
  KeyHint,
  LightsHud,
  type DecisionFeedback,
} from '@/games/shared/hud';
import { brumaTint } from '@/games/shared/palette';
import { ARENA_HELP, STAGE_BUTTON, type ControlHelp } from '@/games/shared/stage';
import type { ArenaProps } from '@/games/types';
import { cx } from '@/ui/cx';
import { groupColor } from '../groups';
import { BosqueScene } from './BosqueScene';
import { BOSQUE, saberLabel, type Need } from './data';
import {
  answerDilemma,
  assignGroup,
  createDefense,
  fireCeiba,
  REACH,
  stepDefense,
  type DefenseConfig,
  type DefenseEvent,
  type DefenseState,
} from './defense';

const HELP: ControlHelp[] = [
  { keys: 'WASD o flechas', action: 'Recorrer el bosque' },
  { keys: 'E o Enter', action: 'Atender el farol más cercano' },
  { keys: '1 a 4', action: 'Abrir el farol de ese número; luego, elegir el grupo con 1 a 4' },
  { keys: '5 o Retroceso', action: 'Dejar libre el farol o cancelar' },
  { keys: 'Espacio', action: 'Disparar el haz de la ceiba (necesita carga)' },
  ARENA_HELP[ARENA_HELP.length - 1] ?? { keys: 'Esc o P', action: 'Pausa' },
];

type Card =
  | { kind: 'farol'; index: number }
  | { kind: 'dilema'; item: QuizItem; feedback: DecisionFeedback | null }
  | null;

interface Hud {
  lights: number;
  hits: number;
  phase: 1 | 2 | 3;
  charge: number;
  bloom: number;
  dilemma: boolean;
  participation: number;
  near: number;
  groups: { id: string; energy: number; resting: boolean; at: string | null }[];
  faroles: { id: string; need: Need | null; group: string | null; fog: number }[];
}

const pct = (v: number) => `${String(Math.round(v * 100))} %`;
const groupName = (id: string) => BOSQUE.groups.find((g) => g.id === id)?.short ?? id;

function snapshot(state: DefenseState): Hud {
  let near = -1;
  state.faroles.forEach((f, i) => {
    if (Math.hypot(f.x - state.player.x, f.z - state.player.z) < REACH) near = i;
  });
  return {
    lights: state.lights,
    hits: state.hits,
    phase: state.phase,
    charge: state.charge,
    bloom: state.bloom,
    dilemma: state.dilemma,
    participation: state.participation,
    near,
    groups: state.groups.map((g) => ({
      id: g.id,
      energy: g.energy,
      resting: g.resting,
      at: state.faroles.find((f) => f.group === g.id)?.id ?? null,
    })),
    faroles: state.faroles.map((f) => ({
      id: f.id,
      need: f.need,
      group: f.group,
      fog: f.fog,
    })),
  };
}

/**
 * Defender el bosque juntos (LatidoSocial): la Bruma manda oleadas de niebla
 * por cuatro senderos. Cada farol pide un saber; se asigna el grupo que lo
 * tiene, se rota a quien se cansa y los faroles bien atendidos cargan la ceiba,
 * que dispara el haz. Estrategia y cuidado del equipo, no puntería.
 */
export function DefenderBosque({
  island,
  content,
  level,
  goal,
  lights,
  tiers,
  calm,
  still,
  onBrujula,
  onDecision,
  onEnd,
  onAccessible,
}: ArenaProps) {
  const [controls] = useState(() => new Controls());
  const config = useMemo<DefenseConfig>(
    () => ({ level, goal, lights, calm, tiers }),
    [level, goal, lights, calm, tiers],
  );
  const [state] = useState<DefenseState>(() => createDefense(config, BOSQUE));
  const [paused, setPaused] = useState(false);
  const [hud, setHud] = useState<Hud>(() => snapshot(state));
  const [card, setCard] = useState<Card>(null);
  const [announce, setAnnounce] = useState('');
  const [banner, setBanner] = useState<{ text: string; at: number } | null>(null);
  const cardRef = useRef<Card>(null);
  const pausedRef = useRef(false);
  const used = useRef<string[]>([]);
  const tally = useRef({ correct: 0, total: 0 });
  const ended = useRef(false);
  const random = useRef(Math.random).current;
  const rootRef = useRef<HTMLDivElement>(null);
  const tint = brumaTint(island.id);

  const openCard = useCallback((next: Card) => {
    cardRef.current = next;
    setCard(next);
  }, []);
  const say = useCallback((text: string) => {
    setAnnounce(text);
  }, []);
  const shout = useCallback((text: string) => {
    setBanner({ text, at: performance.now() });
  }, []);

  const end = (outcome: 'victoria' | 'retirada') => {
    if (ended.current) return;
    ended.current = true;
    const { correct, total } = tally.current;
    onEnd({ outcome, accuracy: total === 0 ? 0 : correct / total, decisions: total });
  };

  const farolName = (id: string) => BOSQUE.faroles.find((f) => f.id === id)?.short ?? id;

  const onEvents = (events: DefenseEvent[]) => {
    for (const event of events) {
      switch (event.type) {
        case 'llamado': {
          const need = state.faroles.find((f) => f.id === event.farol)?.need;
          if (need) say(`Llega niebla por el farol ${farolName(event.farol)}. Pide: ${need.text}`);
          break;
        }
        case 'oleada':
          say(`El farol ${farolName(event.farol)} disipó la niebla.`);
          break;
        case 'golpe':
          shout('La niebla llegó a la ceiba');
          say(
            `La niebla llegó a la ceiba por el farol ${farolName(event.farol)}. Quedan ${String(event.lights)} luces.`,
          );
          break;
        case 'cansado':
          shout(`${groupName(event.group)} está por agotarse: relévalo`);
          say(`${groupName(event.group)} está por agotarse. Cámbialo por otro grupo.`);
          break;
        case 'agotado':
          shout(`${groupName(event.group)} se agotó`);
          say(`${groupName(event.group)} se agotó y dejó su farol. Baja la participación.`);
          break;
        case 'descansado':
          say(`${groupName(event.group)} ya descansó y puede volver a un farol.`);
          break;
        case 'haz':
          say('El haz de la ceiba atraviesa la Bruma.');
          break;
        case 'sin-carga':
          shout('Sin carga: atiende bien los faroles');
          break;
        case 'fase':
          shout(`La Bruma cambia de forma: fase ${String(event.phase)}`);
          break;
        case 'victoria':
          end('victoria');
          break;
        case 'retirada':
          end('retirada');
          break;
        default:
          break;
      }
    }
    setHud(snapshot(state));
  };

  const openFarol = (index: number) => {
    if (cardRef.current || state.outcome !== 'en-curso') return;
    const farol = state.faroles[index];
    if (!farol) return;
    if (!farol.need) {
      say(`El farol ${farolName(farol.id)} no tiene niebla por ahora.`);
      return;
    }
    openCard({ kind: 'farol', index });
    say(`Farol ${farolName(farol.id)}. Pide: ${farol.need.text} Elige el grupo con 1 a 4.`);
  };

  const chooseGroup = (groupId: string | null) => {
    const current = cardRef.current;
    if (current?.kind !== 'farol') return;
    const farol = state.faroles[current.index];
    if (!farol) return;
    if (groupId !== null && farol.group === groupId) {
      openCard(null);
      return;
    }
    const result = assignGroup(state, farol.id, groupId);
    if (!result.ok) {
      say(`${groupName(groupId ?? '')} descansa: elige otro grupo.`);
      return;
    }
    if (groupId !== null && result.correct !== null && result.need) {
      tally.current.total += 1;
      if (result.correct) tally.current.correct += 1;
      onDecision({ correct: result.correct, tier: result.need.tier, itemId: result.need.id });
      const text = result.correct
        ? `Bien: ${result.need.why}`
        : `Ese grupo no es el indicado: ${result.need.why}`;
      onBrujula({ text: text.charAt(0).toUpperCase() + text.slice(1), source: 'local' });
      shout(result.correct ? '¡Bien atendido!' : 'Ese saber no encaja');
      say(text);
    } else {
      say(`El farol ${farolName(farol.id)} quedó libre.`);
    }
    openCard(null);
    setHud(snapshot(state));
  };

  const openDilemma = () => {
    const item = pickItem(content.items, tiers[state.phase - 1] ?? 3, used.current, random);
    used.current.push(item.id);
    openCard({ kind: 'dilema', item, feedback: null });
    say(`La ceiba pide decidir entre todos: ${item.prompt}`);
  };

  const chooseDilemma = (optionId: string) => {
    const current = cardRef.current;
    if (current?.kind !== 'dilema' || current.feedback) return;
    const option = current.item.options.find((o) => o.id === optionId);
    if (!option) return;
    tally.current.total += 1;
    if (option.correct) tally.current.correct += 1;
    answerDilemma(state, option.correct);
    onDecision({ correct: option.correct, tier: current.item.tier, itemId: current.item.id });
    onBrujula({ text: current.item.explanation, source: 'local' });
    if (option.correct) shout('¡La ceiba está cargada! Pulsa Espacio');
    openCard({ ...current, feedback: { correct: option.correct, text: option.feedback } });
    setHud(snapshot(state));
  };

  const fire = () => {
    if (state.outcome === 'en-curso') onEvents(fireCeiba(state, config));
  };

  // Función estable para la escena: así los rótulos de los faroles no se vuelven a montar.
  const openFarolRef = useRef(openFarol);
  useEffect(() => {
    openFarolRef.current = openFarol;
  });
  const pickFarol = useCallback((index: number) => {
    openFarolRef.current(index);
  }, []);

  // Al cerrar una tarjeta se desmonta el botón enfocado: el foco vuelve al escenario.
  useEffect(() => {
    if (card === null) {
      const host = rootRef.current?.closest<HTMLElement>('[role="application"]');
      if (host && !host.contains(document.activeElement)) host.focus();
    }
  }, [card]);

  // Digitos: abrir el farol N y, ya abierto, elegir el grupo. Una sola escucha para todo.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || pausedRef.current) return;
      const host = rootRef.current?.closest('[role="application"]');
      if (!host?.contains(document.activeElement) && document.activeElement !== document.body)
        return;
      const active = document.activeElement;
      if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return;
      const current = cardRef.current;
      if (current?.kind === 'dilema') return;
      const digit = ['1', '2', '3', '4', '5'].indexOf(event.key);
      if (current?.kind === 'farol') {
        if (event.key === 'Backspace') {
          event.preventDefault();
          openCard(null);
        } else if (digit === 4 || event.key === '0') {
          event.preventDefault();
          chooseGroup(null);
        } else if (digit >= 0) {
          event.preventDefault();
          const group = BOSQUE.groups[digit];
          if (group) chooseGroup(group.id);
        }
      } else if (digit >= 0 && digit < 4) {
        event.preventDefault();
        openFarol(digit);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
    };
  });

  const frame = useRef({ since: 0 });
  const tick = (dt: number) => {
    if (state.outcome !== 'en-curso') return;
    const open = cardRef.current;
    const slow =
      open?.kind === 'dilema' ? (open.feedback ? 0 : 0.2) : open ? (calm ? 0.2 : 0.35) : 1;
    const events =
      slow > 0
        ? stepDefense(
            state,
            config,
            BOSQUE,
            { move: controls.move() },
            Math.min(0.05, dt) * slow,
            random,
          )
        : [];
    if (controls.take('fire')) events.push(...fireCeiba(state, config));
    if (controls.take('interact') && !cardRef.current) {
      const nearest = snapshot(state).near;
      if (nearest >= 0) openFarol(nearest);
    }
    const shown = cardRef.current;
    if (shown?.kind === 'farol' && !state.faroles[shown.index]?.need) openCard(null);
    if (state.dilemma && !cardRef.current) openDilemma();
    frame.current.since += dt;
    if (events.length > 0 || frame.current.since > 0.15) {
      frame.current.since = 0;
      onEvents(events);
    }
  };

  const openIndex = card?.kind === 'farol' ? card.index : -1;
  const openNeed = openIndex >= 0 ? hud.faroles[openIndex]?.need : null;

  const density = Math.max(0, 1 - hud.hits / goal);
  const phase = phaseFor(hud.hits, goal);

  return (
    <GameStage
      label={`Defender el bosque juntos: ${content.bruma.name}`}
      controls={controls}
      camera={{ fov: 42, position: [0, 19, 15], near: 0.5, far: 220 }}
      paused={paused}
      onPause={(next) => {
        pausedRef.current = next;
        setPaused(next);
      }}
      help={HELP}
      announce={announce}
      onAccessible={onAccessible}
      hud={
        <div ref={rootRef} className="absolute inset-0">
          <div className="absolute top-3 left-3 grid w-44 gap-2 sm:w-64">
            <HudPanel className="grid gap-2">
              <HudMeter
                label={content.bruma.name}
                value={density}
                text={`Fase ${String(phase)} de 3`}
                tone="fog"
              />
              <HudMeter
                label="Luz de la ceiba"
                value={hud.dilemma ? 1 : hud.bloom}
                text={hud.dilemma ? 'Pide decidir' : pct(hud.bloom)}
              />
              <HudMeter
                label="Haz de la ceiba"
                value={Math.min(1, hud.charge)}
                text={hud.charge >= 1 ? `${String(Math.floor(hud.charge))} disparo` : 'Sin carga'}
              />
              <HudMeter
                label="Participación"
                value={hud.participation}
                text={pct(hud.participation)}
                tone={hud.participation < 0.6 ? 'route' : 'low'}
              />
              <LightsHud lights={hud.lights} max={lights} />
            </HudPanel>
            <HudPanel className="hidden gap-2 sm:grid">
              <p className="toponym text-[0.625rem] text-sea-100">Grupos de la comunidad</p>
              {BOSQUE.groups.map((g, i) => {
                const runtime = hud.groups.find((r) => r.id === g.id);
                const energy = runtime?.energy ?? 1;
                return (
                  <HudMeter
                    key={g.id}
                    label={`${String(i + 1)} · ${g.short}`}
                    value={energy}
                    text={
                      runtime?.resting
                        ? 'Descansa'
                        : runtime?.at
                          ? `En ${farolName(runtime.at)}`
                          : 'Libre'
                    }
                    tone={runtime?.resting || energy < 0.3 ? 'route' : 'low'}
                  />
                );
              })}
            </HudPanel>
          </div>

          <div className="absolute inset-x-3 bottom-44 sm:inset-x-auto sm:top-16 sm:right-3 sm:bottom-auto sm:w-72">
            <HudPanel className="grid gap-1.5">
              <p className="toponym text-[0.625rem] text-sea-100">Faroles</p>
              {hud.faroles.map((f, i) => (
                <button
                  key={f.id}
                  type="button"
                  aria-keyshortcuts={String(i + 1)}
                  onClick={() => {
                    openFarol(i);
                  }}
                  className={cx(
                    'flex min-h-11 w-full items-start gap-2 border-[1.5px] px-2 py-1 text-left text-xs text-plate',
                    'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-land-sun',
                    hud.near === i ? 'border-land-sun' : 'border-sea-300',
                    f.need ? 'bg-sea-900' : 'opacity-60',
                  )}
                >
                  <kbd className="mt-0.5 border-[1.5px] border-sea-100 px-1 font-display font-bold">
                    {i + 1}
                  </kbd>
                  <span className="min-w-0">
                    <span className="block font-semibold">{farolName(f.id)}</span>
                    <span className="block text-sea-100">
                      {f.need
                        ? `Pide ${saberLabel(BOSQUE, f.need.saber)} · ${f.group ? groupName(f.group) : 'sin atender'}`
                        : 'Sin niebla'}
                    </span>
                  </span>
                </button>
              ))}
            </HudPanel>
          </div>

          {banner && <Banner text={banner.text} at={banner.at} />}

          <div className="absolute inset-x-3 bottom-3 flex flex-col items-start gap-2 sm:bottom-4 sm:left-4 sm:max-w-md">
            {card?.kind === 'farol' && openNeed ? (
              <FarolCard
                hud={hud}
                index={card.index}
                need={openNeed}
                onChoose={chooseGroup}
                onCancel={() => {
                  openCard(null);
                }}
              />
            ) : card?.kind === 'dilema' ? (
              <DecisionCard
                title="La ceiba pide decidir entre todos"
                item={card.item}
                feedback={card.feedback}
                onChoose={chooseDilemma}
                onContinue={() => {
                  openCard(null);
                  onBrujula(null);
                }}
                continueLabel="Volver al bosque"
                className="max-w-md"
              />
            ) : (
              <>
                {hud.charge >= 1 && (
                  <button
                    type="button"
                    className={cx(STAGE_BUTTON, 'pointer-events-auto')}
                    onClick={fire}
                  >
                    <kbd className="font-display text-xs font-bold">Espacio</kbd> Disparar el haz de
                    la ceiba
                  </button>
                )}
                <KeyHint keys={hud.near >= 0 ? 'E' : '1 a 4'}>
                  {hud.near >= 0
                    ? `Atender el farol ${farolName(hud.faroles[hud.near]?.id ?? '')}`
                    : 'Atender el farol de ese número'}
                </KeyHint>
              </>
            )}
          </div>
        </div>
      }
    >
      <BosqueScene state={state} tint={tint} still={still} goal={goal} onOpenFarol={pickFarol} />
      <Ticker onFrame={tick} />
    </GameStage>
  );
}

/** Avanza el juego en cada cuadro del lienzo. */
function Ticker({ onFrame }: { onFrame: (dt: number) => void }) {
  useFrame((_, dt) => {
    onFrame(dt);
  });
  return null;
}

function FarolCard({
  hud,
  index,
  need,
  onChoose,
  onCancel,
}: {
  hud: Hud;
  index: number;
  need: Need;
  onChoose: (groupId: string | null) => void;
  onCancel: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  const farol = hud.faroles[index];
  const info = BOSQUE.faroles[index];
  return (
    <section
      aria-labelledby="farol-titulo"
      className="pointer-events-auto w-full max-w-md bg-plate p-4 text-ink [--focus:var(--route)] plate-rule"
    >
      <p className="toponym text-[0.625rem] text-ink-soft">
        Farol {String(index + 1)} · {info?.name}
      </p>
      <h2
        id="farol-titulo"
        ref={heading}
        tabIndex={-1}
        className="mt-1 font-display text-base font-extrabold outline-none"
      >
        {need.text}
      </h2>
      <p className="mt-1 text-xs text-ink-soft">¿Qué grupo sabe hacerlo? Elige con 1 a 4.</p>
      <ul className="mt-2 grid gap-1.5">
        {BOSQUE.groups.map((g, i) => {
          const runtime = hud.groups.find((r) => r.id === g.id);
          const resting = runtime?.resting ?? false;
          const here = farol?.group === g.id;
          return (
            <li key={g.id}>
              <button
                type="button"
                disabled={resting}
                aria-keyshortcuts={String(i + 1)}
                onClick={() => {
                  onChoose(g.id);
                }}
                className="flex min-h-11 w-full items-center gap-3 border-[1.5px] border-plate-edge px-3 py-1.5 text-left text-sm hover:border-ink disabled:opacity-55"
              >
                <kbd
                  aria-hidden="true"
                  className="inline-flex size-6 shrink-0 items-center justify-center border-[1.5px] border-ink font-display text-xs font-bold"
                >
                  {i + 1}
                </kbd>
                <span
                  aria-hidden="true"
                  className="size-3 shrink-0 border border-ink"
                  style={{ background: groupColor(g.id) }}
                />
                <span className="grow">
                  <span className="font-semibold">{g.name}</span>
                  <span className="block text-xs text-ink-soft">
                    {here ? 'Ya atiende este farol · ' : ''}
                    {resting
                      ? 'Descansa bajo la ceiba'
                      : `Energía ${pct(runtime?.energy ?? 1)}${runtime?.at && !here ? ` · en ${farolNameOf(runtime.at)}` : ''}`}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-2 flex flex-wrap gap-2">
        {farol?.group && (
          <button
            type="button"
            aria-keyshortcuts="5"
            onClick={() => {
              onChoose(null);
            }}
            className="inline-flex min-h-11 items-center gap-2 border-[1.5px] border-plate-edge px-3 text-sm hover:border-ink"
          >
            <kbd className="font-display text-xs font-bold">5</kbd> Dejar libre el farol
          </button>
        )}
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex min-h-11 items-center gap-2 border-[1.5px] border-plate-edge px-3 text-sm hover:border-ink"
        >
          Cancelar <kbd className="font-display text-xs font-bold">Retroceso</kbd>
        </button>
      </div>
    </section>
  );
}

const farolNameOf = (id: string) => BOSQUE.faroles.find((f) => f.id === id)?.short ?? id;
