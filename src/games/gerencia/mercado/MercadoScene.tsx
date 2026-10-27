import { useFrame, useThree } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef, type RefObject } from 'react';
import {
  Color,
  DoubleSide,
  Object3D,
  Vector3,
  type DirectionalLight,
  type Fog,
  type Group,
  type HemisphereLight,
  type InstancedMesh,
  type Mesh,
  type MeshStandardMaterial,
  type PointLight,
} from 'three';
import { ATLAS, BUILD, ISLE } from '@/world/palette';
import { TextSprite } from './TextSprite';
import {
  CRATE_SIZE,
  crateCount,
  crateFill,
  crateSlot,
  dayLight,
  dayTarget,
  queueProgress,
  stepQueue,
  stockSlot,
  type Queue,
  type Step,
} from './market3d';

/**
 * El puesto de empanadas del muelle en 3D. Lee del objeto `live` en cada
 * cuadro (sin volver a renderizar React): el pedido que se arma, la fila de
 * clientes, el ánimo del equipo y la hora del día.
 */
export interface MarketLive {
  step: Step;
  /** Cantidad que se está viendo en el muelle antes de confirmar. */
  preview: number;
  /** Pedido confirmado. */
  order: number;
  queue: Queue | null;
  team: number;
  /** El ayudante trae el dilema. */
  messenger: boolean;
  /** Velocidad de la fila (la fila corre solo en la jornada). */
  speed: number;
}

export type Live = RefObject<MarketLive>;

const SHIRTS = ['#d7262e', '#4a5bb8', '#a9b94a', '#c7782e', '#7a5c00'];
const SKINS = ['#e0b08a', '#c68a5e', '#8d5a3b', '#f0c9a4'];
const MAX_WALKERS = 16;

