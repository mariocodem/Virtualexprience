import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type ReactNode } from 'react';
import { Vector3 } from 'three';
import type { Group, Mesh, MeshStandardMaterial } from 'three';
import { Label } from '@/games/comunicarte/Label';
import type { Island } from '@/types/domain';
import { ATLAS, BUILD, ISLE } from '@/world/palette';
import { IslandLandmarks } from '@/world/scene/IslandLandmarks';
import type { Controls } from '../shared/controls';
import { ArenaLights } from '../shared/scene/ArenaScenery';
import { Explorer } from '../shared/scene/Explorer';
import { islandSet, nearestSpot, PLAZA_RADIUS, stepWalker, type Spot, type Walker } from './plaza';

/**
 * El lugar de la isla alrededor de la plaza: suelo en terrazas, el claro
 * empedrado, las construcciones de la carta a escala de caminante y el mar.
 */
export function StationSet({ island, still }: { island: Island; still: boolean }) {
  const set = useMemo(() => islandSet(island.id), [island.id]);
  return (
    <>
      <ArenaLights near={26} far={70} />
      {/* Suelo de la isla a ras del claro y terrazas que suben detrás de las construcciones. */}
      <mesh position-y={-0.5} receiveShadow>
        <cylinderGeometry args={[30, 30.6, 1, 48]} />
        <meshStandardMaterial color={ATLAS.land[0]} flatShading roughness={0.95} />
      </mesh>
      {(
        [
          [24, 1.6, -40, ATLAS.land[1]],
          [16, 3.4, -46, ATLAS.land[2]],
        ] as const
      ).map(([radius, top, z, color]) => (
        <mesh key={z} position={[0, top / 2 - 0.2, z]} receiveShadow>
          <cylinderGeometry args={[radius, radius + 0.8, top, 40]} />
          <meshStandardMaterial color={color} flatShading roughness={0.95} />
        </mesh>
      ))}
      <mesh position-y={0.01} rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[PLAZA_RADIUS, 48]} />
        <meshStandardMaterial color={BUILD.stone} roughness={0.9} />
      </mesh>
      <mesh position-y={0.03} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[PLAZA_RADIUS - 0.22, PLAZA_RADIUS, 48]} />
        <meshStandardMaterial color={ISLE[island.id]} />
      </mesh>
      <mesh position-y={-1.2} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[160, 48]} />
        <meshStandardMaterial color={ATLAS.sea[3]} roughness={0.6} />
      </mesh>
      <IslandLandmarks
        island={island}
        lit={1}
        still={still}
        landmarks={set}
        kitKey={`plaza:${island.id}`}
      />
    </>
  );
}

/**
 * Mueve al explorador con los mandos y avisa qué punto queda a mano (solo
 * cuando cambia). `paused` congela la caminata mientras hay un panel abierto.
 */
export function Walk({
  walker,
  controls,
  spots,
  paused,
  still,
  onNear,
  onUse,
}: {
  walker: Walker;
  controls: Controls;
  spots: readonly Spot[];
  paused: () => boolean;
  still: boolean;
  onNear: (spot: Spot | undefined) => void;
  onUse: (spot: Spot) => void;
}) {
  const near = useRef<string | undefined>(undefined);
  useFrame((_, dt) => {
    if (paused()) {
      stepWalker(walker, { x: 0, z: 0 }, 0);
      controls.take('interact');
      return;
    }
    stepWalker(walker, controls.move(), Math.min(0.05, dt));
    const spot = nearestSpot(spots, walker);
    if (spot?.id !== near.current) {
      near.current = spot?.id;
      onNear(spot);
    }
    if (controls.take('interact') && spot) onUse(spot);
  });
  return (
    <>
      <Explorer get={() => walker} glow={0.6} still={still} />
      <PlazaCamera walker={walker} still={still} />
    </>
  );
}

/**
 * Cámara de la plaza: detrás del explorador y mirando hacia el fondo, para que
 * el lugar de la isla (sus construcciones) quede siempre a la vista. Con
 * movimiento reducido no sigue al explorador.
 */
