import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { usePreferences } from '@/a11y/preferences';
import { useReducedMotion } from '@/a11y/useReducedMotion';
import { findIsland, getStation, stationsOf, world } from '@/data';
import { hasWebGL2 } from '@/landing/webgl';
import { nextStation, stationStatus } from '@/progress/selectors';
import { pickProgress, useProgress } from '@/progress/store';
import type { StationStatus } from '@/progress/types';
import { useAnnouncer } from '@/progress/useAnnouncer';
import type { IslandId } from '@/types/domain';
import { ButtonLink } from '@/ui/ButtonLink';
import { ArchipelagoPlate2D } from './ArchipelagoPlate2D';
import { FaroPanel } from './FaroPanel';
import { summitHeight } from './geography';
import { stationLayout } from './layout';
import { MapFallback2D } from './MapFallback2D';
import { Minimap } from './Minimap';
import { ModeToggle } from './ModeToggle';
import type { LabelAnchor } from './scene/LabelProjector';
import { StationPanel } from './StationPanel';
import { WorldLabels, type WorldLabel } from './WorldLabels';
import { WorldPanel } from './WorldPanel';
import { useWorldUi } from './worldStore';

const WorldCanvas = lazy(() => import('./WorldCanvas'));

const DESKTOP = '(min-width: 64rem)';
const subscribeDesktop = (callback: () => void) => {
  const media = window.matchMedia(DESKTOP);
  media.addEventListener('change', callback);
  return () => {
    media.removeEventListener('change', callback);
  };
};

const PLACE_ANCHORS: LabelAnchor[] = [
  ...world.islands.map((i) => ({
    id: i.id,
    position: [i.position.x, summitHeight() + 0.4, i.position.z] as const,
  })),
  { id: 'faro', position: [0, summitHeight(3) + 2.6, 0] as const },
];

/**
 * El mundo: la carta del archipiélago y, en la misma página, cada isla con su
 * sendero. La isla viene de la ruta; la estación o el faro abiertos, de la URL
 * (`?estacion=`, `?faro=1`), así el botón Atrás funciona como se espera.
 */
