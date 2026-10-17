import { useGSAP } from '@gsap/react';
import { lazy, Suspense, useRef } from 'react';
import { stationsOf, world } from '@/data';
import type { IslandId } from '@/types/domain';
import { ButtonLink } from '@/ui/ButtonLink';
import { cx } from '@/ui/cx';
import { IconArrowRight } from '@/ui/icons';
import { ArchipelagoPlate2D } from '@/world/ArchipelagoPlate2D';
import { IslandGlyph } from './IslandGlyph';
import { IslandLabels } from './IslandLabels';
import { useLanding } from './landingStore';
import { ScrollTrigger, scrollToY } from './motion';

const RoutesView = lazy(() => import('./scene/RoutesView'));

const STEPS: (IslandId | null)[] = [null, ...world.islands.map((i) => i.id)];

/** Altura de scroll por escala (en svh): suficiente para leer la ficha sin prisa. */
const STEP_SVH = 85;

/**
 * Las seis islas: la sección se fija y, al hacer scroll, la cámara viaja isla
 * por isla mientras la ficha de la izquierda cambia. Todas las fichas están
 * en el DOM, en orden, para lectores de pantalla y teclado.
 */
export function RutasShowcase({
  enable3D,
  reduced,
  litIslands,
}: {
  enable3D: boolean;
  reduced: boolean;
  litIslands: readonly IslandId[];
}) {
  const root = useRef<HTMLElement>(null);
  const plate = useRef<HTMLDivElement>(null);
  const labels = useRef(new Map<string, HTMLElement>());
  const active = useLanding((s) => s.activeIsland);
  const setActive = useLanding((s) => s.setActiveIsland);
  const sceneReady = useLanding((s) => s.sceneReady);

  useGSAP(
    () => {
      const trigger = ScrollTrigger.create({
        trigger: root.current,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => {
          const index = Math.min(STEPS.length - 1, Math.floor(self.progress * STEPS.length));
          const next = STEPS[index] ?? null;
          if (useLanding.getState().activeIsland !== next) setActive(next);
        },
        onLeaveBack: () => {
          setActive(null);
        },
      });
      return () => {
        trigger.kill();
      };
    },
    { scope: root },
  );

  /** Lleva el scroll a la escala de una isla (desde el índice o al enfocar su enlace). */
  const goTo = (id: IslandId) => {
    const section = root.current;
    if (!section) return;
    const index = STEPS.indexOf(id);
    const top = section.getBoundingClientRect().top + window.scrollY;
    const span = section.offsetHeight - window.innerHeight;
    const y = top + (span * (index + 0.5)) / STEPS.length;
    scrollToY(y, reduced);
    setActive(id);
  };

  const activeIndex = STEPS.indexOf(active);

  return (
    <section
      ref={root}
      id="islas"
      aria-labelledby="islas-titulo"
      className="relative z-[1]"
      style={{ height: `calc(100svh + ${String(STEPS.length * STEP_SVH)}svh)` }}
    >
      <div className="sticky top-0 h-svh p-3 sm:p-6">
        <div ref={plate} className="on-sea relative size-full overflow-hidden plate-rule">
          <ArchipelagoPlate2D
            litIslands={litIslands}
            activeIsland={active}
            className={cx(
              'absolute inset-0 size-full transition-opacity duration-(--dur-slow)',
              enable3D && sceneReady ? 'opacity-0' : 'opacity-100',
            )}
          />
          {enable3D && (
            <Suspense fallback={null}>
              <RoutesView
                container={plate}
                labels={labels}
                litIslands={litIslands}
                still={reduced}
              />
            </Suspense>
          )}
          <IslandLabels labels={labels} visible={enable3D && sceneReady} activeIsland={active} />

          <div
            data-map-obstacle
            className="absolute inset-x-3 bottom-3 z-[2] max-h-[54%] overflow-y-auto bg-plate plate-rule sm:inset-x-6 sm:bottom-6 lg:top-6 lg:right-auto lg:bottom-auto lg:left-6 lg:max-h-[calc(100%-3rem)] lg:w-[min(31rem,40%)]"
          >
            <div className="flex flex-col p-5 sm:p-6 xl:p-8">
              <h2 id="islas-titulo" className="display text-[clamp(1.5rem,1.1rem+1.6vw,2.75rem)]">
                Seis islas, seis rutas
              </h2>
              <ol className="relative mt-4 sm:mt-6">
                <li
                  className={cx(
                    'transition-opacity duration-(--dur-base)',
                    active === null
                      ? 'relative opacity-100'
                      : 'pointer-events-none absolute inset-x-0 top-0 opacity-0',
                  )}
                  aria-hidden={active !== null || undefined}
                >
                  <p className="max-w-[40ch] text-lg text-ink-soft">
                    Cada isla trabaja una competencia y cada una guarda un fragmento de luz. Desliza
                    para recorrerlas o elige una en el índice.
                  </p>
                </li>
                {world.islands.map((island) => (
                  <IslandSheet
                    key={island.id}
                    id={island.id}
                    visible={active === island.id}
                    onFocusLink={() => {
                      if (useLanding.getState().activeIsland !== island.id) goTo(island.id);
                    }}
                  />
                ))}
              </ol>

              <nav aria-label="Índice de islas" className="mt-6 border-t-[1.5px] border-ink pt-4">
                <ul className="flex flex-wrap gap-x-1 gap-y-1">
                  {world.islands.map((island, i) => (
                    <li key={island.id}>
                      <button
                        type="button"
                        onClick={() => {
                          goTo(island.id);
                        }}
                        aria-current={active === island.id ? 'step' : undefined}
                        className={cx(
                          'inline-flex min-h-11 items-center gap-2 px-2 placename text-xs hover:bg-plate-sunk',
                          active === island.id ? 'text-route' : 'text-ink',
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cx(
                            'size-2.5 rounded-full border-[1.5px]',
                            i + 1 <= activeIndex
                              ? 'border-route bg-route'
                              : 'border-ink bg-transparent',
                          )}
                        />
                        {island.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function IslandSheet({
  id,
  visible,
  onFocusLink,
}: {
  id: IslandId;
  visible: boolean;
  onFocusLink: () => void;
}) {
  const island = world.islands.find((i) => i.id === id);
  if (!island) return null;
  const stations = stationsOf(id);
  const open = stations.filter((s) => s.availability === 'disponible');
  const minutes = open.reduce((sum, s) => sum + s.minutes, 0);
  const playable = island.expedition === 'jugable';

  return (
    <li
      className={cx(
        'transition-[opacity,translate] duration-(--dur-slow) ease-out',
        visible
          ? 'relative translate-y-0 opacity-100'
          : 'pointer-events-none absolute inset-x-0 top-0 translate-y-2 opacity-0',
      )}
    >
      <article aria-labelledby={`isla-${id}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 id={`isla-${id}`} className="display text-[clamp(2rem,1.4rem+2vw,3.25rem)]">
              {island.name}
            </h3>
            <p
              className="mt-2 max-w-[34ch] font-display text-lg leading-snug font-bold"
              style={{ color: `var(--isle-${id})` }}
            >
              {island.tagline}
            </p>
            <p className="mt-1 hydronym text-ink-soft">{island.metaphor}</p>
          </div>
          <IslandGlyph id={id} />
        </div>
        <p className="mt-4 max-w-[46ch]">{island.summary}</p>
        <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 border-t-[1.5px] border-ink pt-4 text-sm">
          <div>
            <dt className="text-ink-soft">Competencia</dt>
            <dd className="font-semibold">{island.competency}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">Estaciones</dt>
            <dd className="font-semibold tabular-nums">
              {playable
                ? `${String(stations.length)} · unos ${String(minutes)} min`
                : `${String(open.length)} abiertas de ${String(stations.length)}`}
            </dd>
          </div>
        </dl>
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
          <ButtonLink
            to={`/mundo/${id}`}
            variant="quiet"
            className="gap-2"
            tabIndex={visible ? 0 : -1}
            onFocus={onFocusLink}
          >
            {playable ? 'Zarpar hacia la isla' : 'Visitar la isla'}
            <IconArrowRight size={18} />
          </ButtonLink>
          {!playable && <span className="text-sm text-ink-soft">Expedición en preparación</span>}
        </div>
      </article>
    </li>
  );
}
