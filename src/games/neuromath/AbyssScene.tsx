import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef, type RefObject } from 'react';
import {
  DoubleSide,
  Object3D,
  type Group,
  type InstancedMesh,
  type Mesh,
  type MeshStandardMaterial,
} from 'three';
import type { Bridge } from '@/data/contentSchemas';
import { ATLAS, BUILD } from '@/world/palette';
import type { ArenaState } from '../shared/arena/core';
import { ABYSS, DECK, deckSegments, tileSpot } from './abyss';
import { TIMES, type Build } from './buildFlow';
import { ACCENT } from './colors';
import { Label } from './Label';
import { useCompact } from './useCompact';
import { Plank, type PlankLook } from './parts';

const STONE = '#9fa9b6';
const STONE_DARK = '#46556c';
const DEEP = '#0a1c3a';
/** Altura del tablero: sobre la roca del anillo. */
const DECK_Y = 0.06;

/** El anillo de roca geométrico, el abismo central y los pilares del observatorio. */
export function AbyssTerrain({ still }: { still: boolean }) {
  const lines = useRef<InstancedMesh>(null);
  const shards = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);

  useLayoutEffect(() => {
    const node = lines.current;
    if (!node) return;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const r = (ABYSS.hole + ABYSS.radius) / 2;
      dummy.position.set(Math.cos(a) * r, 0.025, Math.sin(a) * r);
      dummy.rotation.set(0, -a, 0);
      dummy.scale.set(ABYSS.radius - ABYSS.hole - 0.5, 1, 1);
      dummy.updateMatrix();
      node.setMatrixAt(i, dummy.matrix);
    }
    node.instanceMatrix.needsUpdate = true;
  }, [dummy]);

  useFrame(({ clock }) => {
    const node = shards.current;
    if (!node) return;
    const t = still ? 0 : clock.elapsedTime;
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + t * 0.12;
      const r = 2.2 + (i % 3) * 0.7;
      dummy.position.set(
        Math.cos(a) * r,
        -2.4 + Math.sin(t * 0.6 + i) * 0.35 - (i % 2),
        Math.sin(a) * r,
      );
      dummy.rotation.set(t * 0.3 + i, t * 0.2, i);
      dummy.scale.setScalar(0.28 + (i % 3) * 0.12);
      dummy.updateMatrix();
      node.setMatrixAt(i, dummy.matrix);
    }
    node.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      {/* Anillo de roca */}
      <mesh rotation-x={-Math.PI / 2}>
        <ringGeometry args={[ABYSS.hole, ABYSS.radius, 14, 1]} />
        <meshStandardMaterial color={STONE} flatShading roughness={0.95} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.012}>
        <ringGeometry args={[ABYSS.hole + 0.25, ABYSS.hole + 0.5, 14, 1]} />
        <meshStandardMaterial color={ACCENT} flatShading />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.012}>
        <ringGeometry args={[ABYSS.radius - 0.7, ABYSS.radius - 0.5, 14, 1]} />
        <meshStandardMaterial color={ATLAS.plate} flatShading />
      </mesh>
      <instancedMesh ref={lines} args={[undefined, undefined, 12]}>
        <boxGeometry args={[1, 0.02, 0.05]} />
        <meshStandardMaterial color={ATLAS.plate} flatShading />
      </instancedMesh>
      {/* Faldón exterior y mar */}
      <mesh position-y={-1.65}>
        <cylinderGeometry args={[ABYSS.radius + 0.05, ABYSS.radius * 0.62, 3.2, 14]} />
        <meshStandardMaterial color={STONE_DARK} flatShading roughness={1} />
      </mesh>
      <mesh position-y={-1.2} rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[ABYSS.radius * 6, 40]} />
        <meshStandardMaterial color={ATLAS.sea[3]} roughness={0.6} />
      </mesh>
      {/* Pared del abismo y fondo oscuro */}
      <mesh position-y={-3.4}>
        <cylinderGeometry args={[ABYSS.hole, ABYSS.hole * 0.8, 6.8, 14, 1, true]} />
        <meshStandardMaterial color={STONE_DARK} flatShading side={DoubleSide} roughness={1} />
      </mesh>
      <mesh position-y={-6.7} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[ABYSS.hole * 0.82, 14]} />
        <meshStandardMaterial color={DEEP} emissive={ACCENT} emissiveIntensity={0.25} />
      </mesh>
      <instancedMesh ref={shards} args={[undefined, undefined, 7]}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color={STONE}
          flatShading
          emissive={ACCENT}
          emissiveIntensity={0.15}
        />
      </instancedMesh>
      {/* Pilares del observatorio */}
      {[205, 335, 250, 290].map((deg, i) => {
        const a = (deg * Math.PI) / 180;
        const r = ABYSS.radius - 0.6;
        return (
          <group key={deg} position={[Math.cos(a) * r, 0, Math.sin(a) * r]}>
            <mesh position-y={0.9 + (i % 2) * 0.3} castShadow>
              <cylinderGeometry args={[0.3, 0.42, 1.8 + (i % 2) * 0.6, 6]} />
              <meshStandardMaterial color={ATLAS.plate} flatShading />
            </mesh>
            <mesh position-y={1.95 + (i % 2) * 0.6}>
              <octahedronGeometry args={[0.28, 0]} />
              <meshStandardMaterial
                color={ATLAS.sun}
                emissive={ATLAS.sun}
                emissiveIntensity={0.7}
                flatShading
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/** Una loseta con su valor, esperando en el anillo. */
function TileMesh({
  index,
  count,
  label,
  highlight,
}: {
  index: number;
  count: number;
  label: string;
  highlight: boolean;
}) {
  const spot = tileSpot(index, count);
  const compact = useCompact();
  const mat = useRef<MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (mat.current)
      mat.current.emissiveIntensity = highlight
        ? 1.1
        : 0.25 + 0.12 * Math.sin(clock.elapsedTime * 2 + index);
  });
  return (
    <group position={[spot.x, 0, spot.z]} rotation-y={-Math.atan2(spot.z, spot.x) + Math.PI / 2}>
      <mesh position-y={0.17} castShadow>
        <boxGeometry args={[1.5, 0.3, 0.95]} />
        <meshStandardMaterial
          ref={mat}
          color={BUILD.wallWarm}
          emissive={ATLAS.sun}
          emissiveIntensity={0.25}
          flatShading
        />
      </mesh>
      <mesh position-y={0.34}>
        <boxGeometry args={[1.3, 0.02, 0.18]} />
        <meshStandardMaterial color={ACCENT} flatShading />
      </mesh>
      <Label
        text={label}
        badge={String(index + 1)}
        position={[0, 1.2, 0]}
        height={0.5}
        compact={compact}
      />
    </group>
  );
}

/** Las losetas que aún no están en el puente ni en las manos. */
export function Tiles({
  bridge,
  placed,
  carried,
  near,
}: {
  bridge: Bridge;
  placed: readonly string[];
  carried: string | null;
  near: string | null;
}) {
  return (
    <group>
      {bridge.pieces.map((piece, i) =>
        placed.includes(piece.id) || carried === piece.id ? null : (
          <TileMesh
            key={piece.id}
            index={i}
            count={bridge.pieces.length}
            label={piece.label}
            highlight={near === piece.id}
          />
        ),
      )}
    </group>
  );
}

/** El estribo donde se tiende el puente, la palanca de prueba y el faro del otro lado. */
export function BuildStation({
  buildRef,
  nearKind,
}: {
  buildRef: RefObject<Build>;
  nearKind: 'abutment' | 'lever' | null;
}) {
  const handle = useRef<Group>(null);
  const beacon = useRef<MeshStandardMaterial>(null);
  const pad = useRef<MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    const b = buildRef.current;
    if (handle.current) {
      const target = b.phase === 'testing' ? 0.9 : -0.7;
      handle.current.rotation.z += (target - handle.current.rotation.z) * 0.2;
    }
    if (beacon.current) beacon.current.emissiveIntensity = b.phase === 'lit' ? 1.8 : 0.2;
    if (pad.current)
      pad.current.emissiveIntensity =
        b.phase === 'building'
          ? 0.5 + 0.3 * Math.sin(clock.elapsedTime * 3) + (nearKind === 'abutment' ? 0.6 : 0)
          : 0.05;
  });
  return (
    <group>
      <mesh position={[ABYSS.abutment.x, 0.07, ABYSS.abutment.z - 0.4]} receiveShadow>
        <boxGeometry args={[2.1, 0.14, 1.9]} />
        <meshStandardMaterial
          ref={pad}
          color={BUILD.paving}
          emissive={ATLAS.sun}
          emissiveIntensity={0.1}
          flatShading
        />
      </mesh>
      {/* Palanca de prueba */}
      <group position={[ABYSS.lever.x, 0, ABYSS.lever.z]}>
        <mesh position-y={0.35} castShadow>
          <boxGeometry args={[0.7, 0.7, 0.5]} />
          <meshStandardMaterial color={BUILD.metal} flatShading />
        </mesh>
        <group ref={handle} position-y={0.75}>
          <mesh position-y={0.4}>
            <cylinderGeometry args={[0.05, 0.05, 0.8, 6]} />
            <meshStandardMaterial color={BUILD.woodDark} flatShading />
          </mesh>
          <mesh position-y={0.85}>
            <icosahedronGeometry args={[0.16, 0]} />
            <meshStandardMaterial
              color={ATLAS.route}
              emissive={ATLAS.route}
              emissiveIntensity={nearKind === 'lever' ? 1 : 0.3}
              flatShading
            />
          </mesh>
        </group>
      </group>
      {/* Faro del extremo norte: de ahí sale el haz cuando el puente se enciende */}
      <group position={[0, 0, DECK.end - 0.7]}>
        <mesh position-y={0.55} castShadow>
          <cylinderGeometry args={[0.22, 0.34, 1.1, 6]} />
          <meshStandardMaterial color={ATLAS.plate} flatShading />
        </mesh>
        <mesh position-y={1.3}>
          <icosahedronGeometry args={[0.3, 0]} />
          <meshStandardMaterial
            ref={beacon}
            color={ATLAS.sun}
            emissive={ATLAS.sun}
            emissiveIntensity={0.2}
            flatShading
          />
        </mesh>
      </group>
    </group>
  );
}

