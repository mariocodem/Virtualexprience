import { useFrame } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { mercadoContentSchema, type QuizItem } from '@/data/contentSchemas';
import mercadoRaw from '@/data/content/gerencia-mercado.json';
import { cx } from '@/ui/cx';
import { Controls } from '../../shared/controls';
import { GameStage } from '../../shared/GameStage';
import {
  Banner,
  DecisionCard,
  HudMeter,
  HudPanel,
  KeyHint,
  type DecisionFeedback,
} from '../../shared/hud';
import { brumaTint } from '../../shared/palette';
import { Bruma3D } from '../../shared/scene/Bruma3D';
import { LightBeam } from '../../shared/scene/Hazards';
import { STAGE_BUTTON, type ControlHelp } from '../../shared/stage';
import type { ArenaProps } from '../../types';
import { gerencia3d } from '../data/schema';
import { marketDecisions, pickDecision } from './decisions';
import {
  assignSailor,
  bearingToBruma,
  aimTolerance,
  brumaDensity,
  chargeShip,
  setCrew,
  createShip,
  stepShip,
  strengthenShip,
  STATIONS,
  type Crew,
  type ShipConfig,
  type ShipEvent,
  type ShipState,
  type Station,
} from './ship';
import { AimGuide, Hazards, Islet, Sea, SeaCamera, SeaLights, ShipModel } from './TimonScene';

const HELP: ControlHelp[] = [
  { keys: 'A / D o ← →', action: 'Timón: girar a babor y a estribor' },
  { keys: 'W / S o ↑ ↓', action: 'Velas: abrirlas y recogerlas' },
  { keys: 'V · B · L', action: 'Mandar un marinero a las velas, la bomba o la linterna' },
  { keys: '1 a 4', action: 'Responder el parte del contramaestre' },
  {
    keys: 'Espacio o J',
    action: 'Disparar el haz por la proa (necesita carga y linterna atendida)',
  },
  { keys: 'Esc o P', action: 'Pausa' },
];

const KEYS: Record<string, Station> = { KeyV: 'velas', KeyB: 'bomba', KeyL: 'linterna' };

interface Embate {
  item: QuizItem;
  feedback: DecisionFeedback | null;
}

interface Hud {
  lights: number;
  charge: number;
  water: number;
  trim: number;
  speed: number;
  hits: number;
  phase: number;
  crew: Crew;
  angle: number;
  wind: number;
  aligned: boolean;
}

const snapshot = (state: ShipState, config: ShipConfig): Hud => {
  const { angle, distance } = bearingToBruma(state);
  const rel = Math.atan2(
    Math.sin(state.wind - state.heading),
    Math.cos(state.wind - state.heading),
  );
  return {
    lights: state.lights,
    charge: state.charge,
    water: state.water,
    trim: state.trim,
    speed: state.speed,
    hits: state.bruma.hits,
    phase: state.bruma.phase,
    crew: { ...state.crew },
    angle,
    wind: rel,
    aligned: Math.abs(angle) <= aimTolerance(config.calm, state.crew.linterna, distance),
  };
};

/**
 * Llevar el timón (Gerencia+): combate en barco alrededor del islote de la
 * Bruma de la deriva. Se gobierna con timón y velas, se reparte la
 * tripulación entre velas, bomba y linterna, y el contramaestre trae partes
 * con datos del mercado: decidir bien carga la linterna; decidir mal
 * fortalece a la Bruma. El haz sale por la proa: hay que gobernar para apuntar.
 */