function PlazaCamera({ walker, still }: { walker: Walker; still: boolean }) {
  const look = useMemo(() => new Vector3(), []);
  useFrame(({ camera }, dt) => {
    const k = still ? 0 : 0.4;
    const x = walker.x * k;
    const z = walker.z * k;
    const s = Math.min(1, dt * 3);
    camera.position.x += (x - camera.position.x) * s;
    camera.position.y += (5.6 - camera.position.y) * s;
    camera.position.z += (z + 10.5 - camera.position.z) * s;
    look.set(x, 1.4, z - 3.5);
    camera.lookAt(look);
  });
  return null;
}

/** Anillo en el suelo bajo el punto a mano: rojo de ruta, «tu foco». */
export function FocusRing({ spot, still }: { spot: Spot | undefined; still: boolean }) {
  const ring = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (!ring.current) return;
    const pulse = still ? 1 : 1 + Math.sin(clock.elapsedTime * 5) * 0.06;
    ring.current.scale.setScalar(pulse);
  });
  if (!spot) return null;
  return (
    <mesh ref={ring} position={[spot.x, 0.05, spot.z]} rotation-x={-Math.PI / 2}>
      <ringGeometry args={[0.95, 1.15, 36]} />
      <meshBasicMaterial color={ATLAS.route} />
    </mesh>
  );
}

/** Un punto de la plaza: su objeto, su rótulo y un brillo cuando ya se usó. */
export function SpotProp({
  spot,
  label,
  done = false,
  dim = false,
  labelY = 2.35,
  children,
}: {
  spot: Spot;
  label: string;
  done?: boolean;
  dim?: boolean;
  /** Altura del rótulo sobre el objeto. */
  labelY?: number;
  children: ReactNode;
}) {
  return (
    <group position={[spot.x, 0, spot.z]} rotation-y={Math.atan2(-spot.x, -spot.z) + Math.PI}>
      <mesh position-y={0.06} rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[0.9, 28]} />
        <meshStandardMaterial
          color={done ? ATLAS.land[2] : dim ? BUILD.stoneDark : ATLAS.plate}
          roughness={0.8}
        />
      </mesh>
      {children}
      <Label
        text={done ? `✓ ${label}` : label}
        position={[0, labelY, 0]}
        height={0.42}
        fg={ATLAS.ink}
        bg={ATLAS.plate}
        weight={700}
      />
    </group>
  );
}

const box = (w: number, h: number, d: number) => <boxGeometry args={[w, h, d]} />;
const mat = (color: string, emissive?: string) => (
  <meshStandardMaterial
    color={color}
    flatShading
    roughness={0.8}
    emissive={emissive ?? '#000000'}
    emissiveIntensity={emissive ? 0.5 : 0}
  />
);

/** Atril con un libro abierto: el texto. */
export function Lectern({ accent }: { accent: string }) {
  return (
    <group>
      <mesh position-y={0.55} castShadow>
        {box(0.16, 1.1, 0.16)}
        {mat(BUILD.woodDark)}
      </mesh>
      <mesh position={[0, 1.15, 0.05]} rotation-x={-0.5} castShadow>
        {box(0.9, 0.08, 0.6)}
        {mat(BUILD.wood)}
      </mesh>
      <mesh position={[0, 1.22, 0.06]} rotation-x={-0.5}>
        {box(0.78, 0.05, 0.48)}
        {mat(ATLAS.plate)}
      </mesh>
      <mesh position={[0, 1.25, 0.07]} rotation-x={-0.5}>
        {box(0.04, 0.03, 0.48)}
        {mat(accent)}
      </mesh>
    </group>
  );
}

