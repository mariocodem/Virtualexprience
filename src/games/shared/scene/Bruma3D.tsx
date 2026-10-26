import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { Color, Object3D, type Group, type InstancedMesh, type MeshStandardMaterial } from 'three';
import { ATLAS } from '@/world/palette';

export interface BrumaPose {
  x: number;
  z: number;
  /** De 1 (intacta) a 0 (disipada). */
  density: number;
  /** Aturdida tras un golpe de luz: destella. */
  stagger: number;
  /** Altura a la que flota. */
  y?: number;
}

const WISPS = 34;

/** Distribución determinista de los jirones: la Bruma tiene siempre la misma silueta. */
const LAYOUT = Array.from({ length: WISPS }, (_, i) => {
  const r = (n: number) => {
    const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  return {
    angle: r(1) * Math.PI * 2,
    lift: (r(2) - 0.5) * 1.3,
    orbit: 0.35 + r(3) * 0.95,
    size: 0.45 + r(4) * 0.55,
    speed: 0.2 + r(5) * 0.45,
    phase: r(6) * Math.PI * 2,
  };
});

/**
 * La Bruma en 3D: un cúmulo de jirones translúcidos que giran despacio, con
 * ojos que brillan con la luz robada al Faro. Se encoge con cada golpe de luz,
 * destella al recibirlo y toma el tinte de su isla.
 */
export function Bruma3D({
  get,
  tint,
  eyes = 2,
  look,
  still = false,
  scale = 1,
}: {
  get: () => BrumaPose;
  /** Color de los jirones. */
  tint: string;
  eyes?: number;
  /** Punto al que miran los ojos (el explorador). */
  look?: () => { x: number; z: number };
  still?: boolean;
  scale?: number;
}) {
  const root = useRef<Group>(null);
  const cloud = useRef<InstancedMesh>(null);
  const face = useRef<Group>(null);
  const material = useRef<MeshStandardMaterial>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const base = useMemo(() => new Color(tint), [tint]);
  const flashColor = useMemo(() => new Color('#fff6c9'), []);
  const shown = useRef(1);

  useLayoutEffect(() => {
    if (cloud.current) cloud.current.count = WISPS;
  }, []);

  useFrame(({ clock }, dt) => {
    const pose = get();
    const node = root.current;
    const mesh = cloud.current;
    if (!node || !mesh) return;
    shown.current += (pose.density - shown.current) * Math.min(1, dt * 4);
    const d = shown.current;
    const t = still ? 0 : clock.elapsedTime;
    const size = (0.45 + 0.75 * d) * scale;
    node.position.set(pose.x, (pose.y ?? 1.7) + (still ? 0 : Math.sin(t * 1.1) * 0.15), pose.z);
    node.scale.setScalar(size);
    LAYOUT.forEach((w, i) => {
      const a = w.angle + t * w.speed;
      const wobble = still ? 0 : Math.sin(t * 1.4 + w.phase) * 0.12;
      dummy.position.set(
        Math.cos(a) * (w.orbit + wobble),
        w.lift * 0.8,
        Math.sin(a) * (w.orbit + wobble) * 0.9,
      );
      dummy.scale.setScalar(w.size * (0.75 + 0.35 * d));
      dummy.rotation.set(a, a * 0.7, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (material.current) {
      const flash = Math.min(1, pose.stagger * 1.6);
      material.current.emissive.copy(base).lerp(flashColor, flash);
      material.current.emissiveIntensity = 0.18 + flash * 1.4;
      material.current.opacity = 0.3 + 0.3 * d;
    }
    if (face.current && look) {
      const target = look();
      face.current.rotation.y = Math.atan2(target.x - pose.x, target.z - pose.z);
    }
  });

  const eyeSpots = Array.from({ length: eyes }, (_, k) => {
    const u = eyes === 1 ? 0 : k / (eyes - 1) - 0.5;
    return { x: u * (eyes === 2 ? 0.7 : 0.3 * (eyes - 1)), y: 0.15 - (eyes > 2 ? u * u * 0.5 : 0) };
  });

  return (
    <group ref={root}>
      <instancedMesh ref={cloud} args={[undefined, undefined, WISPS]} castShadow>
        <icosahedronGeometry args={[0.55, 0]} />
        <meshStandardMaterial
          ref={material}
          color={tint}
          emissive={tint}
          transparent
          opacity={0.55}
          depthWrite={false}
          flatShading
          roughness={1}
        />
      </instancedMesh>
      <group ref={face}>
        {eyeSpots.map((e, i) => (
          <mesh key={i} position={[e.x, e.y, 0.95]}>
            <icosahedronGeometry args={[eyes > 2 ? 0.1 : 0.14, 1]} />
            <meshBasicMaterial color="#fff3b0" />
          </mesh>
        ))}
      </group>
      <pointLight
        color={ATLAS.sun}
        intensity={1.2}
        distance={5}
        decay={1.8}
        position={[0, 0.2, 1]}
      />
    </group>
  );
}
