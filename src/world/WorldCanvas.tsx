import { AdaptiveDpr, PerformanceMonitor } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useState, type RefObject } from 'react';
import type { StationStatus } from '@/progress/types';
import type { Island, IslandId } from '@/types/domain';
import { CameraRig } from './CameraRig';
import type { StationSpot } from './layout';
import { ArchipelagoScene } from './scene/ArchipelagoScene';
import { LabelProjector, type LabelAnchor } from './scene/LabelProjector';
import { StopMarker } from './scene/StopMarker';
import { Trail } from './scene/Trail';

export interface WorldCanvasProps {
  island: Island | undefined;
  spots: StationSpot[];
  statuses: Record<string, StationStatus>;
  completedInIsland: number;
  selectedStation: string | null;
  highlight: string | null;
  litIslands: readonly IslandId[];
  reduced: boolean;
  panelOffset: boolean;
  anchors: LabelAnchor[];
  container: RefObject<HTMLElement | null>;
  labels: RefObject<Map<string, HTMLElement>>;
  onSelectPlace: (id: IslandId | 'faro') => void;
  onSelectStation: (id: string) => void;
  onHover: (id: string | null) => void;
  onReady: () => void;
}

/**
 * El mundo en 3D. Solo pinta y avisa: la navegación y el progreso los decide
 * la página a partir de los eventos (CLAUDE.md §14).
 */
export default function WorldCanvas(props: WorldCanvasProps) {
  const [dpr, setDpr] = useState(1.5);
  const {
    island,
    spots,
    statuses,
    completedInIsland,
    selectedStation,
    highlight,
    litIslands,
    reduced,
    panelOffset,
    anchors,
    container,
    labels,
    onSelectPlace,
    onSelectStation,
    onHover,
    onReady,
  } = props;

  return (
    <Canvas
      shadows
      flat
      dpr={dpr}
      camera={{ fov: 34, near: 0.5, far: 400, position: [0, 50, 40] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={onReady}
      aria-hidden="true"
      className="!absolute inset-0"
    >
      <PerformanceMonitor
        onDecline={() => {
          setDpr(1);
        }}
        onIncline={() => {
          setDpr(1.5);
        }}
      />
      <AdaptiveDpr />
      <ArchipelagoScene
        litIslands={litIslands}
        activeIsland={island?.id ?? null}
        still={reduced}
        animateRoutes={!island}
        onSelect={onSelectPlace}
        onHover={onHover}
      />
      {island && <Trail spots={spots} completed={completedInIsland} />}
      {island &&
        spots.map((spot) => (
          <StopMarker
            key={spot.stationId}
            position={spot.position}
            status={statuses[spot.stationId] ?? 'bloqueada'}
            highlighted={highlight === spot.stationId}
            selected={selectedStation === spot.stationId}
            onSelect={() => {
              onSelectStation(spot.stationId);
            }}
            onHover={(over) => {
              onHover(over ? spot.stationId : null);
            }}
          />
        ))}
      <CameraRig island={island} reduced={reduced} panelOffset={panelOffset} />
      <LabelProjector anchors={anchors} container={container} labels={labels} />
    </Canvas>
  );
}
