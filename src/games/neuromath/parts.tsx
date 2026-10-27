import { useFrame } from '@react-three/fiber';
import { useRef, type RefObject } from 'react';
import type { Group, Mesh, MeshStandardMaterial } from 'three';
import { ATLAS, BUILD } from '@/world/palette';
import { fall, type Body } from './debris';

/** Piezas 3D que comparten el reto y la arena de NeuroMath: tramos de puente y escombros. */

const PLANK_THICK = 0.24;

export interface PlankLook {
  /** Iluminación del tramo: 0 madera, 1 luz encendida. */
  lit: number;
  /** Arqueo del tramo cuando el puente no encaja (0 a 1). */
  arch?: number;
  /** Fantasma: la ranura aún vacía o la pieza que no está. */
  ghost?: boolean;
  /** Oculto: el tramo ya se derrumbó. */
  hidden?: boolean;
}

/**
 * Un tramo de puente a escala, con su veta de luz. Se coloca por el centro
 * (`position`); `axis` es el eje por el que corre el largo. Lee su aspecto en
 * cada cuadro con `look`, sin volver a renderizar React.
 */
export function Plank({
  length,
  width,
  position,
  axis,
  look,
  onSelect,
  tone = BUILD.wood,
}: {
  length: number;
  width: number;
  position: readonly [number, number, number];
  axis: 'x' | 'z';
  look: () => PlankLook;
  onSelect?: () => void;
  tone?: string;
}) {
  const root = useRef<Group>(null);
  const body = useRef<MeshStandardMaterial>(null);
  const stripe = useRef<MeshStandardMaterial>(null);

  useFrame(() => {
    const s = look();
    const node = root.current;
    if (!node) return;
    node.visible = !s.hidden;
    node.position.set(position[0], position[1] + (s.arch ?? 0) * 0.35, position[2]);
    node.rotation.z = (s.arch ?? 0) * (axis === 'x' ? 0.1 : 0);
    if (body.current) {
      body.current.opacity = s.ghost ? 0.35 : 1;
      body.current.transparent = Boolean(s.ghost);
    }
    if (stripe.current) stripe.current.emissiveIntensity = s.lit * 1.4;
  });

  return (
    <group ref={root} position={position} rotation-y={axis === 'z' ? Math.PI / 2 : 0}>
      <mesh
        castShadow
        receiveShadow
        onClick={
          onSelect
            ? (event) => {
                event.stopPropagation();
                onSelect();
              }
            : undefined
        }
      >
        <boxGeometry args={[length - 0.04, PLANK_THICK, width]} />
        <meshStandardMaterial ref={body} color={tone} flatShading roughness={0.9} />
      </mesh>
      <mesh position-y={PLANK_THICK / 2 + 0.012}>
        <boxGeometry args={[length - 0.2, 0.025, width * 0.46]} />
        <meshStandardMaterial
          ref={stripe}
          color={ATLAS.plate}
          emissive={ATLAS.sun}
          emissiveIntensity={0}
          flatShading
        />
      </mesh>
    </group>
  );
}

export interface Falling {
  body: Body;
  length: number;
  width: number;
  axis: 'x' | 'z';
  color: string;
}

const SLOTS = 8;

/**
 * Los escombros que caen: tramos del puente, la vagoneta. Cinemática de
 * `debris.ts`; al tocar el fondo se hunden y dejan una onda en el agua.
 */
export function DebrisField({
  items,
  floor,
  onSplash,
}: {
  items: RefObject<Falling[]>;
  floor: number;
  onSplash?: (x: number, z: number) => void;
}) {
  const meshes = useRef<(Mesh | null)[]>([]);
  const rings = useRef<(Mesh | null)[]>([]);
  const ripples = useRef<{ x: number; z: number; age: number }[]>([]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(0.05, dtRaw);
    for (let i = 0; i < SLOTS; i++) {
      const mesh = meshes.current[i];
      const item = items.current[i];
      if (!mesh) continue;
      if (!item) {
        mesh.visible = false;
        continue;
      }
      const { body } = item;
      if (fall(body, dt, floor)) {
        ripples.current.push({ x: body.x, z: body.z, age: 0 });
        onSplash?.(body.x, body.z);
      }
      mesh.visible = body.y > floor - 2.4;
      mesh.position.set(body.x, body.y, body.z);
      mesh.rotation.set(body.rx, item.axis === 'z' ? Math.PI / 2 : 0, body.rz);
      mesh.scale.set(item.length, 1, item.width);
      (mesh.material as MeshStandardMaterial).color.set(item.color);
    }
    ripples.current = ripples.current.filter((r) => (r.age += dt) < 1.1);
    for (let i = 0; i < 4; i++) {
      const ring = rings.current[i];
      const r = ripples.current[ripples.current.length - 1 - i];
      if (!ring) continue;
      ring.visible = Boolean(r);
      if (r) {
        ring.position.set(r.x, floor + 0.04, r.z);
        const k = 0.4 + r.age * 2.4;
        ring.scale.set(k, k, k);
        (ring.material as MeshStandardMaterial).opacity = Math.max(0, 0.75 - r.age * 0.7);
      }
    }
  });

  return (
    <group>
      {Array.from({ length: SLOTS }, (_, i) => (
        <mesh
          key={i}
          ref={(m) => {
            meshes.current[i] = m;
          }}
          visible={false}
          castShadow
        >
          <boxGeometry args={[1, PLANK_THICK, 1]} />
          <meshStandardMaterial color={BUILD.wood} flatShading />
        </mesh>
      ))}
      {Array.from({ length: 4 }, (_, i) => (
        <mesh
          key={`r${String(i)}`}
          ref={(m) => {
            rings.current[i] = m;
          }}
          visible={false}
          rotation-x={-Math.PI / 2}
        >
          <ringGeometry args={[0.7, 0.9, 20]} />
          <meshStandardMaterial
            color={ATLAS.plate}
            transparent
            opacity={0.7}
            depthWrite={false}
            flatShading
          />
        </mesh>
      ))}
    </group>
  );
}