export default function WorldPage() {
  const { isla } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const mapMode = usePreferences((s) => s.mapMode);
  const webgl = useMemo(() => hasWebGL2(), []);
  const mode = webgl && mapMode === '3d' ? '3d' : '2d';
  const desktop = useSyncExternalStore(subscribeDesktop, () => window.matchMedia(DESKTOP).matches);

  const state = useProgress((s) => s);
  const progress = pickProgress(state);
  const announce = useAnnouncer();
  const highlight = useWorldUi((s) => s.highlight);
  const setHighlight = useWorldUi((s) => s.setHighlight);

  const island = isla ? findIsland(isla) : undefined;
  const unknownIsland = Boolean(isla) && !island;
  const stationParam = params.get('estacion');
  const station = stationParam ? getStation(stationParam) : undefined;
  const openStation = island && station?.islandId === island.id ? station : undefined;
  const faroOpen = params.get('faro') === '1';

  const stations = useMemo(() => (island ? stationsOf(island.id) : []), [island]);
  const spots = useMemo(() => (island ? stationLayout(island, stations) : []), [island, stations]);
  const statuses = useMemo(() => {
    const result: Record<string, StationStatus> = {};
    for (const s of stations) result[s.id] = stationStatus(progress, s);
    return result;
  }, [stations, progress]);
  const completed = stations.filter((s) => statuses[s.id] === 'completada').length;
  const suggested = island ? nextStation(progress, world, island.id)?.id : undefined;

  // Llegar a una isla la registra en la bitácora (y puede otorgar «Cartógrafo»).
  const visitIsland = state.visitIsland;
  useEffect(() => {
    if (island) announce(visitIsland(island.id));
  }, [island, visitIsland, announce]);

  const selectPlace = useCallback(
    (id: IslandId | 'faro') => {
      if (id === 'faro') setParams({ faro: '1' });
      else void navigate(`/mundo/${id}`);
    },
    [navigate, setParams],
  );
  const selectStation = useCallback(
    (id: string) => {
      setParams({ estacion: id });
    },
    [setParams],
  );
  const closePanel = useCallback(() => {
    const returnTo = stationParam ? `[data-station-link="${stationParam}"]` : 'a[href$="?faro=1"]';
    setParams({});
    requestAnimationFrame(() => document.querySelector<HTMLElement>(returnTo)?.focus());
  }, [setParams, stationParam]);

  // Esc: primero cierra el panel abierto; si no hay, vuelve a la carta.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      if (openStation || faroOpen) closePanel();
      else if (island) void navigate('/mundo');
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
    };
  }, [openStation, faroOpen, island, closePanel, navigate]);

  const mapBox = useRef<HTMLDivElement>(null);
  const labels = useRef(new Map<string, HTMLElement>());
  const [canvasReady, setCanvasReady] = useState(false);

  const anchors = useMemo<LabelAnchor[]>(
    () =>
      island
        ? spots.map((spot) => ({
            id: spot.stationId,
            position: [spot.position[0], spot.position[1] + 1.35, spot.position[2]] as const,
          }))
        : PLACE_ANCHORS,
    [island, spots],
  );
  const labelItems = useMemo<WorldLabel[]>(
    () =>
      island
        ? stations.map((s, i) => ({
            id: s.id,
            text: s.title,
            kind: 'station',
            status: statuses[s.id],
            order: i + 1,
          }))
        : [
            ...world.islands.map((i) => ({ id: i.id, text: i.name, kind: 'place' as const })),
            { id: 'faro', text: 'Faro Minuto', kind: 'place' as const },
          ],
    [island, stations, statuses],
  );

  const title = island ? `${island.name} · El mundo` : 'El mundo';

  return (
    <section
      aria-label="Mundo de Archipiélago VirtuX"
      className="relative lg:h-[calc(100svh-var(--header-h,10rem))] lg:min-h-[38rem]"
    >
      <title>{`${title} · Archipiélago VirtuX`}</title>

      <div
        ref={mapBox}
        className="on-sea relative h-[58svh] min-h-80 overflow-hidden bg-sea-900 lg:absolute lg:inset-0 lg:h-auto"
      >
        {mode === '3d' ? (
          <>
            {!canvasReady && (
              <div className="absolute inset-0">
                <ArchipelagoPlate2D
                  fit="contain"
                  litIslands={progress.fragments}
                  className="absolute inset-0 size-full"
                />
                <p
                  role="status"
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 toponym text-[0.6875rem] text-ink halo"
                >
                  Izando velas…
                </p>
              </div>
            )}
            <Suspense fallback={null}>
              <WorldCanvas
                island={island}
                spots={spots}
                statuses={statuses}
                completedInIsland={completed}
                selectedStation={openStation?.id ?? null}
                highlight={highlight}
                litIslands={progress.fragments}
                reduced={reduced}
                panelOffset={desktop}
                anchors={anchors}
                container={mapBox}
                labels={labels}
                onSelectPlace={selectPlace}
                onSelectStation={selectStation}
                onHover={setHighlight}
                onReady={() => {
                  setCanvasReady(true);
                }}
              />
            </Suspense>
            {canvasReady && (
              <WorldLabels
                labels={labels}
                items={labelItems}
                highlight={highlight}
                current={openStation?.id ?? (faroOpen ? 'faro' : null)}
                onSelect={(id) => {
                  if (island) selectStation(id);
                  else selectPlace(id as IslandId | 'faro');
                }}
                onHover={setHighlight}
              />
            )}
          </>
        ) : (
          <MapFallback2D
            island={island}
            stations={stations}
            spots={spots}
            statuses={statuses}
            litIslands={progress.fragments}
            highlight={highlight}
            selectedStation={openStation?.id ?? null}
            onSelectPlace={selectPlace}
            onSelectStation={selectStation}
            onHover={setHighlight}
          />
        )}

        <div data-map-obstacle className="absolute right-3 bottom-3 z-[2] lg:right-6 lg:bottom-6">
          <Minimap island={island} fragments={progress.fragments} />
        </div>
      </div>

      <div className="relative flex flex-col gap-4 p-3 lg:pointer-events-none lg:absolute lg:inset-0 lg:block lg:p-6">
        <div
          data-map-obstacle
          className="order-2 bg-plate p-5 plate-rule lg:pointer-events-auto lg:absolute lg:top-6 lg:bottom-6 lg:left-6 lg:w-[min(24rem,32%)] lg:overflow-y-auto"
        >
          {unknownIsland ? (
            <section aria-labelledby="sin-isla">
              <h1 id="sin-isla" className="display text-3xl">
                Esa isla no está en la carta
              </h1>
              <p className="mt-3 text-ink-soft">
                La dirección no corresponde a ninguna isla del archipiélago.
              </p>
              <ButtonLink to="/mundo" className="mt-5">
                Volver a la carta
              </ButtonLink>
            </section>
          ) : (
            <WorldPanel
              island={island}
              progress={progress}
              statuses={statuses}
              suggested={suggested}
              selectedStation={openStation?.id ?? null}
            />
          )}
        </div>

        <div
          data-map-obstacle
          className="order-1 flex flex-col items-stretch gap-3 lg:pointer-events-auto lg:absolute lg:top-6 lg:right-6 lg:w-[min(24rem,30%)] lg:items-end"
        >
          <ModeToggle webgl={webgl} />
          {openStation && (
            <StationPanel
              station={openStation}
              status={statuses[openStation.id] ?? 'bloqueada'}
              onClose={closePanel}
            />
          )}
          {faroOpen && !openStation && (
            <FaroPanel fragments={progress.fragments} onClose={closePanel} />
          )}
        </div>
      </div>
    </section>
  );
}
