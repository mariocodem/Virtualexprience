import { motion } from 'motion/react';
import { Fragment, lazy, Suspense, useEffect, useRef } from 'react';
import { world } from '@/data';
import { STATUS_LABEL } from '@/progress/statusLabel';
import type { IslandId } from '@/types/domain';
import { ButtonLink } from '@/ui/ButtonLink';
import { CompassRose } from '@/ui/CompassRose';
import { cx } from '@/ui/cx';
import { IconArrowRight, IconPlus } from '@/ui/icons';
import { StationSymbol } from '@/ui/StationSymbol';
import { ArchipelagoPlate2D } from '@/world/ArchipelagoPlate2D';
import { archipelagoBounds } from '@/world/geography';
import { IslandLabels } from './IslandLabels';
import { useLanding } from './landingStore';
import { goToSection } from './motion';

const HeroView = lazy(() => import('./scene/HeroView'));

const COLUMNS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const ROWS = ['1', '2', '3', '4', '5'];

/** Minutos promedio por estación abierta: la escala de la plancha es un dato real del producto. */
const MINUTES_PER_STATION = Math.round(
  world.stations
    .filter((s) => s.availability === 'disponible')
    .reduce((sum, s, _, all) => sum + s.minutes / all.length, 0),
);

const TITLE_LINES = [
  { words: ['Aprende', 'explorando.'], tone: 'text-ink' },
  { words: ['Enciende', 'el', 'Faro.'], tone: 'text-sea-700' },
] as const;

export interface Hero3DProps {
  enable3D: boolean;
  reduced: boolean;
  litIslands: readonly IslandId[];
  /** Si quien llega ya tiene una expedición en marcha, a dónde continuar. */
  resume: { islandId: IslandId; islandName: string } | null;
}

/**
 * Plancha 1. En escritorio la cartela y las convenciones flotan sobre la carta;
 * en móvil la cartela va primero (el título y la acción caben en la primera
 * pantalla) y la carta asoma bajo ella.
 */
export function Hero3D({ enable3D, reduced, litIslands, resume }: Hero3DProps) {
  const plate = useRef<HTMLDivElement>(null);
  const labels = useRef(new Map<string, HTMLElement>());
  const sceneReady = useLanding((s) => s.sceneReady);
  const activeIsland = resume?.islandId ?? null;

  return (
    <section
      id="inicio"
      aria-labelledby="hero-titulo"
      className="relative z-[1] px-3 pt-3 pb-3 sm:px-6 sm:pb-6 lg:pt-6"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none hidden h-6 grid-cols-8 px-px text-center lg:ml-6 lg:grid"
      >
        {COLUMNS.map((c) => (
          <span key={c} className="self-center toponym text-[0.625rem] text-ink-soft">
            {c}
          </span>
        ))}
      </div>

      <div className="relative flex flex-col lg:block lg:pl-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 hidden w-6 grid-rows-5 lg:grid"
        >
          {ROWS.map((r) => (
            <span key={r} className="self-center toponym text-[0.625rem] text-ink-soft">
              {r}
            </span>
          ))}
        </div>

        <TitleCard reduced={reduced} resume={resume} />

        <div
          ref={plate}
          className="on-sea relative -mt-10 h-[70svh] min-h-96 overflow-hidden plate-rule lg:mt-0 lg:h-auto lg:min-h-[calc(100svh-7.5rem)]"
        >
          {/* Plancha impresa: pinta al instante y se retira cuando el relieve 3D está listo. */}
          <ArchipelagoPlate2D
            litIslands={litIslands}
            activeIsland={activeIsland}
            className={cx(
              'absolute inset-0 size-full transition-opacity duration-(--dur-slow)',
              sceneReady ? 'opacity-0' : 'opacity-100',
            )}
          />
          {enable3D && (
            <Suspense fallback={null}>
              <HeroView
                container={plate}
                labels={labels}
                litIslands={litIslands}
                activeIsland={activeIsland}
                still={reduced}
              />
            </Suspense>
          )}
          <IslandLabels labels={labels} visible={sceneReady} activeIsland={activeIsland} />
          <p className="sr-only">
            Carta ilustrada del archipiélago: seis islas en relieve rodean al Faro Minuto, todavía
            apagado.
          </p>
        </div>

        <PlateLegend />

        {/* Esquina norte de la plancha: mapa de ubicación y rosa de los vientos, sobre mar abierto. */}
        <div
          data-map-obstacle
          aria-hidden="true"
          className="absolute top-6 right-6 z-[2] hidden items-start gap-3 lg:flex"
        >
          <LocationInset activeIsland={activeIsland} litIslands={litIslands} />
          <figure className="flex flex-col items-center">
            <CompassRose size={64} className="text-plate" />
            <figcaption className="mt-1 hydronym text-sm text-plate">Brújula</figcaption>
          </figure>
        </div>

        <a
          href="#manifiesto"
          onClick={(event) => {
            event.preventDefault();
            goToSection('manifiesto', reduced);
          }}
          className="absolute bottom-5 left-12 z-[2] hidden min-h-11 items-center gap-3 toponym text-[0.6875rem] text-plate no-underline lg:[@media(min-height:52rem)]:inline-flex"
        >
          Desliza para zarpar
          <svg
            width="14"
            height="28"
            viewBox="0 0 14 28"
            aria-hidden="true"
            className="text-land-sun"
          >
            <path
              d="M7 0v22"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="4 3"
              className="scroll-cue"
            />
            <path d="M2 18l5 6 5-6" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        </a>
      </div>
    </section>
  );
}

