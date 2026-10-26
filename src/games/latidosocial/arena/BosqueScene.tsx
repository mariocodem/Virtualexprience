import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { memo, useLayoutEffect, useMemo, useRef } from 'react';
import { Color, Object3D, type InstancedMesh, type Mesh, type MeshStandardMaterial } from 'three';
import { ArenaCamera, ArenaLights, ArenaPlatform } from '@/games/shared/scene/ArenaScenery';
import { Bruma3D } from '@/games/shared/scene/Bruma3D';
import { Explorer } from '@/games/shared/scene/Explorer';
import { LightBeam } from '@/games/shared/scene/Hazards';
import { ATLAS, BUILD, ISLE } from '@/world/palette';
import { Folk, type FolkPose } from '../Folk';
import { groupColor, hash01 } from '../groups';
import { BOSQUE } from './data';
import { BRUMA_AT, CEIBA, EDGE, FAROL_RING, RADIUS, REACH, type DefenseState } from './defense';

const BLOBS = 8;
const PATH_LENGTH = EDGE - CEIBA;

/** Árboles del borde del bosque: se dejan libres los senderos de los faroles. */
export interface Tree {
  x: number;
  z: number;
  s: number;
  h: number;
}

const TREES = (() => {
  const trees: Tree[] = [];
  const paths = BOSQUE.faroles.map((f) => (f.angle * Math.PI) / 180);
  for (let i = 0; i < 70; i++) {
    const a = (i / 70) * Math.PI * 2 + hash01(i, 1) * 0.08;
    const near = paths.some((p) => Math.abs(Math.atan2(Math.sin(a - p), Math.cos(a - p))) < 0.2);
    if (near) continue;
    const r = RADIUS - 0.2 + hash01(i, 2) * 1.5;
    trees.push({
      x: Math.cos(a) * r,
      z: Math.sin(a) * r,
      s: 0.8 + hash01(i, 3) * 0.7,
      h: hash01(i, 4),
    });
  }
  return trees;
})();

export function Forest({ trees = TREES }: { trees?: readonly Tree[] }) {
  const trunks = useRef<InstancedMesh>(null);
  const crowns = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const dummy = new Object3D();
    const paint = new Color();
    trees.forEach((t, i) => {
      dummy.position.set(t.x, 0.9 * t.s, t.z);
      dummy.scale.set(t.s, t.s, t.s);
      dummy.updateMatrix();
      trunks.current?.setMatrixAt(i, dummy.matrix);
      dummy.position.set(t.x, 2.5 * t.s, t.z);
      dummy.scale.set(t.s * 1.1, t.s * 1.2, t.s * 1.1);
      dummy.updateMatrix();
      crowns.current?.setMatrixAt(i, dummy.matrix);
      crowns.current?.setColorAt(i, paint.set(BUILD.leaf[Math.floor(t.h * 3.99)] ?? BUILD.leaf[0]));
    });
    for (const mesh of [trunks.current, crowns.current]) {
      if (mesh) mesh.instanceMatrix.needsUpdate = true;
    }
    if (crowns.current?.instanceColor) crowns.current.instanceColor.needsUpdate = true;
  }, [trees]);
  return (
    <group>
      <instancedMesh ref={trunks} args={[undefined, undefined, trees.length]} castShadow>
        <cylinderGeometry args={[0.16, 0.24, 1.8, 6]} />
        <meshStandardMaterial color={BUILD.trunk} flatShading />
      </instancedMesh>
      <instancedMesh ref={crowns} args={[undefined, undefined, trees.length]} castShadow>
        <coneGeometry args={[1.05, 2.8, 7]} />
        <meshStandardMaterial flatShading />
      </instancedMesh>
    </group>
  );
}

export function Ceiba({ get }: { get: () => { bloom: number; charge: number } }) {
  const orb = useRef<Mesh>(null);
  const ring = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const { bloom, charge } = get();
    const k = Math.min(1, bloom + charge * 0.5);
    if (orb.current) {
      orb.current.scale.setScalar(0.35 + 0.55 * k);
      (orb.current.material as MeshStandardMaterial).emissiveIntensity = 0.5 + 1.8 * k;
    }
    if (ring.current) {
      ring.current.visible = charge >= 1;
      ring.current.rotation.z = clock.elapsedTime * 0.8;
    }
  });
  return (
    <group>
      <mesh position-y={1.7} castShadow>
        <cylinderGeometry args={[0.55, 0.95, 3.4, 8]} />
        <meshStandardMaterial color={BUILD.trunk} flatShading />
      </mesh>
      {(
        [
          [0, 4.3, 0, 2.2],
          [1.3, 3.8, 0.6, 1.6],
          [-1.2, 3.7, -0.6, 1.7],
        ] as const
      ).map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]} castShadow>
          <icosahedronGeometry args={[r, 1]} />
          <meshStandardMaterial color={BUILD.leaf[i % 3]} flatShading />
        </mesh>
      ))}
      <mesh ref={orb} position-y={5.7}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color={ATLAS.sun} emissive={ATLAS.sun} />
      </mesh>
      <mesh ref={ring} position-y={5.7} rotation-x={Math.PI / 2}>
        <torusGeometry args={[1.1, 0.06, 6, 24]} />
        <meshBasicMaterial color={ATLAS.sun} />
      </mesh>
      <mesh position-y={0.03} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[CEIBA - 0.2, CEIBA, 28]} />
        <meshBasicMaterial color={ATLAS.sun} transparent opacity={0.35} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** Los senderos por donde llega la niebla. */
