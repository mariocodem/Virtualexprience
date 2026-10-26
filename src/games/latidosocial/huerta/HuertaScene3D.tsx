import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { memo, useLayoutEffect, useMemo, useRef } from 'react';
import { Color, Object3D, type InstancedMesh, type Mesh, type MeshStandardMaterial } from 'three';
import { ArenaPlatform } from '@/games/shared/scene/ArenaScenery';
import {
  energyLeft,
  REST,
  type HuertaState,
  type Moon,
} from '@/minigames/huerta-comunitaria/engine';
import type { HuertaContent } from '@/data/contentSchemas';
import { ATLAS, BUILD, ISLE } from '@/world/palette';
import { Ceiba, Forest, type Tree } from '../arena/BosqueScene';
import { Folk, type FolkPose } from '../Folk';
import { groupColor, hash01 } from '../groups';
import { ASSEMBLY_AT, bedSpot, bedWork, CEIBA_AT, crewSpot, growthOf, moonSky } from './flow';

const PLANTS_PER_BED = 18;
const SKY = ['#0d1b3a', '#122448', '#17305a', '#1b3a66', '#1f4470'];

const WOODS: Tree[] = Array.from({ length: 46 }, (_, i) => {
  const x = (i / 45 - 0.5) * 34 + (hash01(i, 1) - 0.5) * 1.5;
  const z = -8.5 - hash01(i, 2) * 4.5 - Math.abs(x) * 0.12;
  return { x, z, s: 0.8 + hash01(i, 3) * 0.8, h: hash01(i, 4) };
}).filter((t) => Math.hypot(t.x - CEIBA_AT.x, t.z - CEIBA_AT.z) > 3.2);

const STARS = (() => {
  const data = new Float32Array(160 * 3);
  for (let i = 0; i < 160; i++) {
    const a = hash01(i, 1) * Math.PI * 2;
    const el = 0.28 + hash01(i, 2) * 0.62;
    data[i * 3] = Math.cos(a) * Math.cos(el) * 70;
    data[i * 3 + 1] = Math.sin(el) * 70;
    data[i * 3 + 2] = -Math.abs(Math.sin(a)) * Math.cos(el) * 70 - 4;
  }
  return data;
})();

export interface HuertaView {
  state: HuertaState;
  content: HuertaContent;
  moon: Moon;
  /** Tarea o descanso elegido por cada grupo. */
  choices: Record<string, string>;
  selected: string | null;
  /** El dilema se resuelve en asamblea: todos junto al fuego. */
  assembly: boolean;
  /** Luna de la temporada (0-based) y total. */
  index: number;
  total: number;
}

