import { useCallback, type RefObject } from 'react';
import { world } from '@/data';
import type { IslandId } from '@/types/domain';
import { cx } from '@/ui/cx';
import { WATER_NAMES } from './scene/anchors';

const PLACES: { id: string; name: string }[] = [
  ...world.islands.map((i) => ({ id: i.id, name: i.name })),
  { id: 'faro', name: 'Faro Minuto' },
];

/**
 * Rótulos de la plancha sobre el relieve: toponimia con halo cartográfico y
 * línea guía, e hidronimia en itálica sobre el mar. Decorativos: el contenido
 * equivalente está en el DOM.
 */
export function IslandLabels({
  labels,
  visible,
  activeIsland = null,
}: {
  labels: RefObject<Map<string, HTMLElement>>;
  visible: boolean;
  activeIsland?: IslandId | null;
}) {
  const register = useCallback(
    (id: string) => (element: HTMLElement | null) => {
      if (element) labels.current.set(id, element);
      else labels.current.delete(id);
    },
    [labels],
  );

  return (
    <div
      aria-hidden="true"
      className={cx(
        'pointer-events-none absolute inset-0 overflow-hidden transition-opacity duration-(--dur-slow)',
        visible ? 'opacity-100' : 'opacity-0',
      )}
    >
      {WATER_NAMES.map(({ id, name }) => (
        <span
          key={id}
          ref={register(id)}
          className="absolute top-0 left-0 opacity-0 transition-opacity duration-(--dur-base) will-change-transform"
        >
          <span
            data-map-label
            className="block -translate-x-1/2 -translate-y-1/2 hydronym text-[0.8125rem] font-semibold whitespace-nowrap text-sea-700 halo"
          >
            {name}
          </span>
        </span>
      ))}
      {PLACES.map(({ id, name }) => (
        <span
          key={id}
          ref={register(id)}
          className="absolute top-0 left-0 opacity-0 transition-opacity duration-(--dur-base) will-change-transform"
        >
          <span className="flex -translate-x-1/2 -translate-y-full flex-col items-center">
            <span
              data-map-label
              className={cx(
                'placename text-[0.75rem] whitespace-nowrap halo sm:text-[0.8125rem]',
                id === activeIsland ? 'text-route' : 'text-ink',
              )}
            >
              {name}
            </span>
            <span className={cx('mt-1 h-4 w-px', id === activeIsland ? 'bg-route' : 'bg-ink')} />
          </span>
        </span>
      ))}
    </div>
  );
}
