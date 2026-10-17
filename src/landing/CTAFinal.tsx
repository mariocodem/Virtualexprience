import { lazy, Suspense } from 'react';
import type { IslandId } from '@/types/domain';
import { ButtonLink } from '@/ui/ButtonLink';
import { IconArrowRight } from '@/ui/icons';
import { ArchipelagoPlate2D } from '@/world/ArchipelagoPlate2D';
import { useLanding } from './landingStore';

const FaroView = lazy(() => import('./scene/FaroView'));

function closingTitle(fragments: number): { title: string; text: string } {
  if (fragments === 0) {
    return {
      title: 'El faro sigue apagado.',
      text: 'Seis fragmentos lo devuelven a la vida. El primero te espera en ComunicArte.',
    };
  }
  if (fragments < 6) {
    return {
      title: `El faro brilla con ${String(fragments)} de 6 fragmentos.`,
      text: 'Cada isla que completas le devuelve un poco más de luz. Sigue la ruta.',
    };
  }
  return {
    title: 'El faro está encendido.',
    text: 'Reuniste los seis fragmentos. El Gran Reto Integrador te espera en el Faro Minuto.',
  };
}

/** Cierre de la plancha: el faro en el campo de mar, apagado o encendido según tu progreso. */
export function CTAFinal({
  resumeTo,
  enable3D,
  reduced,
  litIslands,
}: {
  resumeTo: string | null;
  enable3D: boolean;
  reduced: boolean;
  litIslands: readonly IslandId[];
}) {
  const sceneReady = useLanding((s) => s.sceneReady);
  const { title, text } = closingTitle(litIslands.length);

  // El azul de la sección se pinta solo fuera del retrato: ahí lo pone la escena 3D,
  // porque el canvas compartido va detrás de las secciones.
  return (
    <section
      id="zarpar"
      aria-labelledby="zarpar-titulo"
      className="on-sea relative z-[1] grid items-center gap-8 bg-[linear-gradient(to_bottom,var(--sea-900)_calc(100%-22rem),transparent_calc(100%-22rem))] px-4 pt-24 text-plate sm:bg-[linear-gradient(to_bottom,var(--sea-900)_calc(100%-28rem),transparent_calc(100%-28rem))] sm:px-8 sm:pt-32 lg:min-h-[40rem] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:bg-[linear-gradient(to_right,var(--sea-900)_50%,transparent_50%)] lg:py-32"
    >
      <div>
        <h2
          id="zarpar-titulo"
          data-escala
          className="max-w-[14ch] display text-[clamp(2.75rem,1.6rem+4.4vw,5.75rem)]"
        >
          {title}
        </h2>
        <p className="mt-6 max-w-[44ch] text-xl text-sea-100">{text}</p>
        <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
          <ButtonLink to={resumeTo ?? '/mundo'} size="lg" variant="sun">
            {resumeTo ? 'Continuar expedición' : 'Entrar al mundo'}
          </ButtonLink>
          <ButtonLink
            to="/mundo?demo=1"
            variant="quiet"
            className="gap-2 text-plate hover:decoration-land-sun"
          >
            Recorrido rápido con progreso precargado
            <IconArrowRight size={18} />
          </ButtonLink>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="relative -mx-4 h-[22rem] sm:-mx-8 sm:h-[28rem] lg:absolute lg:inset-y-0 lg:right-0 lg:mx-0 lg:h-auto lg:w-1/2"
      >
        <ArchipelagoPlate2D
          litIslands={litIslands}
          focus={{ x: 0, z: 0, span: 16 }}
          className={
            enable3D && sceneReady
              ? 'absolute inset-0 size-full opacity-0'
              : 'absolute inset-0 size-full opacity-100'
          }
        />
        {enable3D && (
          <Suspense fallback={null}>
            <FaroView litIslands={litIslands} still={reduced} />
          </Suspense>
        )}
        {/* Difumina los bordes del retrato hacia el mar de la sección. */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(closest-side,transparent_62%,var(--sea-900)_100%)]" />
      </div>
    </section>
  );
}
