import { Suspense, use, useEffect, useState } from 'react';
import { usePreferences } from '@/a11y/preferences';
import { Link, useNavigate } from 'react-router';
import { world } from '@/data';
import { loadFinaleContent } from '@/data/content';
import { ModeSwitch } from '@/games/ModeSwitch';
import { hasWebGL2 } from '@/landing/webgl';
import { useAnnouncer } from '@/progress/useAnnouncer';
import { useProgress } from '@/progress/store';
import { AiBadge } from '@/stations/AiBadge';
import { ButtonLink } from '@/ui/ButtonLink';
import { IconArrowRight } from '@/ui/icons';
import { StationSymbol } from '@/ui/StationSymbol';
import { ArchipelagoPlate2D } from '@/world/ArchipelagoPlate2D';
import { FinaleArena3D } from './FinaleArena3D';
import { FinaleBattle } from './FinaleBattle';

const BACK = '/mundo?faro=1';

/**
 * Gran Reto Integrador, en el Faro Minuto. Se abre con los seis fragmentos de
 * luz: la Gran Bruma toma la forma de cada isla y termina en su corazón.
 */
export default function FinaleStage() {
  const navigate = useNavigate();
  const fragments = useProgress((s) => s.fragments);
  const won = useProgress((s) => Boolean(s.finale?.completedAt));
  const announce = useAnnouncer();
  // Se decide al llegar: ganar no debe cerrar el escenario.
  const [open] = useState(() => fragments.length >= world.islands.length);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      void navigate(BACK);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
    };
  }, [navigate]);

  return (
    <div className="on-sea relative isolate min-h-svh overflow-hidden bg-sea-950 text-plate">
      <title>Gran Reto Integrador · Faro Minuto · Archipiélago VirtuX</title>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <ArchipelagoPlate2D
          fit="cover"
          focus={{ x: 0, z: 0, span: 30 }}
          litIslands={fragments}
          className="absolute inset-0 size-full scale-110"
        />
        <div className="absolute inset-0 bg-sea-950/78" />
        {!won && <div className="absolute inset-0 stage-fog" />}
      </div>

      <header className="relative z-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 lg:px-8">
        <Link
          to={BACK}
          className="inline-flex min-h-11 items-center gap-2 font-display font-bold text-plate no-underline hover:text-land-sun"
        >
          <IconArrowRight size={18} className="rotate-180" />
          Volver al faro
          <kbd className="ml-1 border border-sea-300 px-1.5 text-xs font-semibold text-sea-100">
            Esc
          </kbd>
        </Link>
        <p className="placename text-sm text-sea-100">
          Faro Minuto <span className="text-sea-300">·</span> Gran Reto Integrador
        </p>
        <AiBadge />
      </header>

      <div className="relative z-10 mx-auto max-w-7xl px-4 pb-16 lg:px-8">
        {open ? (
          <Suspense
            fallback={
              <p role="status" className="py-24 text-center toponym text-sm text-sea-100">
                La niebla se espesa sobre el canal…
              </p>
            }
          >
            <FinaleBody promise={loadFinaleContent()} onEvents={announce} />
          </Suspense>
        ) : (
          <Gate fragments={fragments} />
        )}
      </div>
    </div>
  );
}

function FinaleBody({
  promise,
  onEvents,
}: {
  promise: ReturnType<typeof loadFinaleContent>;
  onEvents: ReturnType<typeof useAnnouncer>;
}) {
  const content = use(promise);
  const mode = usePreferences((s) => s.gameMode);
  const [webgl] = useState(hasWebGL2);
  return (
    <div className="grid gap-4">
      <ModeSwitch
        onSea
        available={webgl}
        reason="Este navegador no puede mostrar 3D: se juega la versión accesible."
      />
      {webgl && mode === '3d' ? (
        <FinaleArena3D content={content} onEvents={onEvents} />
      ) : (
        <FinaleBattle content={content} onEvents={onEvents} />
      )}
    </div>
  );
}

function Gate({ fragments }: { fragments: readonly string[] }) {
  const total = world.islands.length;
  return (
    <article className="mx-auto max-w-2xl bg-plate p-6 text-ink [--focus:var(--route)] plate-rule lg:p-10">
      <p className="toponym text-xs text-ink-soft">Gran Reto Integrador</p>
      <h1 className="mt-2 display text-[clamp(2rem,1.4rem+2vw,3.25rem)]">
        El faro aún no tiene su luz
      </h1>
      <p className="mt-4 max-w-[60ch]">
        La Gran Bruma solo se deja enfrentar cuando el Faro Minuto reúne los seis fragmentos de luz.
        Llevas {fragments.length} de {total}.
      </p>
      <ul className="mt-5 space-y-2 border-t-[1.5px] border-ink pt-4">
        {world.islands.map((island) => {
          const has = fragments.includes(island.id);
          return (
            <li key={island.id} className="flex items-center gap-3">
              <StationSymbol status={has ? 'completada' : 'disponible'} />
              <span>
                {island.fragmentName} <span className="text-ink-soft">· {island.name}</span>
                <span className="sr-only">{has ? ': recuperado' : ': pendiente'}</span>
              </span>
            </li>
          );
        })}
      </ul>
      <ButtonLink to="/mundo" size="lg" className="mt-6">
        Volver a la carta
      </ButtonLink>
    </article>
  );
}