/** Amanecer y anochecer: color del cielo, sol y luces del puesto según la hora. */
export function DayCycle({ live, onDone }: { live: Live; onDone: () => void }) {
  const sky = useRef<Color>(null);
  const mist = useRef<Fog>(null);
  const sun = useRef<DirectionalLight>(null);
  const hemi = useRef<HemisphereLight>(null);
  const lamp = useRef<PointLight>(null);
  const shown = useRef(0.05);
  const prev = useRef<Step>('pedido');

  useFrame((_, dt) => {
    const m = live.current;
    const q = m.queue;
    if (m.step === 'jornada' && q && !q.done) stepQueue(q, Math.min(0.05, dt) * m.speed);
    if (m.step === 'jornada' && q?.done) onDone();
    // Al empezar otra jornada el sol sale de la noche.
    if (prev.current === 'cierre' && m.step === 'pedido') shown.current = -0.1;
    prev.current = m.step;
    const target = dayTarget(m.step, q ? queueProgress(q) : 0);
    shown.current += (target - shown.current) * Math.min(1, dt * (m.step === 'jornada' ? 2 : 1.2));
    const light = dayLight(shown.current);
    sky.current?.set(light.sky);
    mist.current?.color.set(light.fog);
    if (sun.current) {
      sun.current.color.set(light.sun);
      sun.current.intensity = light.sunIntensity;
      sun.current.position.set(...light.sunPos);
    }
    if (hemi.current) {
      hemi.current.color.set(light.hemiSky);
      hemi.current.groundColor.set(light.hemiGround);
      hemi.current.intensity = light.hemiIntensity;
    }
    if (lamp.current) lamp.current.intensity = light.night * 9;
  });

  return (
    <>
      <color ref={sky} attach="background" args={['#a9d3ec']} />
      <fog ref={mist} attach="fog" args={['#dfe7ea', 24, 70]} />
      <hemisphereLight ref={hemi} args={['#eaf4fb', '#2a5a92', 1]} />
      <directionalLight
        ref={sun}
        position={[-10, 12, 7]}
        intensity={2.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={10}
        shadow-camera-bottom={-6}
        shadow-bias={-0.0005}
      />
      <pointLight
        ref={lamp}
        position={[0, 2.7, 0.9]}
        color="#ffcf8a"
        distance={11}
        decay={1.6}
        intensity={0}
      />
    </>
  );
}

/** Cámara fija al frente del puesto; se aleja en pantallas angostas para que quepa todo. */
export function MarketCamera({ still }: { still: boolean }) {
  const size = useThree((s) => s.size);
  const look = useMemo(() => new Vector3(), []);
  useFrame(({ camera, clock }) => {
    const aspect = size.width / Math.max(1, size.height);
    const f = Math.min(2.4, Math.max(1.3, 1.4 / aspect));
    const sway = still ? 0 : Math.sin(clock.elapsedTime * 0.25) * 0.35;
    camera.position.set(1.6 + sway, 1.35 + 3.3 * f, 1.1 + 11.6 * f);
    look.set(1.3, 1.0, 0.9);
    camera.lookAt(look);
  });
  return null;
}

/** Muelle de tablones, pilotes, mar abierto, la grúa y el casco a medio armar del astillero. */
export function Dock() {
  const planks = useRef<InstancedMesh>(null);
  const posts = useRef<InstancedMesh>(null);
  const ribs = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);

  useLayoutEffect(() => {
    const p = planks.current;
    if (p) {
      for (let i = 0; i < 30; i++) {
        dummy.position.set(-17.5 + i * 1.2, -0.1, 2.2);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        p.setMatrixAt(i, dummy.matrix);
        p.setColorAt(i, new Color(i % 2 === 0 ? BUILD.wood : '#b98a5c'));
      }
      p.instanceMatrix.needsUpdate = true;
      if (p.instanceColor) p.instanceColor.needsUpdate = true;
    }
    const q = posts.current;
    if (q) {
      for (let i = 0; i < 12; i++) {
        dummy.position.set(-16 + i * 3, -0.9, 7.1);
        dummy.updateMatrix();
        q.setMatrixAt(i, dummy.matrix);
      }
      q.instanceMatrix.needsUpdate = true;
    }
    const r = ribs.current;
    if (r) {
      for (let i = 0; i < 7; i++) {
        const u = (i - 3) / 3;
        dummy.position.set(-8.5 + (i - 3) * 0.55, 0.9 - u * u * 0.2, -4.6);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1 - u * u * 0.35, 1);
        dummy.updateMatrix();
        r.setMatrixAt(i, dummy.matrix);
      }
      r.instanceMatrix.needsUpdate = true;
    }
  }, [dummy]);

  return (
    <group>
      <mesh position={[0, -1.4, -4]} rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[90, 40]} />
        <meshStandardMaterial color={ATLAS.sea[2]} roughness={0.7} />
      </mesh>
      <instancedMesh ref={planks} args={[undefined, undefined, 30]} receiveShadow castShadow>
        <boxGeometry args={[1.16, 0.3, 9.4]} />
        <meshStandardMaterial flatShading />
      </instancedMesh>
      <instancedMesh ref={posts} args={[undefined, undefined, 12]}>
        <cylinderGeometry args={[0.2, 0.24, 1.9, 6]} />
        <meshStandardMaterial color={BUILD.woodDark} flatShading />
      </instancedMesh>
      {/* Grúa del astillero */}
      <mesh position={[-11.5, 3.2, -3.8]} castShadow>
        <boxGeometry args={[0.55, 6.4, 0.55]} />
        <meshStandardMaterial color={BUILD.metal} flatShading />
      </mesh>
      <mesh position={[-9.9, 6.1, -3.8]} castShadow>
        <boxGeometry args={[4, 0.3, 0.3]} />
        <meshStandardMaterial color={ISLE.gerencia} flatShading />
      </mesh>
      <mesh position={[-8.3, 4.9, -3.8]}>
        <boxGeometry args={[0.05, 2.4, 0.05]} />
        <meshStandardMaterial color={BUILD.woodDark} />
      </mesh>
      <mesh position={[-8.3, 3.6, -3.8]} castShadow>
        <boxGeometry args={[0.6, 0.4, 0.6]} />
        <meshStandardMaterial color={BUILD.wood} flatShading />
      </mesh>
      {/* Casco a medio armar */}
      <mesh position={[-8.5, 0.12, -4.6]}>
        <boxGeometry args={[4.4, 0.18, 0.3]} />
        <meshStandardMaterial color={BUILD.woodDark} flatShading />
      </mesh>
      <instancedMesh ref={ribs} args={[undefined, undefined, 7]} castShadow>
        <boxGeometry args={[0.1, 1.5, 1.7]} />
        <meshStandardMaterial color={BUILD.wood} flatShading />
      </instancedMesh>
      {/* Barco amarrado */}
      <group position={[9.5, -0.5, -3.6]} rotation-y={0.2}>
        <mesh castShadow>
          <boxGeometry args={[4.2, 0.9, 1.7]} />
          <meshStandardMaterial color={ISLE.gerencia} flatShading />
        </mesh>
        <mesh position={[2.5, 0.05, 0]} rotation-z={-Math.PI / 2} rotation-x={Math.PI / 4}>
          <coneGeometry args={[0.85, 1.6, 4]} />
          <meshStandardMaterial color={ISLE.gerencia} flatShading />
        </mesh>
        <mesh position={[0.3, 2.3, 0]}>
          <cylinderGeometry args={[0.09, 0.11, 3.6, 6]} />
          <meshStandardMaterial color={BUILD.woodDark} flatShading />
        </mesh>
        <mesh position={[-0.4, 2.1, 0]}>
          <boxGeometry args={[1.8, 2.4, 0.04]} />
          <meshStandardMaterial color={ATLAS.plate} side={DoubleSide} flatShading />
        </mesh>
      </group>
      {/* Colinas lejanas de la isla */}
      {[-22, -6, 13, 28].map((x, i) => (
        <mesh key={x} position={[x, 1.5 + (i % 2), -32]}>
          <coneGeometry args={[9 + i * 2, 7 + (i % 3) * 2, 6]} />
          <meshStandardMaterial color={i % 2 ? '#7f9fc4' : '#93afcf'} flatShading />
        </mesh>
      ))}
    </group>
  );
}

