import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import {
  DoubleSide,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
  type MeshStandardMaterial,
} from 'three';
import type { ArenaState } from '../../shared/arena/core';
import type { Controls } from '../../shared/controls';
import { ATLAS, BUILD, ISLE } from '@/world/palette';
import { Label } from '../Label';
import {
  findRumor,
  INTERCEPT_REACH,
  nearestFlying,
  stepRumors,
  TOWER,
  type LiveRumor,
  type RumorEvent,
  type RumorField,
  type RumorPlan,
  type Tier,
} from './rumors';

const FLOAT_Y = 1.15;
const COLOR = { flying: '#e3ebf1', held: ATLAS.sun, cleared: '#9fe0ad' } as const;

/** La torre de radio del borde de la plataforma: a donde vuelan los rumores. */
export function RadioTower({
  pulse,
  still,
}: {
  pulse: { n: number; bad: boolean };
  still: boolean;
}) {
  const beacon = useRef<Mesh>(null);
  const rings = useRef<(Mesh | null)[]>([]);
  const seen = useRef({ n: 0, t0: -99 });
  useFrame(({ clock }) => {
    const now = clock.elapsedTime;
    if (seen.current.n !== pulse.n) seen.current = { n: pulse.n, t0: now };
    const age = now - seen.current.t0;
    const material = beacon.current?.material as MeshStandardMaterial | undefined;
    if (material) {
      const live = age < 2.4;
      material.emissive.set(live && pulse.bad ? '#ff3b3f' : live ? '#ffe27a' : '#ff5a5f');
      material.emissiveIntensity = still ? 1.2 : 0.7 + 0.6 * Math.abs(Math.sin(now * 1.3));
    }
    rings.current.forEach((ring, i) => {
      if (!ring) return;
      const t = still ? 0 : (age - i * 0.35) / 1.4;
      ring.visible = t > 0 && t < 1;
      if (ring.visible) {
        ring.scale.setScalar(0.6 + t * 3.4);
        const m = ring.material as MeshBasicMaterial;
        m.opacity = 0.7 * (1 - t);
        m.color.set(pulse.bad ? '#ff5a5f' : ATLAS.sun);
      }
    });
  });
  return (
    <group position={[TOWER.x, 0, TOWER.z]}>
      {/* Zona de llegada, marcada en el suelo. */}
      <mesh position-y={0.03} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[1.0, 1.25, 28]} />
        <meshBasicMaterial color={ATLAS.route} transparent opacity={0.65} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.3, -0.2]} castShadow>
        <boxGeometry args={[1.8, 0.6, 1.5]} />
        <meshStandardMaterial color={BUILD.wall} flatShading />
      </mesh>
      <mesh position={[0, 0.75, -0.2]} rotation={[0, 0, 0]} castShadow>
        <boxGeometry args={[1.95, 0.14, 1.65]} />
        <meshStandardMaterial color={ISLE.comunicarte} flatShading />
      </mesh>
      <mesh position={[0, 2.5, -0.2]} castShadow>
        <cylinderGeometry args={[0.1, 0.42, 3.6, 4]} />
        <meshStandardMaterial color={BUILD.metal} flatShading />
      </mesh>
      {[0.2, 0.2 + 0.9, 0.2 + 1.8].map((y, i) => (
        <mesh key={y} position={[0, 1.4 + y, -0.2]} rotation={[0, Math.PI / 4, 0]}>
          <boxGeometry args={[0.95 - i * 0.25, 0.06, 0.06]} />
          <meshStandardMaterial color={ATLAS.plate} flatShading />
        </mesh>
      ))}
      <mesh position={[0.35, 3.4, 0.05]} rotation={[0.4, 0, -1.2]}>
        <coneGeometry args={[0.38, 0.3, 8, 1, true]} />
        <meshStandardMaterial color={ATLAS.plate} flatShading side={DoubleSide} />
      </mesh>
      <mesh position={[0, 4.55, -0.2]}>
        <cylinderGeometry args={[0.025, 0.04, 1.0, 5]} />
        <meshStandardMaterial color={BUILD.metal} flatShading />
      </mesh>
      <mesh ref={beacon} position={[0, 5.15, -0.2]}>
        <icosahedronGeometry args={[0.14, 0]} />
        <meshStandardMaterial color="#ff5a5f" emissive="#ff5a5f" emissiveIntensity={1} />
      </mesh>
      {[0, 1].map((i) => (
        <mesh
          key={i}
          ref={(m) => {
            rings.current[i] = m;
          }}
          position={[0, 5.15, -0.2]}
          rotation-x={Math.PI / 2}
          visible={false}
        >
          <torusGeometry args={[0.5, 0.03, 4, 20]} />
          <meshBasicMaterial color={ATLAS.sun} transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
      <Label text="Torre de radio" position={[0, 6.0, -0.2]} height={0.4} size={34} />
    </group>
  );
}

/** Un rumor en vuelo: orbe de papel con su titular encima. Lee su pose del campo. */
function RumorOrb({
  field,
  id,
  headline,
  near,
  still,
  tint,
}: {
  field: RumorField;
  id: number;
  headline: string;
  near: () => number | null;
  still: boolean;
  tint: string;
}) {
  const root = useRef<Group>(null);
  const orb = useRef<Mesh>(null);
  const ring = useRef<Mesh>(null);
  const sheet = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const rumor = findRumor(field, id);
    const node = root.current;
    if (!node) return;
    node.visible = Boolean(rumor);
    if (!rumor) return;
    const t = still ? 0 : clock.elapsedTime;
    node.position.set(rumor.x, FLOAT_Y + Math.sin(t * 2.2 + id) * 0.08, rumor.z);
    const material = orb.current?.material as MeshStandardMaterial | undefined;
    if (material) {
      const color = COLOR[rumor.status === 'gone' ? 'flying' : rumor.status];
      material.color.set(color);
      material.emissive.set(rumor.status === 'flying' ? tint : color);
      material.emissiveIntensity = rumor.status === 'flying' ? 0.55 : 0.7;
    }
    if (sheet.current) sheet.current.rotation.y = t * 1.6;
    if (ring.current) {
      const isNear = near() === id || rumor.status === 'held';
      ring.current.visible = isNear;
      ring.current.scale.setScalar(isNear && !still ? 1 + Math.sin(t * 6) * 0.06 : 1);
    }
  });
  return (
    <group ref={root}>
      <mesh ref={orb} castShadow>
        <icosahedronGeometry args={[0.4, 1]} />
        <meshStandardMaterial color={COLOR.flying} emissive={tint} flatShading />
      </mesh>
      <mesh ref={sheet} position={[0, 0.02, 0]}>
        <boxGeometry args={[0.95, 0.03, 0.62]} />
        <meshStandardMaterial color={ATLAS.plate} flatShading />
      </mesh>
      <mesh ref={ring} position-y={-FLOAT_Y + 0.05} rotation-x={-Math.PI / 2} visible={false}>
        <ringGeometry args={[INTERCEPT_REACH - 0.14, INTERCEPT_REACH, 28]} />
        <meshBasicMaterial color={ATLAS.sun} transparent opacity={0.6} depthWrite={false} />
      </mesh>
      <Label
        text={headline}
        position={[0, 1.2, 0]}
        height={0.62}
        size={26}
        maxWidth={300}
        fg={ATLAS.ink}
        bg="rgba(243,246,248,0.94)"
      />
    </group>
  );
}

