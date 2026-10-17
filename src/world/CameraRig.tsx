import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { gsap } from 'gsap';
import { useEffect, useRef, type ComponentRef } from 'react';
import { PerspectiveCamera, Vector3 } from 'three';
import type { Island } from '@/types/domain';

const DEG = Math.PI / 180;

interface Pose {
  position: Vector3;
  target: Vector3;
  minDistance: number;
  maxDistance: number;
}

function overviewPose(): Pose {
  const radius = 64;
  const elevation = 52 * DEG;
  const azimuth = -14 * DEG;
  return {
    position: new Vector3(
      Math.sin(azimuth) * Math.cos(elevation) * radius,
      Math.sin(elevation) * radius,
      Math.cos(azimuth) * Math.cos(elevation) * radius,
    ),
    target: new Vector3(0, 0, 0),
    minDistance: 34,
    maxDistance: 96,
  };
}

/** Pose de isla: desde mar abierto, mirando hacia el faro, con la isla al frente. */
function islandPose(island: Island): Pose {
  const { x, z } = island.position;
  const azimuth = Math.atan2(x, z);
  const radius = 8 + island.radius * 1.7;
  const elevation = 56 * DEG;
  return {
    position: new Vector3(
      x + Math.sin(azimuth) * Math.cos(elevation) * radius,
      Math.sin(elevation) * radius,
      z + Math.cos(azimuth) * Math.cos(elevation) * radius,
    ),
    target: new Vector3(x, 1.2, z),
    minDistance: 7,
    maxDistance: 34,
  };
}

/**
 * Cámara del mundo. Vuela entre la carta y cada isla con GSAP (1,2 s,
 * `power3.inOut`); entre vuelos se puede orbitar y acercar dentro de límites.
 * Con movimiento reducido llega sin animar.
 */
export function CameraRig({
  island,
  reduced,
  panelOffset,
}: {
  island: Island | undefined;
  reduced: boolean;
  /** Desplaza el encuadre a la derecha cuando una cartela ocupa la izquierda. */
  panelOffset: boolean;
}) {
  const camera = useThree((s) => s.camera);
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const first = useRef(true);

  useEffect(() => {
    const ctrl = controls.current;
    if (!ctrl) return;
    const pose = island ? islandPose(island) : overviewPose();
    const from = { p: camera.position.clone(), t: ctrl.target.clone() };
    const state = { k: 0 };
    ctrl.enabled = false;
    ctrl.minDistance = 0;
    ctrl.maxDistance = Infinity;

    const settle = () => {
      camera.position.copy(pose.position);
      ctrl.target.copy(pose.target);
      ctrl.minDistance = pose.minDistance;
      ctrl.maxDistance = pose.maxDistance;
      ctrl.enabled = true;
      ctrl.update();
    };

    if (reduced || first.current) {
      first.current = false;
      settle();
      return;
    }

    const tween = gsap.to(state, {
      k: 1,
      duration: 1.2,
      ease: 'power3.inOut',
      onUpdate: () => {
        camera.position.lerpVectors(from.p, pose.position, state.k);
        ctrl.target.lerpVectors(from.t, pose.target, state.k);
        ctrl.update();
      },
      onComplete: settle,
    });
    return () => {
      tween.kill();
    };
  }, [island, reduced, camera]);

  // El encuadre se corre a la derecha cuando la cartela ocupa la izquierda (escritorio).
  useFrame((frame) => {
    const view = frame.camera;
    if (!(view instanceof PerspectiveCamera)) return;
    const offset = panelOffset ? -6 : 0;
    if (view.filmOffset !== offset) {
      view.filmOffset = offset;
      view.updateProjectionMatrix();
    }
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      minPolarAngle={0.2}
      maxPolarAngle={1.25}
    />
  );
}
