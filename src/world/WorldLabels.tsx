import { useCallback, type RefObject } from 'react';
import type { StationStatus } from '@/progress/types';
import { cx } from '@/ui/cx';
import { StationSymbol } from '@/ui/StationSymbol';

export interface WorldLabel {
  id: string;
  text: string;
  kind: 'place' | 'station';
  status?: StationStatus;
  /** Número de la parada en el sendero: el rótulo compacto lo muestra; el título, al resaltar. */
  order?: number;
}

/**
 * Rótulos del mapa, proyectados desde el 3D. Se pueden pulsar con el puntero;
 * el teclado y el lector de pantalla usan la lista de la cartela, que es la
 * representación equivalente (por eso aquí van ocultos a la accesibilidad).
 */
export function WorldLabels({
  labels,
  items,
  highlight,
  current,
  onSelect,
  onHover,
}: {
  labels: RefObject<Map<string, HTMLElement>>;
  items: WorldLabel[];
  highlight: string | null;
  current: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const register = useCallback(
    (id: string) => (element: HTMLElement | null) => {
      if (element) labels.current.set(id, element);
      else labels.current.delete(id);
    },
    [labels],
  );

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {items.map((item) => {
        const on = highlight === item.id || current === item.id;
        return (
          <span
            key={item.id}
            ref={register(item.id)}
            className="absolute top-0 left-0 opacity-0 transition-opacity duration-(--dur-base) will-change-transform"
          >
            <span className="flex -translate-x-1/2 -translate-y-full flex-col items-center">
              <button
                type="button"
                tabIndex={-1}
                onClick={() => {
                  onSelect(item.id);
                }}
                onPointerEnter={() => {
                  onHover(item.id);
                }}
                onPointerLeave={() => {
                  onHover(null);
                }}
                className={cx(
                  'pointer-events-auto inline-flex items-center gap-1.5 whitespace-nowrap',
                  item.kind === 'place'
                    ? 'placename text-[0.8125rem] halo'
                    : 'border-[1.5px] bg-plate px-2 py-1 font-display text-xs font-bold',
                  item.kind === 'station' && (on ? 'border-route' : 'border-ink'),
                  on ? 'text-route' : 'text-ink',
                )}
              >
                {item.status && <StationSymbol status={item.status} size={14} />}
                {item.kind === 'station' ? (
                  <>
                    <span className="tabular-nums">{item.order}</span>
                    {on && <span>· {item.text}</span>}
                  </>
                ) : (
                  item.text
                )}
              </button>
              <span className={cx('mt-1 h-4 w-px', on ? 'bg-route' : 'bg-ink')} />
            </span>
          </span>
        );
      })}
    </div>
  );
}