/** Los tramos tendidos (con sus ranuras vacías como fantasmas) y su aspecto según la prueba. */
export function BridgeDeck({
  bridge,
  placed,
  buildRef,
}: {
  bridge: Bridge;
  placed: readonly string[];
  buildRef: RefObject<Build>;
}) {
  const segments = useMemo(() => deckSegments(bridge, placed), [bridge, placed]);
  const lastZ = segments.at(-1)?.z1 ?? DECK.start;
  const empty = Math.max(0, bridge.slots - placed.length);
  const room = Math.max(0, lastZ - DECK.end);
  const ghostLength = empty > 0 ? room / empty : 0;

  const lookFor = (index: number, count: number): (() => PlankLook) => {
    return () => {
      const b = buildRef.current;
      if (b.phase === 'fallen' || b.phase === 'waiting') return { lit: 0, ghost: true, arch: 0 };
      if (b.phase === 'dissolving') return { lit: Math.max(0, b.timer / TIMES.dissolve), arch: 0 };
      if (b.phase === 'lit') return { lit: 1, arch: 0 };
      if (b.phase === 'testing') {
        const progress = 1 - b.timer / TIMES.test;
        if (b.outcome === 'resiste') {
          // La luz recorre el tendido tramo a tramo.
          return { lit: Math.max(0, Math.min(1, progress * (count + 0.5) - index)), arch: 0 };
        }
        return {
          lit: 0,
          arch: Math.min(1, progress * 1.6) * (0.5 + 0.5 * Math.sin(progress * 40)),
        };
      }
      return { lit: 0, arch: 0 };
    };
  };

  return (
    <group position-y={DECK_Y}>
      {segments.map((s, i) => {
        const length = s.z0 - s.z1;
        return (
          <group key={s.pieceId}>
            <Plank
              length={length}
              width={ABYSS.deckHalf * 2}
              axis="z"
              position={[0, 0, (s.z0 + s.z1) / 2]}
              look={lookFor(i, segments.length)}
              tone={BUILD.wood}
            />
            <Label text={s.label} position={[0, 0.8, (s.z0 + s.z1) / 2]} height={0.42} />
          </group>
        );
      })}
      {ghostLength > 0.2 &&
        Array.from({ length: empty }, (_, i) => (
          <Plank
            key={`g${String(i)}`}
            length={ghostLength}
            width={ABYSS.deckHalf * 2}
            axis="z"
            position={[0, 0, lastZ - ghostLength * (i + 0.5)]}
            look={() => ({ lit: 0, ghost: true })}
            tone={ACCENT}
          />
        ))}
    </group>
  );
}

/** La loseta que se lleva en las manos, flotando sobre la cabeza del explorador. */
export function CarriedTile({
  state,
  buildRef,
  label,
}: {
  state: ArenaState;
  buildRef: RefObject<Build>;
  label: string | null;
}) {
  const node = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (!node.current) return;
    node.current.visible = buildRef.current.carried !== null;
    node.current.position.set(
      state.player.x,
      2.15 + Math.sin(clock.elapsedTime * 3) * 0.05,
      state.player.z,
    );
  });
  return (
    <mesh ref={node} visible={false}>
      <boxGeometry args={[1.1, 0.22, 0.7]} />
      <meshStandardMaterial
        color={BUILD.wallWarm}
        emissive={ATLAS.sun}
        emissiveIntensity={0.9}
        flatShading
      />
      {label !== null && (
        <Label text={label} fill="#fed300" position={[0, 0.55, 0]} height={0.42} />
      )}
    </mesh>
  );
}