function TitleCard({ reduced, resume }: Pick<Hero3DProps, 'reduced' | 'resume'>) {
  return (
    <div
      data-map-obstacle
      className="relative z-[2] bg-plate p-6 plate-rule sm:max-w-[34rem] sm:p-8 lg:absolute lg:top-6 lg:left-12 lg:w-[min(36rem,42%)] lg:max-w-none lg:p-8 2xl:p-10"
    >
      <h1
        id="hero-titulo"
        className="display text-[clamp(2.5rem,min(1.4rem+4.4vw,1rem+7svh),5.75rem)] text-ink"
      >
        {TITLE_LINES.map((line, lineIndex) => (
          <span key={lineIndex} className={cx('block', line.tone)}>
            {line.words.map((word, i) => (
              <Fragment key={word}>
                {i > 0 && ' '}
                <motion.span
                  className="inline-block"
                  initial={reduced ? false : { opacity: 0, y: '0.35em', filter: 'blur(6px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{
                    duration: 0.9,
                    delay: 0.15 + (lineIndex * 2 + i) * 0.09,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  {word}
                </motion.span>
              </Fragment>
            ))}{' '}
          </span>
        ))}
      </h1>
      <p className="mt-5 max-w-[44ch] text-ink-soft sm:mt-6 sm:text-lg">
        Seis islas, seis rutas de aprendizaje de VirtuXperience y un faro que espera tu luz.
        Explora, practica y recupera los fragmentos.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-3 sm:mt-8">
        {resume ? (
          <ButtonLink to={`/mundo/${resume.islandId}`} size="lg">
            Continuar expedición
          </ButtonLink>
        ) : (
          <ButtonLink to="/mundo" size="lg">
            Entrar al mundo
          </ButtonLink>
        )}
        <ButtonLink
          to="#como-funciona"
          size="lg"
          variant="secondary"
          onClick={(event) => {
            event.preventDefault();
            goToSection('como-funciona', reduced);
          }}
        >
          Ver cómo funciona
        </ButtonLink>
      </div>
      {resume ? (
        <p className="mt-5 text-sm text-ink-soft">
          Tu última escala fue {resume.islandName}.{' '}
          <ButtonLink to="/mundo" variant="quiet" className="min-h-0 text-sm">
            Ver toda la carta
          </ButtonLink>
        </p>
      ) : (
        <ButtonLink to="/mundo?demo=1" variant="quiet" className="mt-4 gap-2 sm:mt-5">
          Recorrido rápido con progreso precargado
          <IconArrowRight size={18} />
        </ButtonLink>
      )}
    </div>
  );
}

/** Cuadro de convenciones: estados de estación y escala de la plancha. */
function PlateLegend() {
  const ref = useRef<HTMLDetailsElement>(null);
  // Abierta en escritorio; plegada en pantallas pequeñas para no tapar la carta.
  useEffect(() => {
    if (ref.current) ref.current.open = window.matchMedia('(min-width: 64rem)').matches;
  }, []);

  return (
    <details
      ref={ref}
      data-map-obstacle
      className="group relative z-[2] mt-3 bg-plate plate-rule lg:absolute lg:right-6 lg:bottom-6 lg:mt-0"
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-5 toponym text-[0.6875rem] lg:pointer-events-none">
        Convenciones
        <IconPlus
          size={18}
          className="transition-transform duration-(--dur-fast) group-open:rotate-45 lg:hidden"
        />
      </summary>
      <div className="flex items-start gap-5 px-5 pb-5">
        <div>
          <ul className="space-y-2 text-sm">
            {(['bloqueada', 'disponible', 'en-curso', 'completada'] as const).map((status) => (
              <li key={status} className="flex items-center gap-3">
                <StationSymbol status={status} />
                {STATUS_LABEL[status]}
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <div aria-hidden="true" className="flex h-1.5 w-32">
              <span className="flex-1 bg-ink" />
              <span className="flex-1 border border-ink" />
              <span className="flex-1 bg-ink" />
              <span className="flex-1 border border-ink" />
            </div>
            <p className="mt-1.5 text-xs text-ink-soft tabular-nums">
              1 estación ≈ {MINUTES_PER_STATION} min
            </p>
          </div>
        </div>
        <figure className="flex flex-col items-center lg:hidden">
          <CompassRose size={72} />
          <figcaption className="mt-1 hydronym text-sm">Brújula</figcaption>
        </figure>
      </div>
    </details>
  );
}

function LocationInset({
  activeIsland,
  litIslands,
}: {
  activeIsland: IslandId | null;
  litIslands: readonly IslandId[];
}) {
  const island = activeIsland ? world.islands.find((i) => i.id === activeIsland) : undefined;
  const marker = insetPosition(island?.position ?? { x: 0, z: 0 });
  return (
    <figure className="w-24 shrink-0 bg-plate p-1.5 plate-rule">
      <div className="relative aspect-square overflow-hidden">
        <ArchipelagoPlate2D
          fit="contain"
          litIslands={litIslands}
          activeIsland={activeIsland}
          className="absolute inset-0 size-full"
        />
        <span
          className="absolute size-3 -translate-1/2 rounded-full border-2 border-plate bg-route"
          style={{ left: `${marker.left.toFixed(2)}%`, top: `${marker.top.toFixed(2)}%` }}
        />
      </div>
      <figcaption className="mt-1 flex flex-col font-display text-[0.625rem] leading-snug font-bold tracking-[0.1em] uppercase">
        <span>Ubicación</span>
        <span className="text-route">{island ? island.name : 'Estás aquí'}</span>
      </figcaption>
    </figure>
  );
}

/** Posición (en %) de un punto del mundo dentro del mapa de ubicación cuadrado (`contain`). */
function insetPosition(point: { x: number; z: number }) {
  const b = archipelagoBounds(world.islands, 9);
  const width = b.maxX - b.minX;
  const height = b.maxZ - b.minZ;
  const scale = Math.min(1 / width, 1 / height);
  return {
    left: 50 + (point.x - (b.minX + b.maxX) / 2) * scale * 100,
    top: 50 + (point.z - (b.minZ + b.maxZ) / 2) * scale * 100,
  };
}