/** Una era con sus plantas: crecen con la cosecha y se animan al recibir trabajo. */
function Bed({
  index,
  count,
  label,
  growth,
  work,
  soil,
  glow,
  still,
  onPick,
}: {
  index: number;
  count: number;
  label: string;
  growth: number;
  work: number;
  soil: number;
  glow: boolean;
  still: boolean;
  onPick: () => void;
}) {
  const spot = bedSpot(index, count);
  const plants = useRef<InstancedMesh>(null);
  const frame = useRef<Mesh>(null);
  const shown = useRef(0);
  const dummy = useMemo(() => new Object3D(), []);
  const green = useMemo(() => new Color(), []);

  useLayoutEffect(() => {
    green.set(BUILD.leaf[1]).lerp(new Color('#a9a248'), 1 - Math.min(1, soil / 70));
    plants.current?.setColorAt(0, green);
    for (let i = 0; i < PLANTS_PER_BED; i++) {
      const c = new Color(BUILD.leaf[i % 4]).lerp(
        new Color('#a9a248'),
        0.55 - 0.55 * Math.min(1, soil / 80),
      );
      plants.current?.setColorAt(i, c);
    }
    if (plants.current?.instanceColor) plants.current.instanceColor.needsUpdate = true;
  }, [soil, green]);

  useFrame(({ clock }, dt) => {
    const mesh = plants.current;
    if (!mesh) return;
    shown.current += (growth + work * 0.12 - shown.current) * Math.min(1, dt * (still ? 20 : 1.6));
    const t = still ? 0 : clock.elapsedTime;
    for (let i = 0; i < PLANTS_PER_BED; i++) {
      const col = i % 6;
      const row = Math.floor(i / 6);
      const s = 0.12 + 0.95 * Math.max(0, shown.current) * (0.75 + 0.5 * hash01(i, index));
      dummy.position.set(-1.65 + col * 0.66, 0.2, -0.65 + row * 0.65);
      dummy.scale.set(s, s, s);
      dummy.rotation.set(0, i, Math.sin(t * 1.5 + i) * 0.05 * work);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (frame.current) {
      const material = frame.current.material as MeshStandardMaterial;
      material.emissiveIntensity = glow ? 0.5 + 0.4 * Math.sin(t * 3) : 0;
    }
  });

  return (
    <group position={[spot.x, 0, spot.z]}>
      <mesh
        ref={frame}
        position-y={0.18}
        castShadow
        receiveShadow
        onClick={() => {
          onPick();
        }}
      >
        <boxGeometry args={[4.3, 0.36, 2.3]} />
        <meshStandardMaterial
          color={BUILD.soil}
          emissive={ATLAS.sun}
          emissiveIntensity={0}
          flatShading
        />
      </mesh>
      <instancedMesh ref={plants} args={[undefined, undefined, PLANTS_PER_BED]} castShadow>
        <coneGeometry args={[0.3, 1, 5]} />
        <meshStandardMaterial flatShading />
      </instancedMesh>
      <Html center position={[0, 0.1, 1.45]} zIndexRange={[5, 0]}>
        <span
          aria-hidden="true"
          className="border-[1.5px] border-ink bg-plate px-2 py-0.5 font-display text-xs font-bold whitespace-nowrap text-ink"
        >
          {index + 1} · {label}
        </span>
      </Html>
    </group>
  );
}

function Moon3D({ index, total }: { index: number; total: number }) {
  const sky = moonSky(index, total);
  return (
    <group position={[sky.x, sky.y, -26]}>
      <mesh scale={0.7 + 0.3 * sky.phase}>
        <icosahedronGeometry args={[2.2, 2]} />
        <meshBasicMaterial color="#fff2cf" fog={false} />
      </mesh>
      <mesh scale={0.7 + 0.3 * sky.phase} position={[(1 - sky.phase) * 2.2, 0.2, 0.3]}>
        <icosahedronGeometry args={[2.1, 2]} />
        <meshBasicMaterial color={SKY[index % SKY.length]} fog={false} />
      </mesh>
    </group>
  );
}

function Fire({ active, still }: { active: boolean; still: boolean }) {
  const flame = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (!flame.current) return;
    const t = still ? 0 : clock.elapsedTime;
    flame.current.scale.set(1, 0.85 + Math.sin(t * 6) * 0.12, 1);
    (flame.current.material as MeshStandardMaterial).emissiveIntensity = active ? 2 : 1.1;
  });
  return (
    <group position={[ASSEMBLY_AT.x, 0, ASSEMBLY_AT.z]}>
      <mesh position-y={0.12}>
        <cylinderGeometry args={[0.7, 0.8, 0.24, 8]} />
        <meshStandardMaterial color={BUILD.stoneDark} flatShading />
      </mesh>
      <mesh ref={flame} position-y={0.65}>
        <coneGeometry args={[0.42, 1.0, 6]} />
        <meshStandardMaterial color={ATLAS.sun} emissive="#ff9f2e" flatShading />
      </mesh>
      <pointLight
        position={[0, 1.3, 0]}
        color="#ffb869"
        intensity={active ? 26 : 12}
        distance={9}
        decay={1.7}
      />
    </group>
  );
}

function Crews({
  view,
  still,
  onPick,
}: {
  view: HuertaView;
  still: boolean;
  onPick: (group: string) => void;
}) {
  const { content, state, moon, choices, assembly } = view;
  const tasks = moon.tasks.map((t) => t.id);
  const poses = useRef<Record<string, FolkPose>>({});
  const targets = useMemo(() => {
    const groups = content.groups;
    const taken: Record<string, number> = {};
    const counts: Record<string, number> = {};
    for (const g of groups) counts[choices[g.id] ?? '·'] = (counts[choices[g.id] ?? '·'] ?? 0) + 1;
    return groups.map((g, i) => {
      const key = choices[g.id] ?? '·';
      const order = taken[key] ?? 0;
      taken[key] = order + 1;
      const spot = crewSpot({
        group: i,
        groups: groups.length,
        choice: choices[g.id],
        tasks,
        sharing: { count: counts[key] ?? 1, order },
        assembly,
      });
      const stamina = state.stamina[g.id] ?? 1;
      const left = energyLeft(state, g.id);
      const tired = state.resting.includes(g.id) || (choices[g.id] !== REST && left === 0);
      return {
        spot,
        lit: left,
        lamps: stamina,
        bent: tired ? (state.resting.includes(g.id) ? 1 : 0.55) : 0,
        busy: !assembly && choices[g.id] && choices[g.id] !== REST ? 1 : 0,
      };
    });
  }, [content, state, choices, assembly, tasks]);

  useFrame((_, dt) => {
    const k = Math.min(1, dt * 2.6);
    content.groups.forEach((g, i) => {
      const target = targets[i];
      if (!target) return;
      const pose = (poses.current[g.id] ??= {
        x: target.spot.x,
        z: target.spot.z + 3,
        yaw: 0,
        bent: 0,
        lit: target.lit,
        busy: 0,
      });
      pose.x += (target.spot.x - pose.x) * k;
      pose.z += (target.spot.z - pose.z) * k;
      const delta = Math.atan2(
        Math.sin(target.spot.yaw - pose.yaw),
        Math.cos(target.spot.yaw - pose.yaw),
      );
      pose.yaw += delta * k;
      pose.bent += (target.bent - pose.bent) * k;
      pose.lit = target.lit;
      pose.busy = target.busy;
    });
  });

  return (
    <group>
      {content.groups.map((g, i) => (
        <group key={g.id}>
          <Folk
            color={groupColor(g.id)}
            lamps={targets[i]?.lamps ?? 1}
            still={still}
            onPick={() => {
              onPick(g.id);
            }}
            get={() => poses.current[g.id] ?? { x: 0, z: 6, yaw: 0, bent: 0, lit: 1, busy: 0 }}
          />
          {view.selected === g.id && <SelectionRing poses={poses} id={g.id} />}
        </group>
      ))}
    </group>
  );
}