/** Radio de mesa con su altavoz: el audio. */
export function RadioSet({ accent, still }: { accent: string; still: boolean }) {
  const cone = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (cone.current && !still)
      cone.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 9) * 0.04);
  });
  return (
    <group>
      <mesh position-y={0.4} castShadow>
        {box(0.9, 0.8, 0.6)}
        {mat(BUILD.wood)}
      </mesh>
      <mesh position={[0, 1.15, 0]} castShadow>
        {box(1.1, 0.7, 0.5)}
        {mat(accent)}
      </mesh>
      <mesh ref={cone} position={[-0.2, 1.15, 0.26]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.22, 0.22, 0.04, 20]} />
        {mat(BUILD.metal)}
      </mesh>
      <mesh position={[0.32, 1.25, 0.26]}>
        {box(0.26, 0.14, 0.03)}
        {mat(ATLAS.sun, ATLAS.sun)}
      </mesh>
      <mesh position={[0.4, 1.75, 0]} rotation-z={-0.4}>
        <cylinderGeometry args={[0.02, 0.02, 0.6, 6]} />
        {mat(BUILD.metal)}
      </mesh>
    </group>
  );
}

/** Pantalla en su caballete: el video. */
export function Screen({ accent, still }: { accent: string; still: boolean }) {
  const glow = useRef<MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (glow.current && !still)
      glow.current.emissiveIntensity = 0.55 + Math.sin(clock.elapsedTime * 2) * 0.15;
  });
  return (
    <group>
      {[-0.5, 0.5].map((x) => (
        <mesh key={x} position={[x, 0.7, 0]} castShadow>
          {box(0.08, 1.4, 0.08)}
          {mat(BUILD.metal)}
        </mesh>
      ))}
      <mesh position={[0, 1.45, 0]} castShadow>
        {box(1.5, 0.95, 0.1)}
        {mat(ATLAS.ink)}
      </mesh>
      <mesh position={[0, 1.45, 0.06]}>
        {box(1.32, 0.78, 0.02)}
        <meshStandardMaterial
          ref={glow}
          color={ATLAS.sea[1]}
          emissive={ATLAS.sea[0]}
          emissiveIntensity={0.55}
        />
      </mesh>
      <mesh position={[0, 1.45, 0.08]}>
        <coneGeometry args={[0.16, 0.26, 3]} />
        {mat(accent)}
      </mesh>
    </group>
  );
}

/** Mural con bloques de color: la infografía. */
export function Mural({ accent }: { accent: string }) {
  return (
    <group>
      <mesh position={[0, 1.1, 0]} castShadow>
        {box(1.7, 1.5, 0.12)}
        {mat(ATLAS.plate)}
      </mesh>
      {[
        [-0.5, 1.45, accent],
        [0.2, 1.45, ATLAS.sea[2]],
        [-0.3, 0.85, ATLAS.land[1]],
        [0.45, 0.85, ATLAS.sun],
      ].map(([x, y, color], i) => (
        <mesh key={i} position={[Number(x), Number(y), 0.07]}>
          {box(0.5, 0.36, 0.02)}
          {mat(String(color))}
        </mesh>
      ))}
      {[-0.6, 0.6].map((x) => (
        <mesh key={x} position={[x, 0.18, 0]}>
          {box(0.08, 0.36, 0.08)}
          {mat(BUILD.woodDark)}
        </mesh>
      ))}
    </group>
  );
}

/** Mesa con piezas para manipular: lo interactivo. */
export function Workbench({ accent, still }: { accent: string; still: boolean }) {
  const piece = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (piece.current && !still) piece.current.rotation.y = clock.elapsedTime * 0.8;
  });
  return (
    <group>
      <mesh position-y={0.75} castShadow>
        {box(1.4, 0.1, 0.8)}
        {mat(BUILD.wood)}
      </mesh>
      {[
        [-0.6, -0.32],
        [0.6, -0.32],
        [-0.6, 0.32],
        [0.6, 0.32],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x ?? 0, 0.36, z ?? 0]}>
          {box(0.08, 0.72, 0.08)}
          {mat(BUILD.woodDark)}
        </mesh>
      ))}
      <group ref={piece} position={[0, 1.05, 0]}>
        <mesh position={[-0.25, 0, 0]} castShadow>
          {box(0.3, 0.3, 0.3)}
          {mat(accent)}
        </mesh>
        <mesh position={[0.22, 0.05, 0.1]} castShadow>
          <octahedronGeometry args={[0.22]} />
          {mat(ATLAS.sun)}
        </mesh>
      </group>
    </group>
  );
}

