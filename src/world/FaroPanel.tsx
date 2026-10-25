import { useEffect, useRef } from 'react';
import { world } from '@/data';
import type { FinaleRecord } from '@/progress/types';
import { ButtonLink } from '@/ui/ButtonLink';
import { IconClose } from '@/ui/icons';
import { StationSymbol } from '@/ui/StationSymbol';
import type { IslandId } from '@/types/domain';

/** El Faro Minuto: cuánta luz tiene y qué abre al encenderse (el Gran Reto Integrador). */
export function FaroPanel({
  fragments,
  finale,
  onClose,
}: {
  fragments: readonly IslandId[];
  finale: FinaleRecord | null;
  onClose: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  const total = world.islands.length;
  const lit = fragments.length === total;

  return (
    <section aria-labelledby="faro-titulo" className="relative bg-plate p-6 plate-rule">
      <button
        type="button"
        onClick={onClose}
        className="absolute top-2 right-2 inline-flex size-11 items-center justify-center hover:bg-plate-sunk"
        aria-label="Cerrar Faro Minuto"
      >
        <IconClose size={20} />
      </button>
      <h2
        id="faro-titulo"
        ref={heading}
        tabIndex={-1}
        className="pr-10 display text-[clamp(1.5rem,1.1rem+1vw,2rem)] outline-none"
      >
        Faro Minuto
      </h2>
      <p className="mt-2 font-semibold tabular-nums">
        {lit
          ? 'El faro está encendido.'
          : `Brilla con ${String(fragments.length)} de ${String(total)} fragmentos de luz.`}
      </p>
      <ul className="mt-4 space-y-2 border-t-[1.5px] border-ink pt-3 text-sm">
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
      <h3 className="mt-5 font-display text-lg font-extrabold">Gran Reto Integrador</h3>
      <p className="mt-1 text-sm">
        {finale?.completedAt
          ? 'Disipaste a la Gran Bruma: el faro guía de nuevo a todas las islas. Puedes volver a enfrentarla para afinar tu dominio.'
          : lit
            ? 'La Gran Bruma espera en el canal: toma la forma de cada isla y solo la disipa quien combina las seis competencias.'
            : 'Cuando el faro reúna los seis fragmentos se abrirá el Gran Reto Integrador: la Gran Bruma, que combina las seis competencias del archipiélago.'}
      </p>
      {lit && (
        <ButtonLink to="/mundo/faro/gran-reto" className="mt-4">
          {finale?.completedAt ? 'Volver a enfrentar a la Gran Bruma' : 'Enfrentar a la Gran Bruma'}
        </ButtonLink>
      )}
    </section>
  );
}