/** Anillo bajo el grupo seleccionado. */
function SelectionRing({
  poses,
  id,
}: {
  poses: { current: Record<string, FolkPose> };
  id: string;
}) {
  const ring = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const pose = poses.current[id];
    if (!ring.current || !pose) return;
    ring.current.position.set(pose.x, 0.06, pose.z);
    ring.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 3) * 0.05);
  });
  return (
    <mesh ref={ring} rotation-x={-Math.PI / 2}>
      <ringGeometry args={[1.3, 1.55, 28]} />
      <meshBasicMaterial color={ATLAS.sun} transparent opacity={0.85} depthWrite={false} />
    </mesh>
  );
}

function Look({ portrait }: { portrait: boolean }) {
  useFrame(({ camera }) => {
    camera.position.set(0, portrait ? 19 : 10.5, portrait ? 25 : 15.5);
    camera.lookAt(portrait ? -1 : 0, 0.4, portrait ? 1.5 : 1.8);
  });
  return null;
}

/** La huerta de noche: eras junto al bosque, la ceiba, el fuego de la asamblea y la luna de la temporada. */
export const HuertaScene3D = memo(function HuertaScene3D({
  view,
  still,
  onPickGroup,
  onPickBed,
  onPickRest,
}: {
  view: HuertaView;
  still: boolean;
  onPickGroup: (group: string) => void;
  onPickBed: (task: string) => void;
  onPickRest: () => void;
}) {
  const aspect = useThree((s) => s.size.width / s.size.height);
  const { state, content, moon, index, total, selected } = view;
  const growth = growthOf(state, content.goal);
  const work = bedWork(state, moon);
  const sky = SKY[Math.min(index, SKY.length - 1)] ?? SKY[0];
  const moonAt = moonSky(index, total);
  return (
    <>
      <color attach="background" args={[sky ?? '#0d1b3a']} />
      <fog attach="fog" args={[sky ?? '#0d1b3a', 32, 90]} />
      <hemisphereLight args={['#a9bfe8', '#2f5b44', 1.25]} />
      <directionalLight
        position={[moonAt.x * 0.5, 16, 8]}
        color="#d6e4ff"
        intensity={2.1}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-bias={-0.0005}
      />
      <ambientLight intensity={0.3} />
      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[STARS, 3]} />
        </bufferGeometry>
        <pointsMaterial size={1.1} color="#ffffff" sizeAttenuation={false} fog={false} />
      </points>
      <Moon3D index={index} total={total} />
      <ArenaPlatform radius={15} rim={ISLE.latidosocial} sides={36} />
      <Forest trees={WOODS} />
      <group
        position={[CEIBA_AT.x, 0, CEIBA_AT.z]}
        scale={0.8}
        onClick={() => {
          onPickRest();
        }}
      >
        <Ceiba get={() => ({ bloom: 0.3 + 0.5 * growth, charge: 0 })} />
      </group>
      <Fire active={view.assembly} still={still} />
      {moon.tasks.map((task, i) => (
        <Bed
          key={task.id}
          index={i}
          count={moon.tasks.length}
          label={task.label}
          growth={growth}
          work={work[i] ?? 0}
          soil={state.suelo}
          glow={Boolean(selected)}
          still={still}
          onPick={() => {
            onPickBed(task.id);
          }}
        />
      ))}
      <Crews view={view} still={still} onPick={onPickGroup} />
      <Look portrait={aspect < 0.9} />
    </>
  );
});