export interface RumorView {
  id: number;
  headline: string;
}

/**
 * Los rumores del combate: avanza el campo en cada cuadro (al ritmo de la
 * arena), detecta cuál se puede interceptar con E y dibuja cada rumor.
 */
export function RumorLayer({
  field,
  plan,
  arena,
  controls,
  views,
  tier,
  canSpawn,
  timeScale,
  locked,
  still,
  tint,
  onEvents,
  onIntercept,
  onNear,
}: {
  field: RumorField;
  plan: RumorPlan;
  arena: ArenaState;
  controls: Controls;
  views: readonly RumorView[];
  tier: () => Tier;
  canSpawn: () => boolean;
  timeScale: () => number;
  /** Hay una decisión abierta: no se intercepta otro rumor. */
  locked: () => boolean;
  still: boolean;
  tint: string;
  onEvents: (events: RumorEvent[]) => void;
  onIntercept: (rumor: LiveRumor) => void;
  onNear: (id: number | null) => void;
}) {
  const nearId = useRef<number | null>(null);
  useFrame((_, dt) => {
    const pressed = controls.take('interact');
    const scale = timeScale();
    if (scale > 0 && arena.outcome === 'en-curso') {
      const events = stepRumors(
        field,
        plan,
        Math.min(0.05, dt) * scale,
        { x: arena.bruma.x, z: arena.bruma.z },
        tier(),
        canSpawn() && !locked(),
        Math.random,
      );
      if (events.length > 0) onEvents(events);
    }
    const near =
      locked() || arena.outcome !== 'en-curso' ? null : nearestFlying(field, arena.player);
    const id = near?.id ?? null;
    if (id !== nearId.current) {
      nearId.current = id;
      onNear(id);
    }
    if (pressed && near && !locked()) onIntercept(near);
  });
  return (
    <>
      {views.map((v) => (
        <RumorOrb
          key={v.id}
          field={field}
          id={v.id}
          headline={v.headline}
          near={() => nearId.current}
          still={still}
          tint={tint}
        />
      ))}
    </>
  );
}
