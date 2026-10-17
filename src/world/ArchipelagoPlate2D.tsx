import { memo, useMemo } from 'react';
import { world } from '@/data';
import type { Island, IslandId } from '@/types/domain';
import {
  BATHYMETRY,
  bandsForIsland,
  bandsForLighthouse,
  islandBands,
  islandSeed,
  LIGHTHOUSE_ISLAND,
  plateBounds,
  type Point,
} from './geography';
import { ATLAS } from './palette';

const toPath = (outline: readonly Point[]) =>
  `M${outline.map(([x, z]) => `${x.toFixed(2)},${z.toFixed(2)}`).join('L')}Z`;

export interface ArchipelagoPlate2DProps {
  /** Islas con su fragmento recuperado: pierden la bruma. */
  litIslands?: readonly IslandId[];
  /** Isla en curso: su ruta se dibuja en rojo. */
  activeIsland?: IslandId | null;
  className?: string;
  /** Cómo encaja el dibujo en su caja (como `object-fit`). */
  fit?: 'cover' | 'contain';
  /** Encuadra un punto del mundo con el lado dado (unidades del mundo), en vez de toda la carta. */
  focus?: { x: number; z: number; span: number };
}

/**
 * La plancha del archipiélago en SVG: imagen inicial del hero, respaldo sin
 * WebGL y base del mapa 2D. Decorativa: el contenido equivalente está en el DOM.
 */
export const ArchipelagoPlate2D = memo(function ArchipelagoPlate2D({
  litIslands = [],
  activeIsland = null,
  className,
  fit = 'cover',
  focus,
}: ArchipelagoPlate2DProps) {
  const geometry = useMemo(() => {
    const shelf = (center: Island['position'], radius: number, seed: number) =>
      BATHYMETRY.map((factor) =>
        toPath(islandBands(center, radius * factor, seed, 1)[0]?.outline ?? []),
      );
    return {
      islands: world.islands.map((island) => ({
        island,
        shelf: shelf(island.position, island.radius, islandSeed(island.id)),
        bands: bandsForIsland(island).map((band) => toPath(band.outline)),
      })),
      lighthouse: {
        shelf: shelf(LIGHTHOUSE_ISLAND.position, LIGHTHOUSE_ISLAND.radius, LIGHTHOUSE_ISLAND.seed),
        bands: bandsForLighthouse().map((band) => toPath(band.outline)),
      },
    };
  }, []);

  const bounds = plateBounds(world.islands, focus);
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxZ - bounds.minZ;

  return (
    <svg
      className={className}
      viewBox={`${String(bounds.minX)} ${String(bounds.minZ)} ${String(width)} ${String(height)}`}
      preserveAspectRatio={fit === 'cover' ? 'xMidYMid slice' : 'xMidYMid meet'}
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x={bounds.minX - 50}
        y={bounds.minZ - 50}
        width={width + 100}
        height={height + 100}
        fill={ATLAS.sea[5]}
      />
      {BATHYMETRY.map((_, depth) => (
        <g key={depth} fill={ATLAS.sea[4 - depth]}>
          {geometry.islands.map(({ island, shelf }) => (
            <path key={island.id} d={shelf[depth]} />
          ))}
          <path d={geometry.lighthouse.shelf[depth]} />
        </g>
      ))}

      <g fill="none" strokeWidth={0.14} strokeDasharray="0.5 0.42" strokeLinecap="round">
        {world.islands.map((island) => {
          const { x, z } = island.position;
          const active = island.id === activeIsland;
          return (
            <path
              key={island.id}
              d={`M0,0 Q${String(x * 0.5 + z * 0.12)},${String(z * 0.5 - x * 0.12)} ${String(x * 0.78)},${String(z * 0.78)}`}
              stroke={active ? ATLAS.route : ATLAS.plate}
              strokeOpacity={active ? 1 : 0.55}
              strokeWidth={active ? 0.22 : 0.14}
            />
          );
        })}
      </g>

      {geometry.islands.map(({ island, bands }) => {
        const lit = litIslands.includes(island.id);
        return (
          <g key={island.id}>
            {bands.map((d, level) => (
              <path key={level} d={d} fill={ATLAS.land[level]} />
            ))}
            {!lit && <path d={bands[0]} fill={ATLAS.haze} fillOpacity={0.32} />}
          </g>
        );
      })}

      {geometry.lighthouse.bands.map((d, level) => (
        <path key={level} d={d} fill={ATLAS.land[level]} />
      ))}
      <g transform="translate(0 -0.15)">
        <path
          d="M-0.32,0.5 L-0.2,-1.1 L0.2,-1.1 L0.32,0.5 Z"
          fill={ATLAS.plate}
          stroke={ATLAS.ink}
          strokeWidth={0.08}
        />
        <rect x={-0.25} y={-0.45} width={0.5} height={0.22} fill={ATLAS.route} />
        <path d="M-0.3,-1.1 L0,-1.45 L0.3,-1.1 Z" fill={ATLAS.ink} />
      </g>
    </svg>
  );
});
