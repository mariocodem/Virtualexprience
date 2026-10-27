import { useFrame } from '@react-three/fiber';
import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { seeded } from '@/boss/engine';
import { ISLE } from '@/world/palette';
import {
  chargeArena,
  createArena,
  strengthenBruma,
  type ArenaConfig,
  type ArenaEvent,
  type ArenaState,
} from '../../shared/arena/core';
import { Controls } from '../../shared/controls';
import { GameStage } from '../../shared/GameStage';
import { Banner, HudMeter, HudPanel, KeyHint, LightsHud } from '../../shared/hud';
import { brumaTint } from '../../shared/palette';
import { ArenaRig } from '../../shared/scene/ArenaRig';
import { ArenaLights, ArenaPlatform } from '../../shared/scene/ArenaScenery';
import type { ControlHelp } from '../../shared/stage';
import type { ArenaProps } from '../../types';
import { personName } from '../banco/model';
import {
  applyBurden,
  cannonLevel,
  collectConfig,
  createCollect,
  deliver,
  heldBubble,
  nearestBubble,
  pickUp,
  placeAt,
  resolveDelivery,
  spendCharge,
  stepCollect,
  type Bubble,
  type CollectConfig,
  type CollectState,
  type Place,
  type Tier,
} from './collect';
import { BubbleOrb, Bin, CannonBench, ShopProps } from './CanonScene';

const RADIUS = 9;

const HELP: ControlHelp[] = [
  { keys: 'WASD o flechas', action: 'Moverte (cargar una burbuja te frena)' },
  {
    keys: 'E o Enter',
    action: 'Recoger una burbuja cerca, o entregarla en el banco o la papelera',
  },
  {
    keys: '1 y 2 (ritmo tranquilo)',
    action: 'Mandar la burbuja al banco (1) o a la papelera (2) desde donde estés',
  },
  { keys: 'Ratón', action: 'Apuntar la linterna' },
  { keys: 'Espacio o clic', action: 'Disparar el haz (necesita carga)' },
  { keys: 'Mayús', action: 'Esquivar' },
  { keys: 'Esc o P', action: 'Pausa' },
];

interface View {
  bubbles: Bubble[];
  held: Bubble | null;
  near: Bubble | null;
  place: Place | null;
  level: number;
}

const snapshot = (collect: CollectState, near: Bubble | null, place: Place | null): View => ({
  bubbles: [...collect.bubbles],
  held: heldBubble(collect),
  near,
  place,
  level: cannonLevel(collect),
});

/**
 * Arena «Prototipar el cañón de luz» (ActivaTuIdea): recolección y
 * fabricación. Los comentarios de quienes prueban el cañón flotan por el taller;
 * se recoge uno (E), cargarlo frena, y se decide si va al banco de trabajo o a
 * la papelera. Lo que se repite mejora el cañón y lo carga; una ocurrencia o un
 * caso aislado lo atasca y fortalece a la Bruma. La Bruma ataca mientras tanto.
 */
