import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { Plane, Raycaster, Vector2, Vector3 } from 'three';
import { ATLAS } from '@/world/palette';
import type { Vec2 } from '../arena/core';
import type { Controls } from '../controls';

/**
 * Escenografía común de los juegos 3D: luz de amanecer, niebla, plataforma,
 * cámara de arena y puntería con el ratón.
 */

/** Luz cálida y baja con sombras, cielo del mar y niebla teñida por la isla. */
export function ArenaLights({
  fog = ATLAS.sea[5],
  near = 22,
  far = 60,
}: {
  fog?: string;
  near?: number;
  far?: number;
}) {
  return (
    <>
      <color attach="background" args={[ATLAS.sea[5]]} />
      <fog attach="fog" args={[fog, near, far]} />
      <hemisphereLight args={['#e4f0fa', '#21508a', 1.05]} />
      <directionalLight
        position={[-9, 16, 8]}
        color={ATLAS.dawn}
        intensity={2.4}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-bias={-0.0005}
      />
      <ambientLight intensity={0.2} />
    </>
  );
}

/** Plataforma circular de la arena, con su borde del color de la isla. */
export function ArenaPlatform({
  radius,
  ground = ATLAS.land[0],
  rim,
  sides = 28,
}: {
  radius: number;
  ground?: string;
  /** Color del borde: el acento de la isla. */
  rim: string;
  sides?: number;
}) {
  return (
    <group>
      <mesh position-y={-0.3} receiveShadow>
        <cylinderGeometry args={[radius, radius * 1.04, 0.6, sides]} />
        <meshStandardMaterial color={ground} flatShading roughness={0.95} />
      </mesh>
      <mesh position-y={-1.3}>
        <cylinderGeometry args={[radius * 1.04, radius * 0.7, 1.4, sides]} />
        <meshStandardMaterial color={ATLAS.land[3]} flatShading roughness={1} />
      </mesh>
      <mesh position-y={0.02} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[radius - 0.18, radius, sides]} />
        <meshStandardMaterial color={rim} flatShading />
      </mesh>
      {/* Mar alrededor */}
      <mesh position-y={-0.9} rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[radius * 6, 48]} />
        <meshStandardMaterial color={ATLAS.sea[3]} roughness={0.6} />
      </mesh>
    </group>
  );
}

/**
 * Cámara alta de arena que mira el centro y sigue un poco al explorador.
 * Con movimiento reducido queda fija.
 */
export function ArenaCamera({
  follow,
  still,
  height = 13,
  distance = 12.5,
  lead = 0.28,
}: {
  follow: () => Vec2;
  still: boolean;
  height?: number;
  distance?: number;
  /** Cuánto se corre el encuadre hacia el explorador (0 = fijo). */
  lead?: number;
}) {
  const look = useMemo(() => new Vector3(), []);
  useFrame(({ camera }, dt) => {
    const p = follow();
    const k = still ? 0 : lead;
    const tx = p.x * k;
    const tz = p.z * k;
    const s = Math.min(1, dt * 3);
    camera.position.x += (tx - camera.position.x) * s;
    camera.position.y += (height - camera.position.y) * s;
    camera.position.z += (tz + distance - camera.position.z) * s;
    look.set(tx, 0, tz + 0.5);
    camera.lookAt(look);
  });
  return null;
}

/** Lleva el punto del suelo bajo el puntero a `controls.aim`, y el clic a disparar. */
export function PointerAim({ controls, y = 0 }: { controls: Controls; y?: number }) {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const tools = useMemo(
    () => ({
      ray: new Raycaster(),
      plane: new Plane(new Vector3(0, 1, 0), -y),
      ndc: new Vector2(),
      hit: new Vector3(),
    }),
    [y],
  );
  useEffect(() => {
    const el = gl.domElement;
    const update = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      const rect = el.getBoundingClientRect();
      tools.ndc.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      tools.ray.setFromCamera(tools.ndc, camera);
      if (tools.ray.ray.intersectPlane(tools.plane, tools.hit)) {
        controls.aim = { x: tools.hit.x, z: tools.hit.z };
      }
    };
    const leave = () => {
      controls.aim = null;
    };
    const click = (event: PointerEvent) => {
      if (event.pointerType !== 'touch' && event.button === 0) controls.press('fire');
    };
    el.addEventListener('pointermove', update);
    el.addEventListener('pointerleave', leave);
    el.addEventListener('pointerdown', click);
    return () => {
      el.removeEventListener('pointermove', update);
      el.removeEventListener('pointerleave', leave);
      el.removeEventListener('pointerdown', click);
    };
  }, [gl, camera, controls, tools]);
  return null;
}
