import { PerspectiveCamera, View } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useRef, type RefObject } from 'react';
import type { PerspectiveCamera as Camera } from 'three';
import type { IslandId } from '@/types/domain';
import { ArchipelagoScene } from '@/world/scene/ArchipelagoScene';
import { LabelProjector } from '@/world/scene/LabelProjector';
import { tidePhase } from '@/world/scene/tide';
import { useLanding } from '../landingStore';
import { MAP_ANCHORS } from './anchors';

const DEG = Math.PI / 180;

/**
 * Cámara del hero. Arranca en planta, como la plancha impresa, y se inclina
 * hasta el relieve; luego deriva con la marea. Movimiento reducido: estado final.
 */
function HeroCamera({ still }: { still: boolean }) {
  const ref = useRef<Camera>(null);
  const intro = useRef(still ? 1 : 0);
  const size = useThree((s) => s.size);
  const setSceneReady = useLanding((s) => s.setSceneReady);
  const signaled = useRef(false);

  useFrame(({ clock }, delta) => {
    const camera = ref.current;
    if (!camera) return;
    if (!signaled.current) {
      signaled.current = true;
      setSceneReady();
    }
    intro.current = still ? 1 : Math.min(1, intro.current + delta / 2.2);
    const eased = 1 - (1 - intro.current) ** 3;

    const wide = size.width / size.height > 1.1;
    const elevation = (89 - (89 - (wide ? 50 : 56)) * eased) * DEG;
    const azimuth = (-14 + (still ? 0 : tidePhase(clock.elapsedTime) * 5)) * DEG;
    const aspect = size.width / size.height;
    camera.fov = wide ? 32 : 40;
    const fit = 38 / (2 * Math.tan((camera.fov / 2) * DEG) * aspect);
    const radius = wide ? 66 : Math.min(130, Math.max(56, fit * 1.05));
    const target = { x: 0, z: 0 };

    camera.filmOffset = wide ? -7.5 : 0;
    camera.position.set(
      target.x + Math.sin(azimuth) * Math.cos(elevation) * radius,
      Math.sin(elevation) * radius,
      target.z + Math.cos(azimuth) * Math.cos(elevation) * radius,
    );
    camera.lookAt(target.x, 0, target.z);
    camera.updateProjectionMatrix();
  });

  return <PerspectiveCamera ref={ref} makeDefault near={1} far={400} />;
}

export interface HeroViewProps {
  container: RefObject<HTMLElement | null>;
  labels: RefObject<Map<string, HTMLElement>>;
  litIslands: readonly IslandId[];
  activeIsland: IslandId | null;
  still: boolean;
}

export default function HeroView({
  container,
  labels,
  litIslands,
  activeIsland,
  still,
}: HeroViewProps) {
  return (
    <View className="absolute inset-0">
      <HeroCamera still={still} />
      <ArchipelagoScene litIslands={litIslands} activeIsland={activeIsland} still={still} />
      <LabelProjector anchors={MAP_ANCHORS} container={container} labels={labels} />
    </View>
  );
}