const STRIPES = 10;
const stripeX = (i: number) => (i - (STRIPES - 1) / 2) * 0.6;

/** El puesto: mostrador, toldo a rayas, pizarra, horno, rótulo y lámparas. */
export function Stall() {
  const awning = useRef<InstancedMesh>(null);
  const fringe = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);

  useLayoutEffect(() => {
    const a = awning.current;
    const f = fringe.current;
    if (!a || !f) return;
    for (let i = 0; i < STRIPES; i++) {
      const color = new Color(i % 2 === 0 ? ISLE.gerencia : ATLAS.plate);
      dummy.rotation.set(0.2, 0, 0);
      dummy.position.set(stripeX(i), 3.3, 0.35);
      dummy.updateMatrix();
      a.setMatrixAt(i, dummy.matrix);
      a.setColorAt(i, color);
      dummy.rotation.set(0, 0, 0);
      dummy.position.set(stripeX(i), 2.86, 1.62);
      dummy.updateMatrix();
      f.setMatrixAt(i, dummy.matrix);
      f.setColorAt(i, color);
    }
    a.instanceMatrix.needsUpdate = true;
    f.instanceMatrix.needsUpdate = true;
    if (a.instanceColor) a.instanceColor.needsUpdate = true;
    if (f.instanceColor) f.instanceColor.needsUpdate = true;
  }, [dummy]);

  return (
    <group>
      {/* Mostrador */}
      <mesh position={[0, 0.5, 0.1]} castShadow receiveShadow>
        <boxGeometry args={[5.6, 1, 1.2]} />
        <meshStandardMaterial color={BUILD.wood} flatShading />
      </mesh>
      <mesh position={[0, 1.04, 0.1]} castShadow receiveShadow>
        <boxGeometry args={[5.9, 0.1, 1.5]} />
        <meshStandardMaterial color="#d8b27a" flatShading />
      </mesh>
      <mesh position={[0, 0.55, 0.72]}>
        <boxGeometry args={[5.2, 0.5, 0.04]} />
        <meshStandardMaterial color={ISLE.gerencia} flatShading />
      </mesh>
      {/* Postes */}
      {[-2.85, 2.85].map((x) =>
        [-1.1, 1.5].map((z) => (
          <mesh key={`${String(x)}${String(z)}`} position={[x, z < 0 ? 1.85 : 1.55, z]} castShadow>
            <cylinderGeometry args={[0.07, 0.08, z < 0 ? 3.7 : 3.1, 6]} />
            <meshStandardMaterial color={BUILD.woodDark} flatShading />
          </mesh>
        )),
      )}
      {/* Toldo a rayas */}
      <instancedMesh ref={awning} args={[undefined, undefined, STRIPES]} castShadow>
        <boxGeometry args={[0.6, 0.07, 3.0]} />
        <meshStandardMaterial flatShading />
      </instancedMesh>
      <instancedMesh ref={fringe} args={[undefined, undefined, STRIPES]}>
        <boxGeometry args={[0.6, 0.3, 0.05]} />
        <meshStandardMaterial flatShading />
      </instancedMesh>
      {/* Fondo del puesto */}
      <mesh position={[0, 1.7, -1.15]} receiveShadow>
        <boxGeometry args={[5.7, 3.4, 0.1]} />
        <meshStandardMaterial color={BUILD.wallWarm} flatShading />
      </mesh>
      <mesh position={[-1.7, 1.3, -0.75]} castShadow>
        <boxGeometry args={[1.2, 0.9, 0.6]} />
        <meshStandardMaterial color={BUILD.stoneDark} flatShading />
      </mesh>
      <mesh position={[-1.7, 1.25, -0.43]}>
        <boxGeometry args={[0.6, 0.4, 0.04]} />
        <meshStandardMaterial color="#ff9d4a" emissive="#ff7a1f" emissiveIntensity={1.2} />
      </mesh>
      {/* Pizarra decorativa (los datos de la jornada van en el panel del juego) */}
      <mesh position={[2.0, 1.9, -1.05]}>
        <boxGeometry args={[1.5, 1.1, 0.06]} />
        <meshStandardMaterial color="#1f3f3a" flatShading />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[1.8 + (i % 2) * 0.1, 2.2 - i * 0.2, -1.01]}>
          <boxGeometry args={[0.9 - (i % 2) * 0.3, 0.03, 0.01]} />
          <meshBasicMaterial color="#e9f1ee" />
        </mesh>
      ))}
      {/* Rótulo */}
      <TextSprite
        text="EMPANADAS DEL MUELLE"
        position={[0, 4.15, 1.3]}
        height={0.5}
        background={ATLAS.sun}
        border={ATLAS.sun}
      />
      {/* Bandeja del mostrador */}
      <mesh position={[0, 1.12, 0.12]}>
        <boxGeometry args={[5.2, 0.04, 0.8]} />
        <meshStandardMaterial color={BUILD.metal} flatShading />
      </mesh>
    </group>
  );
}