/** Farol de la estación: se enciende cuando ya se puede comprobar o seguir. */
export function Beacon({ lit, still }: { lit: boolean; still: boolean }) {
  const lamp = useRef<MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (!lamp.current) return;
    lamp.current.emissiveIntensity = lit
      ? still
        ? 1.4
        : 1.2 + Math.sin(clock.elapsedTime * 3) * 0.3
      : 0.05;
  });
  return (
    <group>
      <mesh position-y={0.9} castShadow>
        <cylinderGeometry args={[0.16, 0.24, 1.8, 8]} />
        {mat(ATLAS.ink)}
      </mesh>
      <mesh position-y={2}>
        <cylinderGeometry args={[0.3, 0.3, 0.42, 8]} />
        <meshStandardMaterial
          ref={lamp}
          color={lit ? ATLAS.sun : BUILD.stone}
          emissive={ATLAS.sun}
          emissiveIntensity={0.05}
        />
      </mesh>
      <mesh position-y={2.32}>
        <coneGeometry args={[0.38, 0.3, 8]} />
        {mat(ATLAS.route)}
      </mesh>
      {lit && <pointLight position={[0, 2, 0]} color={ATLAS.sun} intensity={6} distance={6} />}
    </group>
  );
}

/** Farol de respuesta con su número: verde si acertó, rojo de ruta si no. */
export function AnswerLantern({
  number,
  state,
  accent,
}: {
  number: number;
  state: 'idle' | 'correct' | 'wrong';
  accent: string;
}) {
  const light = state === 'correct' ? ATLAS.land[0] : state === 'wrong' ? ATLAS.route : ATLAS.sun;
  return (
    <group>
      <mesh position-y={0.5} castShadow>
        {box(0.7, 1, 0.7)}
        {mat(accent)}
      </mesh>
      <mesh position-y={1.35}>
        {box(0.5, 0.6, 0.5)}
        <meshStandardMaterial
          color={light}
          emissive={light}
          emissiveIntensity={state === 'idle' ? 0.35 : 1}
          transparent
          opacity={0.92}
        />
      </mesh>
      <mesh position-y={1.75}>
        <coneGeometry args={[0.42, 0.3, 4]} />
        {mat(ATLAS.ink)}
      </mesh>
      <Label
        text={String(number)}
        position={[0, 0.55, 0.37]}
        billboard={false}
        height={0.45}
        fg={ATLAS.plate}
        bg={accent}
        weight={800}
      />
    </group>
  );
}

/** Escritorio con la bitácora abierta y su lámpara: reflexionar. */
export function JournalDesk({ accent }: { accent: string }) {
  return (
    <group>
      <mesh position-y={0.78} castShadow>
        {box(1.5, 0.1, 0.8)}
        {mat(BUILD.woodDark)}
      </mesh>
      {[-0.65, 0.65].map((x) => (
        <mesh key={x} position={[x, 0.38, 0]}>
          {box(0.1, 0.76, 0.7)}
          {mat(BUILD.wood)}
        </mesh>
      ))}
      <mesh position={[-0.15, 0.86, 0.05]} rotation-y={0.1}>
        {box(0.8, 0.05, 0.55)}
        {mat(ATLAS.plate)}
      </mesh>
      <mesh position={[-0.15, 0.89, 0.05]} rotation-y={0.1}>
        {box(0.03, 0.02, 0.55)}
        {mat(accent)}
      </mesh>
      <mesh position={[0.55, 1.05, -0.15]}>
        <cylinderGeometry args={[0.1, 0.14, 0.3, 8]} />
        <meshStandardMaterial color={ATLAS.sun} emissive={ATLAS.sun} emissiveIntensity={0.8} />
      </mesh>
      <pointLight position={[0.55, 1.4, 0]} color={ATLAS.dawn} intensity={3} distance={4} />
    </group>
  );
}
