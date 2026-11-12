import { useRef } from 'react';
import { ReadAloud } from '@/a11y/ReadAloud';
import { world } from '@/data';
import { BADGE_CATEGORIES } from '@/progress/badgeCategories';
import { Stamp } from '@/progress/Stamp';
import { pickProgress, useProgress } from '@/progress/store';
import type { Badge } from '@/types/domain';
import { ButtonLink } from '@/ui/ButtonLink';
import { Dialog } from '@/ui/Dialog';
import { badgeDestination, badgeStatus, percent, type BadgeStatus } from './badgeDetails';

const dateOf = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });

/**
 * Ficha de una insignia: el sello en grande, su familia, cómo se sella, qué
 * reconoce y tu avance. Se abre al pulsar cualquier sello (pasaporte, vista
 * previa de la landing, tarjeta de estación completada).
 */
export function BadgeDialog({ badge, onClose }: { badge: Badge | null; onClose: () => void }) {
  return (
    <Dialog
      open={badge !== null}
      onClose={onClose}
      title={badge?.name ?? ''}
      description={
        badge ? `Insignia de ${BADGE_CATEGORIES[badge.category].label.toLowerCase()}` : undefined
      }
    >
      {badge && <BadgeDetails badge={badge} />}
    </Dialog>
  );
}

function BadgeDetails({ badge }: { badge: Badge }) {
  const progress = pickProgress(useProgress((s) => s));
  const status = badgeStatus(badge, progress, world);
  const destination = badgeDestination(badge, world);
  const category = BADGE_CATEGORIES[badge.category];
  const body = useRef<HTMLDivElement>(null);

  return (
    <div ref={body}>
      <div className="grid items-center gap-6 sm:grid-cols-[auto_minmax(0,1fr)]">
        <div className="justify-self-center">
          <Stamp badge={badge} size={148} faded={!status.earned} decorative />
        </div>
        <div>
          <p className="text-ink-soft">{category.blurb}</p>
          <Status status={status} />
        </div>
      </div>

      <dl className="mt-6 grid gap-4 border-t-[1.5px] border-ink pt-4">
        <div>
          <dt className="font-display font-bold">Cómo se sella</dt>
          <dd className="mt-1">{badge.howTo}</dd>
        </div>
        <div>
          <dt className="font-display font-bold">Qué reconoce</dt>
          <dd className="mt-1">{badge.meaning}</dd>
        </div>
        {status.earned && (
          <div>
            <dt className="font-display font-bold">En tu bitácora</dt>
            <dd className="mt-1">{badge.description}</dd>
          </div>
        )}
      </dl>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        {!status.earned && <ButtonLink to={destination.to}>{destination.label}</ButtonLink>}
        <ReadAloud target={body} />
      </div>
    </div>
  );
}

function Status({ status }: { status: BadgeStatus }) {
  if (status.earned) {
    return (
      <p className="mt-4 inline-flex items-center gap-2 border-[1.5px] border-ink bg-land-sun px-3 py-1.5 font-semibold text-sea-950">
        <span aria-hidden="true">✓</span>
        <span>
          Sellada el <time dateTime={status.at}>{dateOf(status.at)}</time>
        </span>
      </p>
    );
  }
  const { tally, best, note } = status;
  const fill = tally
    ? tally.current / tally.target
    : best
      ? Math.min(1, best.value / best.goal)
      : 0;
  return (
    <div className="mt-4">
      <p className="font-semibold">
        Por sellar
        {tally && (
          <span className="tabular-nums">
            {' '}
            · llevas {tally.current} de {tally.target}
          </span>
        )}
      </p>
      {best && (
        <p className="mt-1 text-sm tabular-nums">
          Tu mejor partida: {percent(best.value)} · meta: {percent(best.goal)}
        </p>
      )}
      {(tally ?? best) && (
        <div
          aria-hidden="true"
          className="mt-2 h-2.5 w-full border-[1.5px] border-ink bg-plate-sunk"
        >
          <div className="h-full bg-ink" style={{ width: `${String(Math.round(fill * 100))}%` }} />
        </div>
      )}
      {note && <p className="mt-2 text-sm text-ink-soft">{note}</p>}
    </div>
  );
}

/** Un sello que se puede pulsar para abrir su ficha. */
export function StampButton({
  badge,
  size,
  faded = false,
  onOpen,
}: {
  badge: Badge;
  size: number;
  faded?: boolean;
  onOpen: (badge: Badge) => void;
}) {
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      onClick={() => {
        onOpen(badge);
      }}
      className="block transition-transform duration-(--dur-fast) ease-out hover:-translate-y-0.5 active:translate-y-px"
    >
      <span className="sr-only">{badge.name}: ver detalles de la insignia</span>
      <Stamp badge={badge} size={size} faded={faded} decorative />
    </button>
  );
}
