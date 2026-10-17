import { PerspectiveCamera, View } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { PerspectiveCamera as Camera } from 'three';
import type { IslandId } from '@/types/domain';
import { ArchipelagoScene } from '@/world/scene/ArchipelagoScene';
import { tidePhase } from '@/world/scene/tide';

const DEG = Math.PI / 180;

/** Retrato del Faro Minuto para el cierre: cámara baja que gira despacio con la marea. */
function FaroCamera({ still }: { still: boolean }) {
  const ref = useRef<Camera>(null);
  useFrame(({ clock }) => {
    const camera = ref.current;
    if (!camera) return;
    const azimuth = (38 + (still ? 0 : tidePhase(clock.elapsedTime) * 9)) * DEG;
    const radius = 15;
    camera.position.set(Math.sin(azimuth) * radius, 6.5, Math.cos(azimuth) * radius);
    camera.lookAt(0, 2.1, 0);
  });
  return <PerspectiveCamera ref={ref} makeDefault fov={30} near={0.5} far={300} />;
}

export default function FaroView({
  litIslands,
  still,
}: {
  litIslands: readonly IslandId[];
  still: boolean;
}) {
  return (
    <View className="absolute inset-0">
      <FaroCamera still={still} />
      <ArchipelagoScene litIslands={litIslands} still={still} />
    </View>
  );
}