function Paths() {
  return (
    <group>
      {BOSQUE.faroles.map((f) => (
        <mesh
          key={f.id}
          position={[
            (Math.cos((f.angle * Math.PI) / 180) * (EDGE + CEIBA)) / 2,
            0.02,
            (Math.sin((f.angle * Math.PI) / 180) * (EDGE + CEIBA)) / 2,
          ]}
          rotation={[-Math.PI / 2, 0, -(f.angle * Math.PI) / 180]}
        >
          <planeGeometry args={[PATH_LENGTH, 1.5]} />
          <meshStandardMaterial color={BUILD.paving} flatShading />
        </mesh>
      ))}
    </group>
  );
}

function Farol({
  state,
  index,
  onOpen,
}: {
  state: DefenseState;
  index: number;
  onOpen: (index: number) => void;
}) {
  const farol = state.faroles[index];
  const lamp = useRef<Mesh>(null);
  const ring = useRef<Mesh>(null);
  const orb = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (!farol) return;
    const attendant = farol.group;
    const fits = Boolean(attendant && farol.need?.fits.includes(attendant));
    const call = Boolean(farol.need);
    const pulse = 0.5 + 0.5 * Math.sin(clock.elapsedTime * 2.2 + index);
    const material = lamp.current?.material as MeshStandardMaterial | undefined;
    if (material) {
      material.emissive.set(fits ? ATLAS.sun : call ? ATLAS.route : '#000000');
      material.emissiveIntensity = fits ? 2 : call ? 0.4 + 0.5 * pulse : 0;
      material.color.set(fits ? ATLAS.sun : call ? '#f0a0a4' : BUILD.stoneDark);
    }
    if (ring.current) {
      ring.current.visible = call;
      (ring.current.material as MeshStandardMaterial).opacity = fits ? 0.9 : 0.35 + 0.3 * pulse;
    }
    if (orb.current) {
      orb.current.visible = call && !attendant;
      orb.current.position.y = 3.3 + pulse * 0.2;
    }
  });
  if (!farol) return null;
  return (
    <group position={[farol.x, 0, farol.z]}>
      <mesh
        position-y={1.1}
        castShadow
        onClick={() => {
          onOpen(index);
        }}
      >
        <cylinderGeometry args={[0.1, 0.17, 2.2, 6]} />
        <meshStandardMaterial color={BUILD.woodDark} flatShading />
      </mesh>
      <mesh
        ref={lamp}
        position-y={2.45}
        castShadow
        onClick={() => {
          onOpen(index);
        }}
      >
        <icosahedronGeometry args={[0.38, 1]} />
        <meshStandardMaterial color={BUILD.stoneDark} flatShading />
      </mesh>
      <mesh ref={orb} position-y={3.3}>
        <coneGeometry args={[0.2, 0.4, 4]} />
        <meshBasicMaterial color={ATLAS.route} />
      </mesh>
      <mesh
        ref={ring}
        position-y={0.05}
        rotation-x={-Math.PI / 2}
        onClick={() => {
          onOpen(index);
        }}
      >
        <ringGeometry args={[REACH - 0.18, REACH, 28]} />
        <meshStandardMaterial color={ATLAS.sun} transparent depthWrite={false} />
      </mesh>
      <Html center position={[0, 3.2, 0]} zIndexRange={[5, 0]}>
        <span
          aria-hidden="true"
          className="grid size-7 place-items-center border-[1.5px] border-ink bg-plate font-display text-sm font-extrabold text-ink"
        >
          {index + 1}
        </span>
      </Html>
    </group>
  );
}

/** La niebla de cada oleada: manchas que avanzan por el sendero y se encogen al disiparse. */
function FogField({ state, tint, still }: { state: DefenseState; tint: string; still: boolean }) {
  const mesh = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  useFrame(({ clock }) => {
    const node = mesh.current;
    if (!node) return;
    const t = still ? 0 : clock.elapsedTime;
    state.faroles.forEach((farol, f) => {
      for (let k = 0; k < BLOBS; k++) {
        const i = f * BLOBS + k;
        const s = farol.front - k * 0.045;
        const visible = farol.need !== null && s > 0 && k < Math.ceil(farol.fog * BLOBS);
        const radius = EDGE - PATH_LENGTH * Math.min(1, s);
        const side = (hash01(i, 5) - 0.5) * 1.1;
        const dirx = Math.cos(farol.angle);
        const dirz = Math.sin(farol.angle);
        dummy.position.set(
          dirx * radius - dirz * side,
          0.6 + hash01(i, 6) * 0.5 + Math.sin(t * 1.3 + i) * 0.08,
          dirz * radius + dirx * side,
        );
        dummy.scale.setScalar(visible ? (0.7 + hash01(i, 7) * 0.5) * (0.6 + 0.5 * farol.fog) : 0);
        dummy.rotation.set(i, i * 0.7, 0);
        dummy.updateMatrix();
        node.setMatrixAt(i, dummy.matrix);
      }
    });
    node.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, BLOBS * BOSQUE.faroles.length]}
      frustumCulled={false}
    >
      <icosahedronGeometry args={[0.8, 0]} />
      <meshStandardMaterial
        color={tint}
        emissive={tint}
        emissiveIntensity={0.25}
        transparent
        opacity={0.62}
        depthWrite={false}
        flatShading
      />
    </instancedMesh>
  );
}