export function PrototiparCanon({
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
  const config = useMemo<ArenaConfig>(
    () => ({ radius: RADIUS, level, goal, lights, calm }),
    [level, goal, lights, calm],
  );
  const cconfig = useMemo(() => collectConfig(calm, level), [calm, level]);
  const [state] = useState<ArenaState>(() => createArena(config));
  const [collect] = useState<CollectState>(createCollect);
  const [paused, setPaused] = useState(false);
  const [hud, setHud] = useState(() => ({ ...state.player, ...state.bruma, charge: state.charge }));
  const [view, setView] = useState<View>(() => snapshot(collect, null, null));
  const [announce, setAnnounce] = useState('');
  const [banner, setBanner] = useState<{ text: string; at: number } | null>(null);
  const tally = useRef({ correct: 0, total: 0 });
  const ended = useRef(false);
  const [random] = useState(() => seeded(Math.floor(Math.random() * 1e9)));
  const tint = brumaTint(island.id);

  const sync = useCallback(() => {
    setHud({ ...state.player, ...state.bruma, charge: state.charge });
  }, [state]);

  const shout = (text: string) => {
    setBanner({ text, at: performance.now() });
  };

  const end = (outcome: 'victoria' | 'retirada') => {
    if (ended.current) return;
    ended.current = true;
    const { correct, total } = tally.current;
    onEnd({ outcome, accuracy: total === 0 ? 0 : correct / total, decisions: total });
  };

  const onEvents = (events: ArenaEvent[]) => {
    for (const event of events) {
      if (event.type === 'herido')
        setAnnounce(`La Bruma te alcanza. Te quedan ${String(event.lights)} luces.`);
      if (event.type === 'fase') {
        const taunts = content.bruma.taunts[event.phase === 2 ? 'phase2' : 'phase3'];
        shout(taunts[0] ?? `La Bruma cambia de forma: fase ${String(event.phase)}`);
      }
      if (event.type === 'haz')
        setAnnounce(event.hit ? 'Tu haz atraviesa la Bruma.' : 'El haz se pierde en la niebla.');
      if (event.type === 'sin-carga')
        shout('Sin carga: lleva un comentario que se repite al banco');
      if (event.type === 'victoria') end('victoria');
      if (event.type === 'retirada') end('retirada');
    }
    sync();
  };

  const refresh = (near: Bubble | null, place: Place | null) => {
    setView(snapshot(collect, near, place));
  };

  const grab = (bubble: Bubble) => {
    if (!pickUp(collect, bubble)) return;
    onBrujula(null);
    setAnnounce(
      `Recogiste el comentario de ${personName(bubble.userId)}: ${bubble.quote}. Llévalo al banco de trabajo, a la izquierda, o a la papelera, a la derecha.`,
    );
    refresh(null, placeAt(state.player));
  };

  const resolve = (place: Place) => {
    const bubble = heldBubble(collect);
    if (!bubble || state.outcome !== 'en-curso') return;
    const result = resolveDelivery(bubble.kind, place);
    deliver(collect, bubble, result);
    tally.current.total += 1;
    if (result.correct) tally.current.correct += 1;
    if (result.effect === 'carga') {
      chargeArena(state);
      shout('¡Cañón mejorado y cargado! Apunta y dispara');
    } else if (result.effect === 'atasco') {
      strengthenBruma(state);
      spendCharge(state);
      shout('¡El cañón se atasca!');
    } else if (result.effect === 'perdido') {
      strengthenBruma(state);
      shout('Evidencia perdida');
    }
    onDecision({ correct: result.correct, tier: bubble.tier, itemId: bubble.feedbackId });
    onBrujula({ text: `${result.message} ${bubble.why}`, source: 'local' });
    setAnnounce(result.message);
    sync();
    refresh(null, placeAt(state.player));
  };

  const interact = () => {
    if (state.outcome !== 'en-curso') return;
    const held = heldBubble(collect);
    if (!held) {
      const near = nearestBubble(collect, state.player, cconfig.reach);
      if (near) grab(near);
      return;
    }
    const place = placeAt(state.player);
    if (place) resolve(place);
    else shout('Llévala al banco (izquierda) o a la papelera (derecha)');
  };

  // Con ritmo tranquilo, 1 y 2 mandan la burbuja sin tener que caminar.
  const onKey = useEffectEvent((event: KeyboardEvent) => {
    if (paused || !calm || event.altKey || event.ctrlKey || event.metaKey) return;
    if (!heldBubble(collect)) return;
    if (event.key === '1') resolve('banco');
    if (event.key === '2') resolve('papelera');
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

  const density = Math.max(0, 1 - hud.hits / goal);
  const held = view.held;
  const near = view.near;

  return (
    <GameStage
      label={`Arena de la ${content.bruma.name}`}
      controls={controls}
      paused={paused}
      onPause={setPaused}
      help={HELP}
      announce={announce}
      onAccessible={onAccessible}
      hud={
        <>
          <div className="absolute top-3 left-3 grid w-64 gap-2">
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
                label="Cañón de luz"
                value={view.level / 3}
                text={`Mejora ${String(view.level)} de 3`}
                tone="route"
              />
              <LightsHud lights={hud.lights} max={lights} />
            </HudPanel>
            <HudPanel className="grid gap-1 max-sm:hidden">
              <p className="text-xs font-semibold">Comentarios en el aire</p>
              <ul className="grid gap-1">
                {view.bubbles.map((b) => (
                  <li
                    key={b.id}
                    className={
                      'border-l-[3px] px-2 py-1 text-xs ' +
                      (b.held
                        ? 'border-land-sun bg-sea-800'
                        : near?.id === b.id
                          ? 'border-land-sun'
                          : 'border-sea-300')
                    }
                  >
                    <span className="font-semibold">{personName(b.userId)}:</span> «{b.quote}»
                  </li>
                ))}
              </ul>
            </HudPanel>
          </div>
          {banner && <Banner text={banner.text} at={banner.at} />}
          <div className="absolute inset-x-3 bottom-3 flex flex-col items-start gap-2 sm:bottom-4 sm:left-4">
            {(held ?? near) && (
              <HudPanel className="max-w-md">
                <p className="text-xs text-sea-100">
                  {held ? 'Llevas el comentario de' : 'Cerca'}{' '}
                  {personName((held ?? near)?.userId ?? '')}
                </p>
                <p className="font-display text-base font-bold">«{(held ?? near)?.quote}»</p>
              </HudPanel>
            )}
            {held ? (
              <KeyHint keys="E">
                {view.place === 'banco'
                  ? 'Entregar en el banco: ¿se repite?'
                  : view.place === 'papelera'
                    ? 'Tirar a la papelera: ¿no es evidencia?'
                    : calm
                      ? 'Banco (1) o papelera (2), o camina hasta uno y pulsa E'
                      : 'Llévala al banco (izquierda) o a la papelera (derecha)'}
              </KeyHint>
            ) : near ? (
              <KeyHint keys="E">Recoger la burbuja</KeyHint>
            ) : hud.charge >= 1 ? (
              <KeyHint keys="Espacio">Disparar el haz hacia la Bruma</KeyHint>
            ) : (
              <KeyHint keys="E">Acércate a una burbuja y recógela</KeyHint>
            )}
          </div>
        </>
      }
    >
      <ArenaLights />
      <ArenaPlatform radius={RADIUS} ground="#c9a672" rim={ISLE.activatuidea} />
      <ShopProps />
      <ArenaRig
        state={state}
        config={config}
        controls={controls}
        tint={tint}
        still={still}
        onEvents={onEvents}
      />
      <Collector
        state={state}
        collect={collect}
        cconfig={cconfig}
        controls={controls}
        tiers={tiers}
        random={random}
        onInteract={interact}
        onView={refresh}
      />
      <CannonBench
        level={view.level}
        charge={() => state.charge}
        jammed={() => collect.jam > 0}
        held={held !== null}
        still={still}
      />
      <Bin held={held !== null} />
      {view.bubbles.map((b) => (
        <BubbleOrb
          key={b.id}
          bubble={b}
          player={() => state.player}
          near={near?.id === b.id}
          still={still}
        />
      ))}
    </GameStage>
  );
}

/** Avanza la deriva de las burbujas, el peso de la carga y detecta qué hay al alcance. */
function Collector({
  state,
  collect,
  cconfig,
  controls,
  tiers,
  random,
  onInteract,
  onView,
}: {
  state: ArenaState;
  collect: CollectState;
  cconfig: CollectConfig;
  controls: Controls;
  tiers: ArenaProps['tiers'];
  random: () => number;
  onInteract: () => void;
  onView: (near: Bubble | null, place: Place | null) => void;
}) {
  const last = useRef<{ x: number; z: number } | null>(null);
  const seen = useRef<{ near: number | null; place: Place | null; held: number | null }>({
    near: null,
    place: null,
    held: null,
  });

  useFrame((_, dt) => {
    if (state.outcome !== 'en-curso') return;
    const { player } = state;
    const held = heldBubble(collect);
    if (held && last.current && player.dashing <= 0)
      applyBurden(player, last.current, cconfig.burden);
    last.current = { x: player.x, z: player.z };

    const phaseTier: Tier = tiers[state.bruma.phase - 1] ?? 3;
    const step = stepCollect(collect, cconfig, Math.min(0.05, dt), random, phaseTier);
    if (controls.take('interact')) onInteract();

    const nowHeld = heldBubble(collect);
    const near = nowHeld ? null : nearestBubble(collect, player, cconfig.reach);
    const place = placeAt(player);
    const prev = seen.current;
    if (
      step.changed ||
      (near?.id ?? null) !== prev.near ||
      place !== prev.place ||
      (nowHeld?.id ?? null) !== prev.held
    ) {
      seen.current = { near: near?.id ?? null, place, held: nowHeld?.id ?? null };
      onView(near, place);
    }
  });
  return null;
}
