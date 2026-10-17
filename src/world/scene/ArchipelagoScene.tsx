import { Line } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { world } from '@/data';
import type { IslandId } from '@/types/domain';
import { bandsForIsland, bandsForLighthouse } from '../geography';
import { ATLAS } from '../palette';
import { IslandRelief } from './IslandRelief';
import { Lighthouse } from './Lighthouse';
import { Ocean } from './Ocean';

export interface ArchipelagoSceneProps {
  litIslands: readonly IslandId[];
  activeIsland?: IslandId | null;
  /** Sin animaciones ambientales (movimiento reducido). */
  still?: boolean;
  /** Las rutas punteadas avanzan sobre el agua, hacia cada isla. */
  animateRoutes?: boolean;
  /** Eventos para el mundo navegable; la escena no decide nada, solo avisa. */
  onSelect?: (id: IslandId | 'faro') => void;
  onHover?: (id: IslandId | 'faro' | null) => void;
}

interface DashMaterial {
  dashOffset: number;
}

/** El archipiélago al amanecer: luz cálida y baja, bruma y relieve en terrazas. */
export function ArchipelagoScene({
  litIslands,
  activeIsland = null,
  still = false,
  animateRoutes = false,
  onSelect,
  onHover,
}: ArchipelagoSceneProps) {
  const islands = useMemo(
    () => world.islands.map((island) => ({ island, bands: bandsForIsland(island) })),
    [],
  );
  const lighthouseBands = useMemo(() => bandsForLighthouse(), []);
  const routes = useRef<({ material: DashMaterial } | null)[]>([]);

  useFrame((_, delta) => {
    if (!animateRoutes || still) return;
    for (const line of routes.current) {
      if (line) line.material.dashOffset -= delta * 0.5;
    }
  });

  const interactive = (id: IslandId | 'faro') =>
    onSelect
      ? {
          onClick: (event: ThreeEvent<MouseEvent>) => {
            event.stopPropagation();
            onSelect(id);
          },
          onPointerOver: (event: ThreeEvent<PointerEvent>) => {
            event.stopPropagation();
            document.body.style.cursor = 'pointer';
            onHover?.(id);
          },
          onPointerOut: () => {
            document.body.style.cursor = '';
            onHover?.(null);
          },
        }
      : {};

  return (
    <>
      <color attach="background" args={[ATLAS.sea[5]]} />
      <fog attach="fog" args={[ATLAS.haze, 110, 260]} />
      <hemisphereLight args={['#e4f0fa', '#21508a', 1.1]} />
      <directionalLight
        position={[-22, 16, 12]}
        color={ATLAS.dawn}
        intensity={2.6}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={24}
        shadow-camera-bottom={-24}
        shadow-bias={-0.0004}
      />
      <ambientLight intensity={0.18} />

      <Ocean />

      {world.islands.map((island, i) => {
        const { x, z } = island.position;
        const active = island.id === activeIsland;
        return (
          <Line
            key={island.id}
            ref={(line) => {
              routes.current[i] = line;
            }}
            points={[
              [0, 0.05, 0],
              [x * 0.5 + z * 0.12, 0.05, z * 0.5 - x * 0.12],
              [x * 0.78, 0.05, z * 0.78],
            ]}
            color={active ? ATLAS.route : ATLAS.plate}
            transparent
            opacity={active ? 1 : 0.5}
            lineWidth={active ? 3 : 1.6}
            dashed
            dashSize={0.5}
            gapSize={0.42}
          />
        );
      })}

      {islands.map(({ island, bands }) => (
        <group key={island.id} {...interactive(island.id)}>
          <IslandRelief id={island.id} bands={bands} lit={litIslands.includes(island.id) ? 1 : 0} />
        </group>
      ))}
      <group {...interactive('faro')}>
        <IslandRelief id="faro" bands={lighthouseBands} lit={1} />
        <Lighthouse lit={litIslands.length / world.islands.length} still={still} />
      </group>
    </>
  );
}