/** Los cuatro grupos: en su farol, descansando junto a la ceiba o esperando su turno. */
function Crews({ state, still }: { state: DefenseState; still: boolean }) {
  const poses = useRef(
    BOSQUE.groups.map<FolkPose>((_, i) => ({
      x: Math.cos(i * 1.57 + 0.8) * 3.2,
      z: Math.sin(i * 1.57 + 0.8) * 3.2,
      yaw: 0,
      bent: 0,
      lit: 4,
      busy: 0,
    })),
  );
  useFrame((_, dt) => {
    const k = Math.min(1, dt * 3.5);
    BOSQUE.groups.forEach((g, i) => {
      const pose = poses.current[i];
      const runtime = state.groups.find((r) => r.id === g.id);
      if (!pose || !runtime) return;
      const farol = state.faroles.find((f) => f.group === g.id);
      const slot = i * 1.57 + 0.8;
      let tx: number;
      let tz: number;
      let yaw: number;
      let bent: number;
      if (farol) {
        const inward = (FAROL_RING - 1.5) / FAROL_RING;
        tx = farol.x * inward;
        tz = farol.z * inward;
        yaw = Math.atan2(Math.cos(farol.angle), Math.sin(farol.angle));
        bent = Math.max(0, 0.5 - runtime.energy) * 1.1;
      } else if (runtime.resting) {
        tx = Math.cos(slot) * 2.6;
        tz = Math.sin(slot) * 2.6;
        yaw = Math.atan2(-tx, -tz);
        bent = 1;
      } else {
        tx = Math.cos(slot) * 3.4;
        tz = Math.sin(slot) * 3.4;
        yaw = Math.atan2(-tx, -tz);
        bent = 0;
      }
      pose.x += (tx - pose.x) * k;
      pose.z += (tz - pose.z) * k;
      let delta = yaw - pose.yaw;
      delta = Math.atan2(Math.sin(delta), Math.cos(delta));
      pose.yaw += delta * k;
      pose.bent += (bent - pose.bent) * k;
      pose.lit = runtime.energy * 4;
      pose.busy = farol ? 1 : 0;
    });
  });
  return (
    <group>
      {BOSQUE.groups.map((g, i) => (
        <Folk
          key={g.id}
          color={groupColor(g.id)}
          lamps={4}
          still={still}
          get={() => poses.current[i] ?? { x: 0, z: 0, yaw: 0, bent: 0, lit: 0, busy: 0 }}
        />
      ))}
    </group>
  );
}

export const BosqueScene = memo(function BosqueScene({
  state,
  tint,
  still,
  goal,
  onOpenFarol,
}: {
  state: DefenseState;
  tint: string;
  goal: number;
  still: boolean;
  onOpenFarol: (index: number) => void;
}) {
  const aspect = useThree((s) => s.size.width / s.size.height);
  const portrait = aspect < 0.9;
  return (
    <>
      <ArenaLights fog="#1c4a6e" near={30} far={80} />
      <ArenaPlatform radius={RADIUS} rim={ISLE.latidosocial} />
      <Paths />
      <Forest />
      <Ceiba get={() => state} />
      {state.faroles.map((f, i) => (
        <Farol key={f.id} state={state} index={i} onOpen={onOpenFarol} />
      ))}
      <FogField state={state} tint={tint} still={still} />
      <Crews state={state} still={still} />
      <Explorer
        get={() => ({
          x: state.player.x,
          z: state.player.z,
          facing: state.player.facing,
          moving: state.player.moving,
        })}
        glow={() => Math.min(1, state.charge / 2 + 0.3)}
        still={still}
      />
      <Bruma3D
        get={() => ({
          x: BRUMA_AT.x,
          z: BRUMA_AT.z,
          density: Math.max(0, 1 - state.hits / goal),
          stagger: state.stagger,
        })}
        tint={tint}
        look={() => state.player}
        still={still}
      />
      <LightBeam get={() => state.beam} y={5.2} />
      <ArenaCamera
        follow={() => state.player}
        still={still}
        height={portrait ? 24 : 19}
        distance={portrait ? 17 : 15}
        lead={portrait ? 0.55 : 0.2}
      />
    </>
  );
});
