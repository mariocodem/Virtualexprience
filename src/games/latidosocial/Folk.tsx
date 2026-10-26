import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group, Mesh, MeshStandardMaterial } from 'three';
import { ATLAS, BUILD } from '@/world/palette';

export interface FolkPose {
  x: number;
  z: number;
  /** Rotación sobre Y: hacia dónde miran. */
  yaw: number;
  /** 0 (erguidos) a 1 (encorvados de cansancio). */
  bent: number;
  /** Faroles de energía encendidos. */
  lit: number;
  /** 0 a 1: cuánto trabajan (se balancean). */
  busy: number;
}

const PEOPLE = [
  { x: -0.42, z: 0.12, h: 1 },
  { x: 0.42, z: 0.12, h: 0.92 },
  { x: 0, z: -0.34, h: 1.06 },
];
const SKIN = ['#d9a77c', '#b9804f', '#e6b995'];

/**
 * Un grupo de la comunidad: tres figuras low-poly del color del grupo, con los
 * faroles de energía flotando sobre sus cabezas. Encorvados cuando se agotan.
 * Lee su pose en cada cuadro con `get` (sin re-renderizar React).
 */
export function Folk({
  color,
  lamps,
  get,
  still = false,
  onPick,
}: {
  color: string;
  /** Faroles de energía en total. */
  lamps: number;
  get: () => FolkPose;
  still?: boolean;
  onPick?: () => void;
}) {
  const root = useRef<Group>(null);
  const bodies = useRef<(Group | null)[]>([]);
  const lampRefs = useRef<(Mesh | null)[]>([]);

  useFrame(({ clock }) => {
    const pose = get();
    const node = root.current;
    if (!node) return;
    node.position.set(pose.x, 0, pose.z);
    node.rotation.y = pose.yaw;
    const t = still ? 0 : clock.elapsedTime;
    bodies.current.forEach((body, i) => {
      if (!body) return;
      const person = PEOPLE[i];
      const sway = Math.sin(t * 7 + i * 2) * 0.07 * pose.busy;
      body.rotation.x = pose.bent * 0.75 + sway;
      body.position.y = -pose.bent * 0.1 + Math.abs(sway) * 0.4;
      body.scale.setScalar(person?.h ?? 1);
    });
    lampRefs.current.forEach((lamp, i) => {
      if (!lamp) return;
      const on = i < Math.ceil(pose.lit - 1e-6);
      const material = lamp.material as MeshStandardMaterial;
      material.emissiveIntensity = on ? 1.3 : 0.05;
      material.color.set(on ? ATLAS.sun : BUILD.stoneDark);
      material.emissive.set(on ? ATLAS.sun : '#000000');
      lamp.position.y = 1.78 - pose.bent * 0.45 + (still ? 0 : Math.sin(t * 2 + i) * 0.03);
    });
  });

  const spread = Math.min(0.28, 0.9 / Math.max(1, lamps));
  return (
    <group ref={root}>
      {PEOPLE.map((p, i) => (
        <group key={i} position={[p.x, 0, p.z]}>
          <group
            ref={(g) => {
              bodies.current[i] = g;
            }}
          >
            <mesh position-y={0.42} castShadow onClick={onPick}>
              <cylinderGeometry args={[0.15, 0.24, 0.62, 7]} />
              <meshStandardMaterial color={color} flatShading />
            </mesh>
            <mesh position-y={0.92} castShadow onClick={onPick}>
              <icosahedronGeometry args={[0.16, 1]} />
              <meshStandardMaterial color={SKIN[i]} flatShading />
            </mesh>
            <mesh position-y={1.06}>
              <cylinderGeometry args={[0.1, 0.19, 0.1, 7]} />
              <meshStandardMaterial color={ATLAS.ink} flatShading />
            </mesh>
          </group>
        </group>
      ))}
      <group position-x={(-(lamps - 1) * spread) / 2}>
        {Array.from({ length: lamps }, (_, i) => (
          <mesh
            key={i}
            ref={(m) => {
              lampRefs.current[i] = m;
            }}
            position-x={i * spread}
            position-y={1.78}
          >
            <icosahedronGeometry args={[0.1, 1]} />
            <meshStandardMaterial color={ATLAS.sun} emissive={ATLAS.sun} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
