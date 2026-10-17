import { useEffect, useRef } from 'react';
import { getStation } from '@/data';
import { STATUS_LABEL } from '@/progress/statusLabel';
import type { StationStatus } from '@/progress/types';
import type { Station } from '@/types/domain';
import { Button } from '@/ui/Button';
import { IconClose } from '@/ui/icons';
import { StationSymbol } from '@/ui/StationSymbol';
import { FORMAT_LABEL, STATION_TYPE_LABEL } from './stationText';

/** Ficha de una estación: qué es, cuánto toma, qué formatos ofrece y cómo empezar. */
export function StationPanel({
  station,
  status,
  onStart,
  onClose,
}: {
  station: Station;
  status: StationStatus;
  onStart: () => void;
  onClose: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, [station.id]);

  const pending = station.requires
    .map((id) => getStation(id))
    .filter((s): s is Station => s !== undefined);

  return (
    <section aria-labelledby="estacion-titulo" className="relative bg-plate p-6 plate-rule">
      <button
        type="button"
        onClick={onClose}
        className="absolute top-2 right-2 inline-flex size-11 items-center justify-center hover:bg-plate-sunk"
        aria-label="Cerrar estación"
      >
        <IconClose size={20} />
      </button>
      <p className="text-sm text-ink-soft">{STATION_TYPE_LABEL[station.type]}</p>
      <h2
        id="estacion-titulo"
        ref={heading}
        tabIndex={-1}
        className="mt-1 pr-10 display text-[clamp(1.5rem,1.1rem+1vw,2rem)] outline-none"
      >
        {station.title}
      </h2>
      <p className="mt-3 flex items-center gap-2 text-sm font-semibold">
        <StationSymbol status={status} />
        {STATUS_LABEL[status]}
      </p>
      <p className="mt-3">{station.summary}</p>
      <dl className="mt-4 grid grid-cols-2 gap-3 border-t-[1.5px] border-ink pt-3 text-sm">
        <div>
          <dt className="text-ink-soft">Duración</dt>
          <dd className="font-semibold tabular-nums">{station.minutes} min</dd>
        </div>
        <div>
          <dt className="text-ink-soft">Experiencia</dt>
          <dd className="font-semibold tabular-nums">{station.xp} XP</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-ink-soft">Formatos</dt>
          <dd className="font-semibold">
            {station.formats.map((f) => FORMAT_LABEL[f]).join(' · ')}
          </dd>
        </div>
      </dl>

      <div className="mt-5">
        {status === 'disponible' && <Button onClick={onStart}>Comenzar estación</Button>}
        {status === 'en-curso' && (
          <p className="text-sm">Estación en curso: tu bitácora registró el inicio.</p>
        )}
        {status === 'completada' && (
          <p className="text-sm">Completaste esta estación. Puedes repasarla cuando quieras.</p>
        )}
        {status === 'bloqueada' && (
          <p className="text-sm">
            Para abrirla, completa antes{' '}
            {pending.map((s, i) => (
              <span key={s.id}>
                {i > 0 && ' y '}«{s.title}»
              </span>
            ))}
            .
          </p>
        )}
        {status === 'en-preparacion' && (
          <p className="text-sm">
            Esta estación forma parte de una expedición en preparación y se abrirá en una próxima
            temporada.
          </p>
        )}
      </div>
    </section>
  );
}
