import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group, Mesh } from 'three';
import { ATLAS, BUILD } from '@/world/palette';

export interface ExplorerPose {
  x: number;
  z: number;
  /** Hacia dónde mira, en radianes sobre el plano XZ (0 = +X). */
  facing: number;
  moving: boolean;
  /** Parpadea mientras sea > 0 (recién golpeado). */
  hurt?: number;
  /** Altura del suelo bajo sus pies. */
  y?: number;
}

const SKIN = '#d9a77c';

/**
 * El explorador o la exploradora: impermeable rojo de ruta, mochila, sombrero
 * y la linterna que se carga con cada decisión acertada. Lee su pose en cada
 * cuadro con `get`, sin volver a renderizar React.
 */
export function Explorer({
  get,
  glow = 0.4,
  still = false,
}: {
  get: () => ExplorerPose;
  /** Brillo de la linterna (0 a 1): crece con la carga. */
  glow?: number | (() => number);
  still?: boolean;
}) {
  const root = useRef<Group>(null);
  const body = useRef<Group>(null);
  const legL = useRef<Mesh>(null);
  const legR = useRef<Mesh>(null);
  const lantern = useRef<Mesh>(null);
  const walk = useRef(0);

  useFrame(({ clock }, dt) => {
    const pose = get();
    const node = root.current;
    if (!node) return;
    node.position.set(pose.x, pose.y ?? 0, pose.z);
    // El frente local (+Z) mira hacia `facing`.
    const target = Math.PI / 2 - pose.facing;
    const delta = Math.atan2(
      Math.sin(target - node.rotation.y),
      Math.cos(target - node.rotation.y),
    );
    node.rotation.y += delta * Math.min(1, dt * 14);
    walk.current += pose.moving && !still ? dt * 11 : 0;
    const swing = pose.moving && !still ? Math.sin(walk.current) * 0.5 : 0;
    if (legL.current) legL.current.rotation.x = swing;
    if (legR.current) legR.current.rotation.x = -swing;
    if (body.current)
      body.current.position.y = pose.moving && !still ? Math.abs(Math.sin(walk.current)) * 0.05 : 0;
    node.visible = !(pose.hurt && pose.hurt > 0 && Math.floor(clock.elapsedTime * 14) % 2 === 0);
    const g = typeof glow === 'function' ? glow() : glow;
    const material = lantern.current?.material;
    if (material && 'emissiveIntensity' in material) material.emissiveIntensity = 0.6 + g * 2.2;
  });

  return (
    <group ref={root}>
      <mesh position-y={0.01} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.42, 16]} />
        <meshBasicMaterial color={ATLAS.ink} transparent opacity={0.28} depthWrite={false} />
      </mesh>
      <mesh ref={legL} position={[-0.1, 0.42, 0]} castShadow>
        <boxGeometry args={[0.13, 0.42, 0.14]} />
        <meshStandardMaterial color={ATLAS.ink} flatShading />
      </mesh>
      <mesh ref={legR} position={[0.1, 0.42, 0]} castShadow>
        <boxGeometry args={[0.13, 0.42, 0.14]} />
        <meshStandardMaterial color={ATLAS.ink} flatShading />
      </mesh>
      <group ref={body}>
        <mesh position-y={0.82} castShadow>
          <cylinderGeometry args={[0.19, 0.25, 0.52, 8]} />
          <meshStandardMaterial color={ATLAS.route} flatShading />
        </mesh>
        <mesh position={[0, 0.85, -0.2]} castShadow>
          <boxGeometry args={[0.3, 0.34, 0.14]} />
          <meshStandardMaterial color={BUILD.leaf[1]} flatShading />
        </mesh>
        <mesh position-y={1.22} castShadow>
          <icosahedronGeometry args={[0.17, 1]} />
          <meshStandardMaterial color={SKIN} flatShading />
        </mesh>
        <mesh position-y={1.34}>
          <cylinderGeometry args={[0.3, 0.3, 0.03, 12]} />
          <meshStandardMaterial color={BUILD.thatch} flatShading />
        </mesh>
        <mesh position-y={1.43}>
          <cylinderGeometry args={[0.13, 0.17, 0.17, 10]} />
          <meshStandardMaterial color={BUILD.thatch} flatShading />
        </mesh>
        {/* Brazo y linterna */}
        <mesh position={[0.27, 0.78, 0.12]} rotation-x={-0.6}>
          <boxGeometry args={[0.08, 0.34, 0.08]} />
          <meshStandardMaterial color={ATLAS.route} flatShading />
        </mesh>
        <mesh position={[0.3, 0.64, 0.32]}>
          <boxGeometry args={[0.14, 0.16, 0.14]} />
          <meshStandardMaterial color={ATLAS.ink} flatShading wireframe />
        </mesh>
        <mesh ref={lantern} position={[0.3, 0.64, 0.32]}>
          <icosahedronGeometry args={[0.07, 1]} />
          <meshStandardMaterial color={ATLAS.sun} emissive={ATLAS.sun} emissiveIntensity={1} />
        </mesh>
        <pointLight
          position={[0.3, 0.7, 0.4]}
          color={ATLAS.sun}
          intensity={1.6}
          distance={4.5}
          decay={1.6}
        />
      </group>
    </group>
  );
}