export function TimonArena({
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
  const config = useMemo<ShipConfig>(
    () => ({ level, goal, lights, calm }),
    [level, goal, lights, calm],
  );
  const [state] = useState<ShipState>(() => createShip(config));
  const market = useMemo(() => marketDecisions(mercadoContentSchema.parse(mercadoRaw)), []);
  const [paused, setPaused] = useState(false);
  const [hud, setHud] = useState<Hud>(() => snapshot(state, config));
  const [announce, setAnnounce] = useState('');
  const [banner, setBanner] = useState<{ text: string; at: number } | null>({
    text: 'Gobierna con A y D hasta apuntar la proa a la Bruma',
    at: 0,
  });
  const [embate, setEmbate] = useState<Embate | null>(null);
  const used = useRef<string[]>([]);
  const tally = useRef({ correct: 0, total: 0 });
  const nextAt = useRef(4);
  const ended = useRef(false);
  const random = useRef(Math.random).current;
  const tint = brumaTint(island.id);

  const sync = useCallback(() => {
    setHud(snapshot(state, config));
  }, [state, config]);

  const shout = (text: string) => {
    setBanner({ text, at: performance.now() });
  };

  const end = (outcome: 'victoria' | 'retirada') => {
    if (ended.current) return;
    ended.current = true;
    const { correct, total } = tally.current;
    onEnd({ outcome, accuracy: total === 0 ? 0 : correct / total, decisions: total });
  };

  const onEvents = (events: ShipEvent[]) => {
    for (const event of events) {
      if (event.type === 'herido')
        setAnnounce(`Un golpe al casco. Aguanta ${String(event.lights)} más.`);
      else if (event.type === 'fase')
        shout(`La Bruma cambia de forma: fase ${String(event.phase)}`);
      else if (event.type === 'haz')
        setAnnounce(event.hit ? 'Tu haz atraviesa la Bruma.' : 'El haz se pierde en la niebla.');
      else if (event.type === 'sin-carga')
        shout('Sin carga: decide con los datos del contramaestre');
      else if (event.type === 'sin-linterna') shout(gerencia3d.tips.noLantern);
      else if (event.type === 'agua-alta') {
        shout(gerencia3d.tips.waterHigh);
        setAnnounce(gerencia3d.tips.waterHigh);
      } else if (event.type === 'victoria') end('victoria');
      else if (event.type === 'retirada') end('retirada');
    }
    sync();
  };

  const open = () => {
    if (state.outcome !== 'en-curso') return;
    nextAt.current = Number.POSITIVE_INFINITY;
    const item = pickDecision(
      content.items,
      market,
      tiers[state.bruma.phase - 1] ?? 3,
      used.current,
      random,
    );
    used.current.push(item.id);
    controls.clear();
    setEmbate({ item, feedback: null });
    setAnnounce(`Parte del contramaestre: ${item.prompt}`);
  };

  const choose = (optionId: string) => {
    if (!embate || embate.feedback || state.outcome !== 'en-curso') return;
    const option = embate.item.options.find((o) => o.id === optionId);
    if (!option) return;
    tally.current.total += 1;
    if (option.correct) {
      tally.current.correct += 1;
      chargeShip(state);
      shout('¡Linterna cargada! Apunta la proa a la Bruma y dispara');
    } else {
      strengthenShip(state);
    }
    onDecision({ correct: option.correct, tier: embate.item.tier, itemId: embate.item.id });
    onBrujula({ text: embate.item.explanation, source: 'local' });
    setEmbate({ ...embate, feedback: { correct: option.correct, text: option.feedback } });
    sync();
  };

  const close = () => {
    setEmbate(null);
    nextAt.current = state.time + (state.charge > 0 ? 7 : 4);
    onBrujula(null);
    // Sin tarjeta, el teclado vuelve al escenario.
    window.setTimeout(() => {
      document.querySelector<HTMLElement>('[role="application"]')?.focus();
    }, 0);
  };

  const send = useCallback(
    (station: Station) => {
      if (state.outcome !== 'en-curso') return;
      setCrew(state, assignSailor(state.crew, station));
      const c = state.crew;
      setAnnounce(
        `Velas ${String(c.velas)}, bomba ${String(c.bomba)}, linterna ${String(c.linterna)}.`,
      );
      sync();
    },
    [state, sync],
  );

  // V, B y L mandan un marinero; solo con el foco dentro del juego y sin pausa.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const station = KEYS[event.code];
      if (!station || paused || event.repeat || event.altKey || event.ctrlKey || event.metaKey)
        return;
      const active = document.activeElement;
      if (!active?.closest('[role="application"]')) return;
      if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return;
      event.preventDefault();
      send(station);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
    };
  }, [paused, send]);

  const timeScale = () => (embate && !embate.feedback ? (calm ? 0.2 : 0.45) : embate ? 0 : 1);
  const density = Math.max(0, 1 - hud.hits / goal);
  const ready = hud.charge >= 1 && hud.crew.linterna > 0;

  return (
    <GameStage
      label={`Arena de la ${content.bruma.name}: llevar el timón`}
      controls={controls}
      paused={paused}
      onPause={setPaused}
      help={HELP}
      announce={announce}
      onAccessible={onAccessible}
      touch={!embate}
      camera={{ fov: 42, position: [0, 24, 24], near: 0.5, far: 220 }}
      hud={
        <>
          <div className="absolute top-3 left-3 grid w-44 gap-2 max-sm:top-14 sm:w-64">
            <HudPanel className="grid gap-2">
              <HudMeter
                label={content.bruma.name}
                value={density}
                text={`Fase ${String(hud.phase)} de 3`}
                tone="fog"
              />
              <HudMeter
                label="Carga de la linterna"
                value={Math.min(1, hud.charge)}
                text={hud.charge >= 1 ? `${String(Math.floor(hud.charge))} disparo` : 'Sin carga'}
              />
              <HudMeter
                label="Agua en la bodega"
                value={hud.water}
                text={`${String(Math.round(hud.water * 100))} %`}
                tone="low"
              />
              <HudMeter
                label="Velas"
                value={hud.trim}
                text={`${String(Math.round(hud.speed * 10) / 10)} nudos`}
                tone="route"
              />
              <HullHud lights={hud.lights} max={lights} />
            </HudPanel>
          </div>
          <div className="absolute top-16 right-3 grid w-40 gap-2 max-sm:top-14 max-sm:w-36 sm:top-[4.25rem] sm:w-44">
            <CrewBoard crew={hud.crew} onSend={send} />
            <div className="max-sm:hidden">
              <Compass angle={hud.angle} wind={hud.wind} aligned={hud.aligned && ready} />
            </div>
          </div>
          {banner && <Banner text={banner.text} at={banner.at} />}
          <div className="absolute inset-x-3 bottom-3 flex flex-col items-start gap-2 sm:bottom-4 sm:left-4">
            {embate ? (
              <DecisionCard
                title="El contramaestre trae un parte · decide con los datos"
                item={embate.item}
                feedback={embate.feedback}
                onChoose={choose}
                onContinue={close}
                continueLabel="Volver al timón"
                className="max-w-md"
              />
            ) : (
              <div className="pointer-events-auto flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={cx(STAGE_BUTTON, !ready && 'opacity-70')}
                  onClick={() => {
                    controls.press('fire');
                  }}
                  aria-keyshortcuts="Space"
                >
                  <kbd className="text-xs">Espacio</kbd> Disparar el haz
                </button>
                <KeyHint keys="A D">Timón</KeyHint>
                <KeyHint keys="W S">Velas</KeyHint>
              </div>
            )}
          </div>
        </>
      }
    >
      <SeaLights tint={tint} />
      <Sea still={still} />
      <Islet tint={tint} />
      <Rig
        state={state}
        config={config}
        controls={controls}
        tint={tint}
        still={still}
        timeScale={timeScale}
        onEvents={onEvents}
        onTick={sync}
        due={() =>
          !embate &&
          state.outcome === 'en-curso' &&
          state.time >= nextAt.current &&
          state.charge < 2
        }
        onOpen={open}
      />
    </GameStage>
  );
}

