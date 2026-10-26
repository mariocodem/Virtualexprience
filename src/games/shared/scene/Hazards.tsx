import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  Object3D,
  Vector3,
  type InstancedMesh,
  type Mesh,
  type MeshBasicMaterial,
} from 'three';
import { ATLAS } from '@/world/palette';
import { ORB_RADIUS, type Beam, type Orb, type Zone } from '../arena/core';

const MAX_ORBS = 320;

/** Orbes de niebla que lanza la Bruma: una sola malla instanciada. */
export function FogOrbs({
  get,
  tint,
  y = 0.9,
}: {
  get: () => readonly Orb[];
  tint: string;
  y?: number;
}) {
  const mesh = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  useFrame(({ clock }) => {
    const node = mesh.current;
    if (!node) return;
    const orbs = get();
    const n = Math.min(MAX_ORBS, orbs.length);
    for (let i = 0; i < n; i++) {
      const orb = orbs[i];
      if (!orb) continue;
      dummy.position.set(orb.x, y + Math.sin(clock.elapsedTime * 4 + orb.id) * 0.06, orb.z);
      dummy.scale.setScalar(1);
      dummy.rotation.set(orb.id, clock.elapsedTime * 2, 0);
      dummy.updateMatrix();
      node.setMatrixAt(i, dummy.matrix);
    }
    node.count = n;
    node.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, MAX_ORBS]} frustumCulled={false}>
      <icosahedronGeometry args={[ORB_RADIUS, 0]} />
      <meshStandardMaterial color="#e3ebf1" emissive={tint} emissiveIntensity={0.8} flatShading />
    </instancedMesh>
  );
}

const MAX_ZONES = 16;

/**
 * Zonas de impacto: un anillo que parpadea en el suelo mientras avisa y un
 * disco lleno cuando golpea. Avisar antes de golpear es lo justo.
 */
export function DangerZones({ get }: { get: () => readonly Zone[] }) {
  const rings = useRef<(Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    const zones = get();
    rings.current.forEach((ring, i) => {
      if (!ring) return;
      const zone = zones[i];
      ring.visible = Boolean(zone);
      if (!zone) return;
      ring.position.set(zone.x, 0.04, zone.z);
      ring.scale.setScalar(zone.r);
      const material = ring.material as MeshBasicMaterial;
      material.opacity =
        zone.warn > 0 ? 0.25 + 0.3 * Math.abs(Math.sin(clock.elapsedTime * 10)) : 0.85;
    });
  });
  return (
    <group>
      {Array.from({ length: MAX_ZONES }, (_, i) => (
        <mesh
          key={i}
          ref={(m) => {
            rings.current[i] = m;
          }}
          rotation-x={-Math.PI / 2}
          visible={false}
        >
          <circleGeometry args={[1, 24]} />
          <meshBasicMaterial color={ATLAS.route} transparent depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

/** Haz de la linterna: un cilindro de luz entre el explorador y su blanco, que se desvanece. */
export function LightBeam({ get, y = 0.7 }: { get: () => Beam | null; y?: number }) {
  const mesh = useRef<Mesh>(null);
  const tmp = useMemo(() => ({ a: new Vector3(), b: new Vector3(), up: new Vector3(0, 1, 0) }), []);
  useFrame(() => {
    const node = mesh.current;
    const beam = get();
    if (!node) return;
    node.visible = Boolean(beam);
    if (!beam) return;
    tmp.a.set(beam.from.x, y, beam.from.z);
    tmp.b.set(beam.to.x, beam.hit ? 1.7 : y, beam.to.z);
    const length = tmp.a.distanceTo(tmp.b);
    node.position.copy(tmp.a).lerp(tmp.b, 0.5);
    node.scale.set(1, length, 1);
    node.quaternion.setFromUnitVectors(tmp.up, tmp.b.sub(tmp.a).normalize());
    (node.material as MeshBasicMaterial).opacity =
      Math.min(1, beam.life * 2.4) * (beam.hit ? 0.95 : 0.5);
  });
  return (
    <mesh ref={mesh} visible={false}>
      <cylinderGeometry args={[0.16, 0.08, 1, 8, 1, true]} />
      <meshBasicMaterial
        color={ATLAS.sun}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </mesh>
  );
}
