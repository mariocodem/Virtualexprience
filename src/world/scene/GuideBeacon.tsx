import { Billboard } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { DoubleSide, Vector3, type Group, type Mesh, type MeshBasicMaterial } from 'three';
import { ATLAS } from '../palette';
import { TIDE_PERIOD } from './tide';

/** Ni el haz ni el anillo atrapan el puntero: las paradas y las islas siguen pulsables. */
const noRaycast = () => null;

/** Un pulso cada séptimo de marea (2 s); la brújula respira con la marea entera. */
const PULSE = TIDE_PERIOD / 7;

export interface GuideBeaconProps {
  /** Punto del suelo al que guía: la escala siguiente o el centro de una isla. */
  ground: readonly [number, number, number];
  /** Radio del anillo que late en el suelo. */
  ring: number;
  /** Altura de la brújula sobre el suelo; sin brújula (solo anillo) si no se da. */
  lift?: number;
  still: boolean;
}

/**
 * Brújula, la guía, en el mundo: flota sobre la escala que sigue con un haz de
 * luz y un anillo que late en el suelo. Cuando cambia el destino, vuela hasta
 * él (con movimiento reducido, aparece allí y queda quieta).
 */
export function GuideBeacon({ ground, ring, lift, still }: GuideBeaconProps) {
  const group = useRef<Group>(null);
  const compass = useRef<Group>(null);
  const needle = useRef<Group>(null);
  const pulse = useRef<Mesh>(null);
  const target = useRef(new Vector3());
  const placed = useRef(false);

  useFrame(({ clock }, dt) => {
    const node = group.current;
    if (!node) return;
    target.current.set(ground[0], ground[1], ground[2]);
    if (still || !placed.current) {
      node.position.copy(target.current);
      placed.current = true;
    } else {
      node.position.lerp(target.current, 1 - Math.exp(-dt * 3.5));
    }
    const t = clock.elapsedTime;
    if (compass.current && lift !== undefined) {
      compass.current.position.y =
        lift + (still ? 0 : Math.sin((t / (TIDE_PERIOD / 4)) * Math.PI * 2) * 0.08);
    }
    if (needle.current) needle.current.rotation.z = still ? 0 : Math.sin(t * 1.3) * 0.35;
    if (pulse.current) {
      const k = still ? 0.3 : (t % PULSE) / PULSE;
      pulse.current.scale.setScalar(1 + k * 0.5);
      (pulse.current.material as MeshBasicMaterial).opacity = 0.85 * (1 - k);
    }
  });

  return (
    <group ref={group}>
      {/* Anillo fijo y anillo que late en el suelo. */}
      <mesh position-y={0.06} rotation-x={-Math.PI / 2} raycast={noRaycast}>
        <ringGeometry args={[ring * 0.86, ring, 40]} />
        <meshBasicMaterial color={ATLAS.sun} transparent opacity={0.95} depthWrite={false} />
      </mesh>
      <mesh ref={pulse} position-y={0.07} rotation-x={-Math.PI / 2} raycast={noRaycast}>
        <ringGeometry args={[ring * 0.9, ring, 40]} />
        <meshBasicMaterial color={ATLAS.sun} transparent depthWrite={false} />
      </mesh>

      {lift !== undefined && (
        <>
          {/* Haz de luz de la brújula a la escala. */}
          <mesh position-y={lift / 2} raycast={noRaycast}>
            <coneGeometry args={[ring * 0.8, lift, 20, 1, true]} />
            <meshBasicMaterial
              color={ATLAS.sun}
              transparent
              opacity={0.16}
              depthWrite={false}
              side={DoubleSide}
            />
          </mesh>
          <group ref={compass} position-y={lift} scale={1.4}>
            <Billboard>
              <mesh raycast={noRaycast}>
                <torusGeometry args={[0.34, 0.05, 6, 28]} />
                <meshStandardMaterial
                  color={ATLAS.sun}
                  emissive={ATLAS.sun}
                  emissiveIntensity={0.45}
                  flatShading
                />
              </mesh>
              <mesh rotation-x={Math.PI / 2} raycast={noRaycast}>
                <cylinderGeometry args={[0.31, 0.31, 0.03, 28]} />
                <meshStandardMaterial color={ATLAS.plate} flatShading />
              </mesh>
              {/* Aguja: norte en rojo de ruta, sur en tinta. */}
              <group ref={needle} position-z={0.03}>
                <mesh position-y={0.12} raycast={noRaycast}>
                  <coneGeometry args={[0.07, 0.24, 4]} />
                  <meshStandardMaterial color={ATLAS.route} flatShading />
                </mesh>
                <mesh position-y={-0.12} rotation-z={Math.PI} raycast={noRaycast}>
                  <coneGeometry args={[0.07, 0.24, 4]} />
                  <meshStandardMaterial color={ATLAS.ink} flatShading />
                </mesh>
              </group>
              <mesh position-z={0.05} raycast={noRaycast}>
                <sphereGeometry args={[0.035, 8, 6]} />
                <meshStandardMaterial color={ATLAS.sun} flatShading />
              </mesh>
            </Billboard>
          </group>
        </>
      )}
    </group>
  );
}
