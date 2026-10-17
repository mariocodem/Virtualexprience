import { useEffect, useRef, useState } from 'react';
import { world } from '@/data';
import type { Island, IslandId } from '@/types/domain';
import { ArchipelagoPlate2D } from './ArchipelagoPlate2D';
import { plateBounds, projectToPlate } from './geography';

/** Minimapa permanente: dónde estás y qué islas ya devolvieron su fragmento. */
export function Minimap({
  island,
  fragments,
}: {
  island: Island | undefined;
  fragments: readonly IslandId[];
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

  const here = projectToPlate(
    island?.position ?? { x: 0, z: 0 },
    plateBounds(world.islands),
    size.width,
    size.height,
  );

  return (
    <figure className="w-28 bg-plate p-1.5 plate-rule lg:w-40">
      <div ref={box} aria-hidden="true" className="relative aspect-square overflow-hidden">
        <ArchipelagoPlate2D
          fit="contain"
          litIslands={fragments}
          activeIsland={island?.id ?? null}
          className="absolute inset-0 size-full"
        />
        {size.width > 0 && (
          <span
            className="absolute size-3 -translate-1/2 rounded-full border-2 border-plate bg-route"
            style={{ left: here.left, top: here.top }}
          />
        )}
      </div>
      <figcaption className="mt-1 text-xs leading-snug">
        <span className="font-semibold">Estás en {island ? island.name : 'la carta'}</span>
        <span className="block text-ink-soft tabular-nums">
          {String(fragments.length)} de {String(world.islands.length)} fragmentos
        </span>
      </figcaption>
    </figure>
  );
}