/** Avanza el barco en cada cuadro y dibuja todo lo que se mueve. */
function Rig({
  state,
  config,
  controls,
  tint,
  still,
  timeScale,
  onEvents,
  onTick,
  due,
  onOpen,
}: {
  state: ShipState;
  config: ShipConfig;
  controls: Controls;
  tint: string;
  still: boolean;
  timeScale: () => number;
  onEvents: (events: ShipEvent[]) => void;
  onTick: () => void;
  due: () => boolean;
  onOpen: () => void;
}) {
  const random = useRef(Math.random).current;
  const acc = useRef(0);

  useFrame((_, dt) => {
    if (due()) onOpen();
    const scale = timeScale();
    if (scale <= 0) return;
    const move = controls.move();
    const events = stepShip(
      state,
      config,
      { rudder: move.x, sail: -move.z, fire: controls.take('fire') },
      Math.min(0.05, dt) * scale,
      random,
    );
    if (events.length > 0) onEvents(events);
    acc.current += dt;
    if (acc.current > 0.12) {
      acc.current = 0;
      onTick();
    }
  });

  return (
    <>
      <ShipModel state={state} still={still} />
      <Hazards state={state} config={config} />
      <AimGuide state={state} config={config} />
      <Bruma3D
        get={() => ({
          x: 0,
          z: 0,
          y: 3.4,
          density: brumaDensity(state, config),
          stagger: state.bruma.stagger,
        })}
        tint={tint}
        eyes={2}
        look={() => state}
        still={still}
        scale={1.6}
      />
      <LightBeam get={() => state.beam} y={1.2} />
      <SeaCamera state={state} still={still} />
    </>
  );
}

