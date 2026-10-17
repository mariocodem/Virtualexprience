import { useEffect, useRef, useState } from 'react';
import { world } from '@/data';
import type { StationStatus } from '@/progress/types';
import type { Island, IslandId, Station } from '@/types/domain';
import { cx } from '@/ui/cx';
import { StationSymbol } from '@/ui/StationSymbol';
import { ArchipelagoPlate2D } from './ArchipelagoPlate2D';
import { LIGHTHOUSE_ISLAND, plateBounds, projectToPlate } from './geography';
import type { StationSpot } from './layout';

/**
 * Carta 2D del mundo, equivalente al relieve 3D: la misma geografía, las mismas
 * paradas en las mismas posiciones. Los marcadores se pueden pulsar; el teclado
 * y el lector de pantalla usan la lista de la cartela.
 */
export function MapFallback2D({
  island,
  stations,
  spots,
  statuses,
  litIslands,
  highlight,
  selectedStation,
  onSelectPlace,
  onSelectStation,
  onHover,
}: {
  island: Island | undefined;
  stations: Station[];
  spots: StationSpot[];
  statuses: Record<string, StationStatus>;
  litIslands: readonly IslandId[];
  highlight: string | null;
  selectedStation: string | null;
  onSelectPlace: (id: IslandId | 'faro') => void;
  onSelectStation: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const node = box.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, []);

  const focus = island
    ? { x: island.position.x, z: island.position.z, span: island.radius * 3.4 }
    : undefined;
  const bounds = plateBounds(world.islands, focus);
  const at = (x: number, z: number) => projectToPlate({ x, z }, bounds, size.width, size.height);

  // Sendero en la carta 2D: el tramo recorrido en rojo, igual que en el relieve.
  const completedCount = stations.filter((st) => statuses[st.id] === 'completada').length;

  const places = island
    ? []
    : [
        ...world.islands.map((i) => ({
          id: i.id,
          name: i.name,
          ...i.position,
        })),
        { id: 'faro' as const, name: 'Faro Minuto', ...LIGHTHOUSE_ISLAND.position },
      ];

  return (
    <div ref={box} aria-hidden="true" className="absolute inset-0">
      <ArchipelagoPlate2D
        fit="contain"
        focus={focus}
        litIslands={litIslands}
        activeIsland={island?.id ?? null}
        className="absolute inset-0 size-full"
      />
      {size.width > 0 &&
        places.map((place) => {
          const p = at(place.x, place.z);
          const on = highlight === place.id;
          return (
            <button
              key={place.id}
              type="button"
              tabIndex={-1}
              onClick={() => {
                onSelectPlace(place.id);
              }}
              onPointerEnter={() => {
                onHover(place.id);
              }}
              onPointerLeave={() => {
                onHover(null);
              }}
              className={cx(
                'absolute -translate-x-1/2 -translate-y-1/2 placename text-[0.8125rem] whitespace-nowrap halo',
                on ? 'text-route' : 'text-ink',
              )}
              style={{ left: p.left, top: p.top }}
            >
              {place.name}
            </button>
          );
        })}
      {size.width > 0 && spots.length > 1 && (
        <svg className="pointer-events-none absolute inset-0 size-full" aria-hidden="true">
          <polyline
            points={spots
              .map((spot) => {
                const p = at(spot.position[0], spot.position[2]);
                return `${p.left.toFixed(1)},${p.top.toFixed(1)}`;
              })
              .join(' ')}
            fill="none"
            stroke="var(--plate)"
            strokeWidth={2}
            strokeDasharray="6 5"
          />
          {completedCount > 0 && (
            <polyline
              points={spots
                .slice(0, completedCount + 1)
                .map((spot) => {
                  const p = at(spot.position[0], spot.position[2]);
                  return `${p.left.toFixed(1)},${p.top.toFixed(1)}`;
                })
                .join(' ')}
              fill="none"
              stroke="var(--route)"
              strokeWidth={3}
            />
          )}
        </svg>
      )}
      {size.width > 0 &&
        spots.map((spot) => {
          const station = stations.find((s) => s.id === spot.stationId);
          if (!station) return null;
          const p = at(spot.position[0], spot.position[2]);
          const on = highlight === station.id || selectedStation === station.id;
          return (
            <button
              key={station.id}
              type="button"
              tabIndex={-1}
              onClick={() => {
                onSelectStation(station.id);
              }}
              onPointerEnter={() => {
                onHover(station.id);
              }}
              onPointerLeave={() => {
                onHover(null);
              }}
              className={cx(
                'absolute inline-flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 border-[1.5px] bg-plate px-2 py-1 font-display text-xs font-bold whitespace-nowrap',
                on ? 'border-route text-route' : 'border-ink text-ink',
              )}
              style={{ left: p.left, top: p.top }}
            >
              <StationSymbol status={statuses[station.id] ?? 'bloqueada'} size={14} />
              <span className="tabular-nums">{stations.indexOf(station) + 1}</span>
              {on && <span>· {station.title}</span>}
            </button>
          );
        })}
    </div>
  );
}
