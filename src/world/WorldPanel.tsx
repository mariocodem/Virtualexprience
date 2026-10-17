import { useRef } from 'react';
import { Link } from 'react-router';
import { stationsOf, world } from '@/data';
import { islandProgress } from '@/progress/selectors';
import { STATUS_LABEL } from '@/progress/statusLabel';
import type { Progress, StationStatus } from '@/progress/types';
import type { Island } from '@/types/domain';
import { cx } from '@/ui/cx';
import { IconArrowRight, IconLighthouse } from '@/ui/icons';
import { StationSymbol } from '@/ui/StationSymbol';
import { STATION_TYPE_LABEL } from './stationText';
import { useArrowKeys } from './useArrowKeys';
import { useWorldUi } from './worldStore';

/**
 * Cartela del mundo: la lista equivalente al mapa. En la carta, las islas y el
 * faro; en una isla, su sendero de estaciones. Teclado y lector de pantalla
 * navegan aquí; el mapa resalta lo que tenga el foco.
 */
export function WorldPanel({
  island,
  progress,
  statuses,
  suggested,
  selectedStation,
}: {
  island: Island | undefined;
  progress: Progress;
  statuses: Record<string, StationStatus>;
  suggested: string | undefined;
  selectedStation: string | null;
}) {
  const list = useRef<HTMLOListElement>(null);
  // La lista cambia al entrar o salir de una isla: el atajo se vuelve a enganchar.
  useArrowKeys(list, island?.id ?? 'carta');
  const setHighlight = useWorldUi((s) => s.setHighlight);
  const highlightProps = (id: string) => ({
    onFocus: () => {
      setHighlight(id);
    },
    onBlur: () => {
      setHighlight(null);
    },
    onMouseEnter: () => {
      setHighlight(id);
    },
    onMouseLeave: () => {
      setHighlight(null);
    },
  });

  if (!island) {
    const fragments = progress.fragments.length;
    return (
      <section aria-labelledby="carta-titulo" className="flex flex-col">
        <h1 id="carta-titulo" className="display text-[clamp(1.75rem,1.2rem+1.4vw,2.5rem)]">
          Carta del archipiélago
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          Elige una isla para zarpar. Usa las flechas para recorrer la lista y Enter para abrir.
        </p>
        <ol ref={list} className="mt-4 divide-y divide-plate-edge border-y-[1.5px] border-ink">
          {world.islands.map((entry) => {
            const p = islandProgress(progress, world, entry.id);
            const total = stationsOf(entry.id).length;
            return (
              <li key={entry.id}>
                <Link
                  to={`/mundo/${entry.id}`}
                  {...highlightProps(entry.id)}
                  className="group flex min-h-14 items-center gap-3 py-2 text-ink no-underline hover:bg-plate-sunk"
                >
                  <span
                    aria-hidden="true"
                    className="h-9 w-1.5 shrink-0"
                    style={{ background: `var(--isle-${entry.id})` }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block placename text-sm">{entry.name}</span>
                    <span className="block text-xs text-ink-soft tabular-nums">
                      {entry.expedition === 'jugable'
                        ? `${String(p.completed)} de ${String(total)} estaciones`
                        : `${String(p.playable)} estaciones abiertas · en preparación`}
                      {p.hasFragment ? ' · fragmento recuperado' : ''}
                    </span>
                  </span>
                  <IconArrowRight
                    size={18}
                    className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                  />
                </Link>
              </li>
            );
          })}
          <li>
            <Link
              to="?faro=1"
              {...highlightProps('faro')}
              className="flex min-h-14 items-center gap-3 py-2 text-ink no-underline hover:bg-plate-sunk"
            >
              <IconLighthouse size={22} className="shrink-0 text-sea-700" />
              <span className="min-w-0 flex-1">
                <span className="block placename text-sm">Faro Minuto</span>
                <span className="block text-xs text-ink-soft tabular-nums">
                  {String(fragments)} de {String(world.islands.length)} fragmentos de luz
                </span>
              </span>
            </Link>
          </li>
        </ol>
      </section>
    );
  }

  const stations = stationsOf(island.id);
  const p = islandProgress(progress, world, island.id);
  return (
    <section aria-labelledby="isla-titulo" className="flex flex-col">
      <Link
        to="/mundo"
        className="inline-flex min-h-10 items-center gap-2 self-start text-sm font-semibold text-ink-soft no-underline hover:text-ink"
      >
        <IconArrowRight size={16} className="rotate-180" />
        Carta del archipiélago <span className="text-xs">(Esc)</span>
      </Link>
      <h1 id="isla-titulo" className="mt-2 display text-[clamp(2rem,1.3rem+1.8vw,2.75rem)]">
        {island.name}
      </h1>
      <p
        className="mt-1 font-display leading-snug font-bold"
        style={{ color: `var(--isle-${island.id})` }}
      >
        {island.tagline}
      </p>
      <p className="mt-1 hydronym text-sm text-ink-soft">{island.metaphor}</p>
      <p className="mt-3 text-sm tabular-nums">
        {String(p.completed)} de {String(p.playable)} estaciones abiertas completadas ·{' '}
        {p.hasFragment ? `${island.fragmentName} recuperado` : `${island.fragmentName} pendiente`}
      </p>

      <h2 className="mt-5 toponym text-[0.6875rem]">Sendero</h2>
      <ol ref={list} className="mt-2 divide-y divide-plate-edge border-y-[1.5px] border-ink">
        {stations.map((station, i) => {
          const status = statuses[station.id] ?? 'bloqueada';
          const selected = selectedStation === station.id;
          return (
            <li key={station.id}>
              <Link
                to={`?estacion=${station.id}`}
                data-station-link={station.id}
                aria-current={selected ? 'true' : undefined}
                {...highlightProps(station.id)}
                className={cx(
                  'flex min-h-14 items-center gap-3 py-2 text-ink no-underline hover:bg-plate-sunk',
                  selected && 'bg-plate-sunk',
                )}
              >
                <span className="w-5 text-center text-xs text-ink-soft tabular-nums">{i + 1}</span>
                <StationSymbol status={status} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{station.title}</span>
                  <span className="block text-xs text-ink-soft">
                    {STATION_TYPE_LABEL[station.type]} · {station.minutes} min ·{' '}
                    {STATUS_LABEL[status]}
                    {suggested === station.id && (
                      <span className="font-semibold text-ink">
                        {' · '}
                        <span aria-hidden="true" className="mr-1 inline-block size-2 bg-route" />
                        Sugerida por Brújula
                      </span>
                    )}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
      {island.expedition === 'en-preparacion' && (
        <p className="mt-4 text-sm text-ink-soft">
          Expedición en preparación: las estaciones de muestra ya están abiertas; el resto del
          sendero se abrirá en una próxima temporada.
        </p>
      )}
    </section>
  );
}