/** Casco: los impactos que aguanta antes de retirarse. */
function HullHud({ lights, max }: { lights: number; max: number }) {
  return (
    <p className="flex items-center gap-2 text-xs text-plate">
      <span className="font-semibold">Casco</span>
      <span aria-hidden="true" className="flex gap-1">
        {Array.from({ length: max }, (_, i) => (
          <span
            key={i}
            className={cx(
              'inline-block h-3 w-4 border-[1.5px] border-sea-100',
              i < lights ? 'bg-land-sun' : 'bg-transparent',
            )}
          />
        ))}
      </span>
      <span className="sr-only">
        {lights} de {max} tablones sanos
      </span>
    </p>
  );
}

/** Reparto de la tripulación: un botón por estación, con las teclas V, B y L. */
function CrewBoard({ crew, onSend }: { crew: Crew; onSend: (station: Station) => void }) {
  return (
    <HudPanel className="grid gap-1.5 p-2">
      <p className="toponym text-[0.625rem] text-sea-100">Tripulación</p>
      {STATIONS.map((station) => {
        const info = gerencia3d.stations[station];
        const n = crew[station];
        return (
          <button
            key={station}
            type="button"
            onClick={() => {
              onSend(station);
            }}
            title={info.hint}
            aria-keyshortcuts={info.key}
            aria-label={`Mandar un marinero a ${info.label.toLowerCase()} (tecla ${info.key}). Ahora hay ${String(n)}. ${info.hint}`}
            className={cx(
              'flex min-h-10 items-center justify-between gap-2 border-[1.5px] px-2 text-left text-sm font-semibold',
              'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-land-sun',
              n === 0
                ? 'border-route text-plate'
                : 'border-sea-300 text-plate hover:border-land-sun',
            )}
          >
            <span>{info.label}</span>
            <span aria-hidden="true" className="flex items-center gap-1">
              {Array.from({ length: 3 }, (_, i) => (
                <span
                  key={i}
                  className={cx(
                    'inline-block size-2.5 rounded-full border border-sea-100',
                    i < n ? 'bg-land-sun' : 'bg-transparent',
                  )}
                />
              ))}
              <kbd className="ml-1 border border-sea-100 px-1 text-[0.625rem]">{info.key}</kbd>
            </span>
          </button>
        );
      })}
    </HudPanel>
  );
}

/** Brújula: la proa siempre arriba, la Bruma como punto dorado y el viento como flecha. */
function Compass({ angle, wind, aligned }: { angle: number; wind: number; aligned: boolean }) {
  const at = (a: number, r: number) => ({ x: 34 + Math.sin(a) * r, y: 34 - Math.cos(a) * r });
  const bruma = at(angle, 24);
  const tip = at(wind, 22);
  const tail = at(wind + Math.PI, 14);
  const side = angle > 0.05 ? 'a estribor' : angle < -0.05 ? 'a babor' : 'de frente';
  return (
    <HudPanel className="flex items-center gap-2 p-2" aria-hidden="true">
      <svg viewBox="0 0 68 68" aria-hidden="true" className="size-16 shrink-0">
        <circle cx="34" cy="34" r="30" fill="none" stroke="#9ccbe4" strokeWidth="1.5" />
        <path d="M34 2 L38 10 L30 10 Z" fill="#fed300" />
        <line
          x1={tail.x}
          y1={tail.y}
          x2={tip.x}
          y2={tip.y}
          stroke="#9ccbe4"
          strokeWidth="2"
          strokeDasharray="3 2"
        />
        <circle cx={tip.x} cy={tip.y} r="2.5" fill="#9ccbe4" />
        <circle
          cx={bruma.x}
          cy={bruma.y}
          r={aligned ? 6 : 4.5}
          fill={aligned ? '#fed300' : '#e3ebf1'}
          stroke="#0f2e5c"
          strokeWidth="1"
        />
      </svg>
      <p className="text-xs text-plate">
        <span className="font-semibold">Brújula</span>
        <br />
        <span>{aligned ? 'Apuntando: ¡dispara!' : `Bruma ${side}`}</span>
        <br />
        <span className="text-sea-100">Viento: punteado</span>
      </p>
    </HudPanel>
  );
}