/** Cajas del pedido sobre su tarima, y las empanadas que quedan en el mostrador. */
export function Cargo({ live }: { live: Live }) {
  const crates = useRef<InstancedMesh>(null);
  const lids = useRef<InstancedMesh>(null);
  const stock = useRef<InstancedMesh>(null);
  const grow = useRef<number[]>(Array.from({ length: 12 }, () => 0));
  const dummy = useMemo(() => new Object3D(), []);

  useFrame((_, dt) => {
    const m = live.current;
    const showing = m.step === 'pedido' ? m.preview : m.step === 'dilema' ? m.order : 0;
    const n = crateCount(showing);
    const c = crates.current;
    const l = lids.current;
    if (c && l) {
      for (let i = 0; i < 12; i++) {
        const want = i < n ? crateFill(showing, i) : 0;
        const cur = grow.current[i] ?? 0;
        const next = cur + (want - cur) * Math.min(1, dt * 9);
        grow.current[i] = next;
        const slot = crateSlot(i);
        const drop = want > 0 ? (1 - Math.min(1, next / want)) * 1.4 : 0;
        const h = CRATE_SIZE.h * Math.max(0.05, next);
        const baseY = slot.y - CRATE_SIZE.h / 2;
        const shown = next > 0.01;
        dummy.position.set(5.5 + slot.x * 0.8, baseY + h / 2 + drop, 0.5 + slot.z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(shown ? 0.8 : 0, Math.max(0.01, next), shown ? 0.9 : 0);
        dummy.updateMatrix();
        c.setMatrixAt(i, dummy.matrix);
        dummy.position.set(5.5 + slot.x * 0.8, baseY + h + 0.025 + drop, 0.5 + slot.z);
        dummy.scale.set(shown ? 0.84 : 0, 1, shown ? 0.94 : 0);
        dummy.updateMatrix();
        l.setMatrixAt(i, dummy.matrix);
      }
      c.instanceMatrix.needsUpdate = true;
      l.instanceMatrix.needsUpdate = true;
    }
    const s = stock.current;
    if (s) {
      const left =
        m.step === 'jornada' || m.step === 'cierre' ? Math.max(0, m.queue?.stock ?? 0) : 0;
      for (let i = 0; i < left; i++) {
        const p = stockSlot(i);
        dummy.position.set(p.x, 1.2, 0.2 + p.z);
        dummy.rotation.set(0, (i % 3) * 0.3, 0);
        dummy.scale.set(1.3, 0.55, 1);
        dummy.updateMatrix();
        s.setMatrixAt(i, dummy.matrix);
      }
      s.count = Math.min(200, left);
      s.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      <mesh position={[5.5, -0.06, 0.5]} receiveShadow>
        <boxGeometry args={[3.9, 0.1, 1.9]} />
        <meshStandardMaterial color={BUILD.woodDark} flatShading />
      </mesh>
      <instancedMesh
        ref={crates}
        args={[undefined, undefined, 12]}
        frustumCulled={false}
        castShadow
      >
        <boxGeometry args={[CRATE_SIZE.w, CRATE_SIZE.h, CRATE_SIZE.d]} />
        <meshStandardMaterial color="#b98a5c" flatShading />
      </instancedMesh>
      <instancedMesh ref={lids} args={[undefined, undefined, 12]} frustumCulled={false}>
        <boxGeometry args={[CRATE_SIZE.w, 0.05, CRATE_SIZE.d]} />
        <meshStandardMaterial color="#e5c58f" flatShading />
      </instancedMesh>
      <instancedMesh
        ref={stock}
        args={[undefined, undefined, 200]}
        frustumCulled={false}
        castShadow
      >
        <sphereGeometry args={[0.1, 6, 4]} />
        <meshStandardMaterial color="#e2a24f" flatShading />
      </instancedMesh>
    </group>
  );
}

/** Clientes: cuerpo, cabeza y bolsa, en tres mallas instanciadas. */
export function Customers({ live }: { live: Live }) {
  const bodies = useRef<InstancedMesh>(null);
  const heads = useRef<InstancedMesh>(null);
  const bags = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const tint = useMemo(() => new Color(), []);

  useFrame(({ clock }) => {
    const b = bodies.current;
    const h = heads.current;
    const g = bags.current;
    if (!b || !h || !g) return;
    const q = live.current.queue;
    const walkers = q?.walkers ?? [];
    const t = clock.elapsedTime;
    for (let i = 0; i < MAX_WALKERS; i++) {
      const w = walkers[i];
      const visible = w && w.state !== 'fuera';
      if (!w || !visible) {
        dummy.position.set(0, -10, 0);
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        b.setMatrixAt(i, dummy.matrix);
        h.setMatrixAt(i, dummy.matrix);
        g.setMatrixAt(i, dummy.matrix);
        continue;
      }
      const moving = w.state === 'llegando' || w.state === 'se-va';
      const bob = moving ? Math.abs(Math.sin(t * 9 + i * 1.7)) * 0.07 : 0;
      const shake = w.state === 'se-va' && w.turned ? Math.sin(t * 7 + i) * 0.12 : 0;
      dummy.position.set(w.x, 0.42 + bob, w.z);
      dummy.rotation.set(
        0,
        -w.facing + Math.PI / 2 + shake,
        moving ? Math.sin(t * 9 + i) * 0.05 : 0,
      );
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      b.setMatrixAt(i, dummy.matrix);
      b.setColorAt(
        i,
        tint.set(
          w.turned ? '#7a7f8c' : (SHIRTS[w.plan.shirt % SHIRTS.length] ?? SHIRTS[0] ?? '#d7262e'),
        ),
      );
      dummy.position.set(w.x, 1.05 + bob, w.z);
      dummy.updateMatrix();
      h.setMatrixAt(i, dummy.matrix);
      h.setColorAt(i, tint.set(SKINS[w.plan.skin % SKINS.length] ?? '#e0b08a'));
      if (w.bag) {
        dummy.position.set(
          w.x + Math.cos(w.facing + Math.PI / 2) * 0.28,
          0.5 + bob,
          w.z + Math.sin(w.facing + Math.PI / 2) * 0.28,
        );
        dummy.scale.setScalar(1);
      } else {
        dummy.position.set(0, -10, 0);
        dummy.scale.setScalar(0);
      }
      dummy.updateMatrix();
      g.setMatrixAt(i, dummy.matrix);
    }
    b.instanceMatrix.needsUpdate = true;
    h.instanceMatrix.needsUpdate = true;
    g.instanceMatrix.needsUpdate = true;
    if (b.instanceColor) b.instanceColor.needsUpdate = true;
    if (h.instanceColor) h.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh
        ref={bodies}
        args={[undefined, undefined, MAX_WALKERS]}
        frustumCulled={false}
        castShadow
      >
        <cylinderGeometry args={[0.16, 0.28, 0.85, 6]} />
        <meshStandardMaterial flatShading />
      </instancedMesh>
      <instancedMesh
        ref={heads}
        args={[undefined, undefined, MAX_WALKERS]}
        frustumCulled={false}
        castShadow
      >
        <icosahedronGeometry args={[0.2, 1]} />
        <meshStandardMaterial flatShading />
      </instancedMesh>
      <instancedMesh ref={bags} args={[undefined, undefined, MAX_WALKERS]} frustumCulled={false}>
        <boxGeometry args={[0.16, 0.22, 0.12]} />
        <meshStandardMaterial color="#f3d9a4" flatShading />
      </instancedMesh>
    </group>
  );
}

interface Worker {
  id: string;
  shirt: string;
  home: [number, number];
}

/** El equipo detrás del mostrador: se encorva cuando está agotado; quien trae el dilema sale al frente. */
export function Team({
  live,
  workers,
  still,
}: {
  live: Live;
  workers: [Worker, Worker];
  still: boolean;
}) {
  const refs = useRef<(Group | null)[]>([null, null]);
  const bodies = useRef<(Mesh | null)[]>([null, null]);
  const bubble = useRef<Group>(null);
  const pos = useRef<[number, number][]>(workers.map((w) => [...w.home] as [number, number]));
  const tired = useMemo(() => new Color('#8a8f9c'), []);
  const base = useMemo(() => workers.map((w) => new Color(w.shirt)), [workers]);
  const tmp = useMemo(() => new Color(), []);

  useFrame(({ clock }, dt) => {
    const m = live.current;
    const t = still ? 0 : clock.elapsedTime;
    const mood = Math.min(1, Math.max(0, m.team / 100));
    workers.forEach((w, i) => {
      const g = refs.current[i];
      const cur = pos.current[i];
      if (!g || !cur) return;
      const goFront = i === 1 && m.messenger;
      const tx = goFront ? 1.9 : w.home[0];
      const tz = goFront ? 2.6 : w.home[1];
      const s = Math.min(1, dt * 3);
      cur[0] += (tx - cur[0]) * s;
      cur[1] += (tz - cur[1]) * s;
      const walking = Math.hypot(tx - cur[0], tz - cur[1]) > 0.05;
      g.position.set(
        cur[0],
        (walking ? Math.abs(Math.sin(t * 9)) * 0.06 : Math.sin(t * 2 + i) * 0.015) + 0.02,
        cur[1],
      );
      g.rotation.y = goFront ? 0.2 : 0;
      g.rotation.x = (1 - mood) * 0.22 + (walking ? 0 : Math.sin(t * 1.5 + i) * 0.02);
      const body = bodies.current[i];
      if (body)
        (body.material as MeshStandardMaterial).color.copy(
          tmp.copy(base[i] ?? tired).lerp(tired, (1 - mood) * 0.8),
        );
    });
    if (bubble.current) bubble.current.visible = m.messenger;
  });

  return (
    <group>
      {workers.map((w, i) => (
        <group
          key={w.id}
          ref={(g) => {
            refs.current[i] = g;
          }}
          position={[w.home[0], 0, w.home[1]]}
        >
          <mesh position-y={0.45} castShadow>
            <cylinderGeometry args={[0.2, 0.27, 0.9, 6]} />
            <meshStandardMaterial color={ATLAS.ink} flatShading />
          </mesh>
          <mesh
            ref={(m) => {
              bodies.current[i] = m;
            }}
            position-y={1.25}
            castShadow
          >
            <cylinderGeometry args={[0.2, 0.26, 0.7, 6]} />
            <meshStandardMaterial color={w.shirt} flatShading />
          </mesh>
          <mesh position-y={1.78} castShadow>
            <icosahedronGeometry args={[0.2, 1]} />
            <meshStandardMaterial color={i === 0 ? '#c68a5e' : '#e0b08a'} flatShading />
          </mesh>
          <mesh position-y={1.97}>
            <cylinderGeometry args={[0.14, 0.22, 0.14, 6]} />
            <meshStandardMaterial color={ATLAS.plate} flatShading />
          </mesh>
          {i === 1 && (
            <group ref={bubble} position-y={2.45} visible={false}>
              <TextSprite text="¡Jefe, un problema!" position={[0, 0, 0]} height={0.38} size={44} />
            </group>
          )}
        </group>
      ))}
    </group>
  );
}
