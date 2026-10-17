import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group, MeshStandardMaterial, PointLight } from 'three';
import { summitHeight } from '../geography';
import { ATLAS } from '../palette';

export interface LighthouseProps {
  /** Fracción encendida: fragmentos recuperados / 6. */
  lit: number;
  /** Sin animación: estado final estable. */
  still?: boolean;
}

/**
 * Faro Minuto. Apagado parpadea débilmente, como una mecha que no prende;
 * cada fragmento recuperado sube su luz y, con al menos uno, gira su haz.
 */
export function Lighthouse({ lit, still = false }: LighthouseProps) {
  const lantern = useRef<MeshStandardMaterial>(null);
  const light = useRef<PointLight>(null);
  const beam = useRef<Group>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const flicker = still ? 0.5 : 0.5 + 0.5 * Math.sin(t * 7.3) * Math.sin(t * 2.1 + 1.3);
    const glow = lit > 0 ? 0.6 + lit * 2.4 : 0.08 + flicker * 0.28;
    if (lantern.current) lantern.current.emissiveIntensity = glow;
    if (light.current) light.current.intensity = lit > 0 ? 4 + lit * 18 : flicker * 2.5;
    if (beam.current && !still) beam.current.rotation.y = t * 0.6;
  });

  return (
    <group position={[0, summitHeight(3) - 0.05, 0]}>
      <mesh position-y={0.8} castShadow>
        <cylinderGeometry args={[0.3, 0.42, 1.6, 8]} />
        <meshStandardMaterial color={ATLAS.plate} flatShading roughness={0.7} />
      </mesh>
      <mesh position-y={0.95}>
        <cylinderGeometry args={[0.36, 0.38, 0.28, 8]} />
        <meshStandardMaterial color={ATLAS.route} flatShading roughness={0.7} />
      </mesh>
      <mesh position-y={1.64}>
        <cylinderGeometry args={[0.46, 0.46, 0.08, 8]} />
        <meshStandardMaterial color={ATLAS.ink} flatShading />
      </mesh>
      <mesh position-y={1.88}>
        <cylinderGeometry args={[0.24, 0.24, 0.42, 8]} />
        <meshStandardMaterial
          ref={lantern}
          color={ATLAS.sun}
          emissive={ATLAS.sun}
          emissiveIntensity={0.1}
          flatShading
        />
      </mesh>
      <mesh position-y={2.26} castShadow>
        <coneGeometry args={[0.34, 0.4, 8]} />
        <meshStandardMaterial color={ATLAS.ink} flatShading />
      </mesh>
      <pointLight ref={light} position-y={1.9} color={ATLAS.sun} distance={14} decay={1.6} />
      {lit > 0 && (
        <group ref={beam} position-y={1.88}>
          <mesh rotation-z={Math.PI / 2} position-x={8}>
            <coneGeometry args={[2.2, 16, 16, 1, true]} />
            <meshBasicMaterial
              color={ATLAS.sun}
              transparent
              opacity={0.06 + lit * 0.1}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}
    </group>
  );
}
