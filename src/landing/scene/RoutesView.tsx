import { PerspectiveCamera, View } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { gsap } from 'gsap';
import { useEffect, useRef, type RefObject } from 'react';
import type { PerspectiveCamera as Camera } from 'three';
import { getIsland } from '@/data';
import type { IslandId } from '@/types/domain';
import { ArchipelagoScene } from '@/world/scene/ArchipelagoScene';
import { LabelProjector } from '@/world/scene/LabelProjector';
import { useLanding } from '../landingStore';
import { MAP_ANCHORS } from './anchors';

const DEG = Math.PI / 180;

interface Pose {
  x: number;
  z: number;
  radius: number;
  elevation: number;
  azimuth: number;
}

const OVERVIEW: Pose = { x: 0, z: 0, radius: 66, elevation: 50, azimuth: -14 };

function poseFor(id: IslandId | null): Pose {
  if (!id) return OVERVIEW;
  const { position, radius } = getIsland(id);
  // La cámara llega desde mar abierto mirando hacia el faro: la isla al frente, la luz detrás.
  const azimuth = Math.atan2(position.x, position.z) / DEG;
  return { x: position.x, z: position.z, radius: 18 + radius * 2.2, elevation: 36, azimuth };
}

/** Vuela entre islas en 1,2 s con `power3.inOut`, como en el mundo. */
function RoutesCamera({ still }: { still: boolean }) {
  const ref = useRef<Camera>(null);
  const active = useLanding((s) => s.activeIsland);
  const pose = useRef<Pose>({ ...OVERVIEW });
  const size = useThree((s) => s.size);

  useEffect(() => {
    const target = poseFor(active);
    const current = pose.current;
    // El acimut toma el camino corto alrededor del archipiélago.
    const delta = ((target.azimuth - current.azimuth + 540) % 360) - 180;
    const tween = gsap.to(current, {
      ...target,
      azimuth: current.azimuth + delta,
      duration: still ? 0 : 1.2,
      ease: 'power3.inOut',
    });
    return () => {
      tween.kill();
    };
  }, [active, still]);

  useFrame(() => {
    const camera = ref.current;
    if (!camera) return;
    const { x, z, radius, elevation, azimuth } = pose.current;
    const wide = size.width / size.height > 1.1;
    camera.fov = wide ? 32 : 42;
    camera.filmOffset = wide ? -8.5 : 0;
    camera.position.set(
      x + Math.sin(azimuth * DEG) * Math.cos(elevation * DEG) * radius,
      Math.sin(elevation * DEG) * radius,
      z + Math.cos(azimuth * DEG) * Math.cos(elevation * DEG) * radius,
    );
    // En vertical la ficha ocupa la mitad inferior: se mira un punto más cercano para subir la isla.
    const lead = wide ? 0 : radius * 0.24;
    camera.lookAt(x + Math.sin(azimuth * DEG) * lead, 0, z + Math.cos(azimuth * DEG) * lead);
    camera.updateProjectionMatrix();
  });

  return <PerspectiveCamera ref={ref} makeDefault near={1} far={400} />;
}

export interface RoutesViewProps {
  container: RefObject<HTMLElement | null>;
  labels: RefObject<Map<string, HTMLElement>>;
  litIslands: readonly IslandId[];
  still: boolean;
}

export default function RoutesView({ container, labels, litIslands, still }: RoutesViewProps) {
  const active = useLanding((s) => s.activeIsland);
  return (
    <View className="absolute inset-0">
      <RoutesCamera still={still} />
      <ArchipelagoScene litIslands={litIslands} activeIsland={active} still={still} />
      <LabelProjector anchors={MAP_ANCHORS} container={container} labels={labels} />
    </View>
  );
}
