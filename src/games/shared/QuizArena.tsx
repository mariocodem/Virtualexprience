import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useCallback, useMemo, useRef, useState } from 'react';
import type { Mesh, MeshStandardMaterial } from 'three';
import { pickItem } from '@/boss/engine';
import type { QuizItem } from '@/data/contentSchemas';
import { ATLAS, ISLE } from '@/world/palette';
import type { ArenaProps } from '../types';
import {
  chargeArena,
  createArena,
  strengthenBruma,
  type ArenaConfig,
  type ArenaEvent,
  type ArenaState,
} from './arena/core';
import { Controls } from './controls';
import { GameStage } from './GameStage';
import {
  Banner,
  DecisionCard,
  HudMeter,
  HudPanel,
  KeyHint,
  LightsHud,
  type DecisionFeedback,
} from './hud';
import { brumaTint } from './palette';
import { ArenaLights, ArenaPlatform } from './scene/ArenaScenery';
import { ArenaRig } from './scene/ArenaRig';
import { ARENA_HELP } from './stage';

const RADIUS = 9;
const BEACON_RING = 6;
const NEAR = 1.3;

interface Embate {
  item: QuizItem;
  feedback: DecisionFeedback | null;
}

const beaconSpot = (i: number, n: number) => {
  // De izquierda a derecha vistos desde la cámara, al frente de la plataforma.
  const angle = Math.PI / 2 - ((i - (n - 1) / 2) * Math.PI) / 3.2;
  return { x: Math.cos(angle) * BEACON_RING, z: Math.sin(angle) * BEACON_RING };
};

/**
 * Arena de faros de respuesta: la arena 3D de respaldo para cualquier isla y
 * el ejemplo de referencia del contrato `ArenaProps`. Cada embate levanta un
 * faro por opción; se responde llegando al faro y pulsando E, o con 1 a 4.
 * Acertar carga un disparo de la linterna; fallar fortalece a la Bruma.
 */
export function QuizArena({
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
  const [state] = useState<ArenaState>(() => createArena(config));
  const [paused, setPaused] = useState(false);
  const [hud, setHud] = useState(() => ({ ...state.player, ...state.bruma, charge: state.charge }));
  const [announce, setAnnounce] = useState('');
  const [banner, setBanner] = useState<{ text: string; at: number } | null>(null);
  const [embate, setEmbate] = useState<Embate | null>(null);
  const used = useRef<string[]>([]);
  const tally = useRef({ correct: 0, total: 0 });
  const nextAt = useRef(1.5);
  const ended = useRef(false);
  const random = useRef(Math.random).current;
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
      if (event.type === 'fase') shout(`La Bruma cambia de forma: fase ${String(event.phase)}`);
      if (event.type === 'haz')
        setAnnounce(event.hit ? 'Tu haz atraviesa la Bruma.' : 'El haz se pierde en la niebla.');
      if (event.type === 'sin-carga') shout('Sin carga: responde un embate en los faros');
      if (event.type === 'victoria') end('victoria');
      if (event.type === 'retirada') end('retirada');
    }
    sync();
  };

  const open = () => {
    if (state.outcome !== 'en-curso') return;
    nextAt.current = Number.POSITIVE_INFINITY;
    const item = pickItem(content.items, tiers[state.bruma.phase - 1] ?? 3, used.current, random);
    used.current.push(item.id);
    setEmbate({ item, feedback: null });
    setAnnounce(`Embate: ${item.prompt}`);
  };

  const choose = (optionId: string) => {
    if (!embate || embate.feedback || state.outcome !== 'en-curso') return;
    const option = embate.item.options.find((o) => o.id === optionId);
    if (!option) return;
    tally.current.total += 1;
    if (option.correct) {
      tally.current.correct += 1;
      chargeArena(state);
      shout('¡Linterna cargada! Apunta a la Bruma y dispara');
    } else {
      strengthenBruma(state);
    }
    onDecision({ correct: option.correct, tier: embate.item.tier, itemId: embate.item.id });
    onBrujula({ text: embate.item.explanation, source: 'local' });
    setEmbate({ ...embate, feedback: { correct: option.correct, text: option.feedback } });
    sync();
  };

  const close = () => {
    setEmbate(null);
    nextAt.current = state.time + (state.charge > 0 ? 3.5 : 1.8);
    onBrujula(null);
  };

  const timeScale = () => (embate && !embate.feedback ? (calm ? 0.2 : 0.4) : embate ? 0 : 1);
  const density = Math.max(0, 1 - hud.hits / goal);

  return (
    <GameStage
      label={`Arena de la ${content.bruma.name}`}
      controls={controls}
      paused={paused}
      onPause={setPaused}
      help={ARENA_HELP}
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
              <LightsHud lights={hud.lights} max={lights} />
            </HudPanel>
          </div>
          {banner && <Banner text={banner.text} at={banner.at} />}
          <div className="absolute inset-x-3 bottom-3 flex flex-col items-start gap-2 sm:bottom-4 sm:left-4">
            {embate ? (
              <DecisionCard
                title="Embate · ve al faro de tu respuesta o pulsa su número"
                item={embate.item}
                feedback={embate.feedback}
                onChoose={choose}
                onContinue={close}
                continueLabel="Volver al combate"
                className="max-w-md"
              />
            ) : hud.charge >= 1 ? (
              <KeyHint keys="Espacio">Disparar el haz hacia la Bruma</KeyHint>
            ) : (
              <KeyHint keys="Mayús">Esquivar los orbes mientras llega el próximo embate</KeyHint>
            )}
          </div>
        </>
      }
    >
      <ArenaLights />
      <ArenaPlatform radius={RADIUS} rim={ISLE[island.id]} />
      <ArenaRig
        state={state}
        config={config}
        controls={controls}
        tint={tint}
        still={still}
        timeScale={timeScale}
        onEvents={onEvents}
      />
      <Pacer
        state={state}
        controls={controls}
        embate={embate}
        due={() =>
          !embate &&
          state.outcome === 'en-curso' &&
          state.time >= nextAt.current &&
          state.charge < 2
        }
        onOpen={open}
        onChoose={choose}
      />
    </GameStage>
  );
}

/** Abre el siguiente embate a su tiempo y detecta cuándo el explorador usa un faro. */
function Pacer({
  state,
  controls,
  embate,
  due,
  onOpen,
  onChoose,
}: {
  state: ArenaState;
  controls: Controls;
  embate: Embate | null;
  /** ¿Toca abrir el siguiente embate? */
  due: () => boolean;
  onOpen: () => void;
  onChoose: (optionId: string) => void;
}) {
  const beacons = useRef<(Mesh | null)[]>([]);
  const options = embate && !embate.feedback ? embate.item.options : [];

  useFrame(({ clock }) => {
    if (due()) onOpen();
    let near = -1;
    for (let i = 0; i < options.length; i++) {
      const spot = beaconSpot(i, options.length);
      const close = Math.hypot(spot.x - state.player.x, spot.z - state.player.z) < NEAR;
      if (close) near = i;
      const material = beacons.current[i]?.material as MeshStandardMaterial | undefined;
      if (material)
        material.emissiveIntensity = close ? 1.6 : 0.6 + 0.3 * Math.sin(clock.elapsedTime * 3 + i);
    }
    if (controls.take('interact') && near >= 0) {
      const option = options[near];
      if (option) onChoose(option.id);
    }
  });

  return (
    <group>
      {options.map((option, i) => {
        const spot = beaconSpot(i, options.length);
        return (
          <group key={option.id} position={[spot.x, 0, spot.z]}>
            <mesh position-y={0.7} castShadow>
              <cylinderGeometry args={[0.18, 0.28, 1.4, 6]} />
              <meshStandardMaterial color={ATLAS.plate} flatShading />
            </mesh>
            <mesh
              ref={(m) => {
                beacons.current[i] = m;
              }}
              position-y={1.6}
            >
              <icosahedronGeometry args={[0.28, 1]} />
              <meshStandardMaterial
                color={ATLAS.sun}
                emissive={ATLAS.sun}
                emissiveIntensity={0.8}
              />
            </mesh>
            <mesh position-y={0.03} rotation-x={-Math.PI / 2}>
              <ringGeometry args={[NEAR - 0.12, NEAR, 24]} />
              <meshBasicMaterial color={ATLAS.sun} transparent opacity={0.5} depthWrite={false} />
            </mesh>
            <Html center position={[0, 2.25, 0]} zIndexRange={[5, 0]}>
              <span
                aria-hidden="true"
                className="grid size-8 place-items-center border-[1.5px] border-ink bg-plate font-display text-base font-extrabold text-ink"
              >
                {i + 1}
              </span>
            </Html>
          </group>
        );
      })}
    </group>
  );
}
