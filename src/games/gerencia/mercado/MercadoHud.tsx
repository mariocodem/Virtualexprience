import { useEffect, useId, useRef, type ReactNode } from 'react';
import type { MercadoContent } from '@/data/contentSchemas';
import {
  affordable,
  type DayResult,
  type MarketDay,
  type MarketState,
} from '@/minigames/dia-de-mercado/engine';
import { effectSummary, QUALITY_LABEL } from '@/minigames/shared/effects';
import { cx } from '@/ui/cx';
import { HudMeter, HudPanel } from '../../shared/hud';
import { EFFECT_LABELS, money, signed } from './format';

/** Piezas del HUD del reto 3D: pizarra de datos, libro de cuentas, pedido, dilema y cierre. */

const PLATE = 'pointer-events-auto bg-plate p-4 text-ink [--focus:var(--route)] plate-rule';
const BIG_BUTTON =
  'inline-flex min-h-11 items-center border-[1.5px] border-sea-900 bg-sea-900 px-5 font-display font-bold text-land-sun focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-(--focus)';

/** Foco al encabezado de un panel cuando aparece (lector de pantalla y teclado). */
function useHeadingFocus() {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return ref;
}

/** La pizarra del puesto: los datos de la jornada, o lo que va pasando mientras se atiende. */
export function Chalkboard({
  day,
  index,
  total,
  sold,
  missed,
  stock,
  live,
}: {
  day: MarketDay;
  index: number;
  total: number;
  sold: number;
  missed: number;
  stock: number;
  /** Mostrar el conteo en vivo en lugar de los datos. */
  live: boolean;
}) {
  return (
    <aside
      aria-label={`Pizarra de la jornada ${String(index + 1)} de ${String(total)}`}
      className="pointer-events-auto w-52 border-[3px] border-[#a87a4f] bg-[#1f3f3a]/95 p-3 text-[#eef4f1] sm:w-72"
    >
      <p className="toponym text-[0.625rem] text-[#b8d3c9]">
        Jornada {index + 1} de {total}
      </p>
      <h2 className="font-display text-lg leading-tight font-extrabold">{day.title}</h2>
      {live ? (
        <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
          <Count label="Vendidas" value={sold} />
          <Count label="Sobrantes" value={stock} />
          <Count label="Sin atender" value={missed} warn={missed > 0} />
        </dl>
      ) : (
        <dl className="mt-2 grid gap-1.5 text-sm">
          {day.data.map((row) => (
            <div key={row.label} className="border-t border-[#5d8176] pt-1">
              <dt className="text-xs text-[#b8d3c9]">{row.label}</dt>
              <dd className="font-semibold">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </aside>
  );
}

function Count({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div>
      <dt className="text-[0.625rem] text-[#b8d3c9]">{label}</dt>
      <dd
        className={cx(
          'font-display text-2xl font-extrabold tabular-nums',
          warn && 'text-[#ffb3a8]',
        )}
      >
        {value}
      </dd>
    </div>
  );
}

/** Caja, reputación, ánimo del equipo y libro de cuentas (desplegable). */
export function CashBook({
  state,
  queue,
  open,
  onToggle,
}: {
  state: MarketState;
  queue: MarketDay[];
  open: boolean;
  onToggle: () => void;
}) {
  const id = useId();
  return (
    <HudPanel className="grid w-52 gap-2 p-2.5 sm:w-60">
      <div>
        <p className="text-xs text-sea-100">Caja</p>
        <p className="font-display text-2xl font-extrabold tabular-nums">
          {money.format(state.cash)}
        </p>
      </div>
      <HudMeter
        label="Reputación"
        value={state.reputation / 100}
        text={`${String(Math.round(state.reputation))} / 100`}
      />
      <HudMeter
        label="Ánimo del equipo"
        value={state.team / 100}
        text={`${String(Math.round(state.team))} / 100`}
        tone={state.team < 40 ? 'route' : 'sun'}
      />
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={onToggle}
        className="min-h-9 border-[1.5px] border-sea-300 px-2 text-left text-sm font-semibold hover:border-land-sun focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-land-sun"
      >
        Libro de cuentas {open ? '▴' : '▾'}
      </button>
      <div id={id} hidden={!open}>
        {state.ledger.length === 0 ? (
          <p className="text-xs text-sea-100">Aún no hay jornadas cerradas.</p>
        ) : (
          <table className="w-full text-xs tabular-nums">
            <caption className="sr-only">Pedido, ventas y ganancia de cada jornada</caption>
            <thead>
              <tr className="border-b border-sea-300 text-left">
                <th scope="col" className="py-1 pr-1 font-semibold">
                  Día
                </th>
                <th scope="col" className="py-1 pr-1 text-right font-semibold">
                  Pedido
                </th>
                <th scope="col" className="py-1 pr-1 text-right font-semibold">
                  Vend.
                </th>
                <th scope="col" className="py-1 text-right font-semibold">
                  Ganancia
                </th>
              </tr>
            </thead>
            <tbody>
              {state.ledger.map((row, i) => (
                <tr key={row.dayId} className="border-b border-sea-800">
                  <th scope="row" className="py-1 pr-1 text-left font-normal">
                    {i + 1}. {queue.find((d) => d.id === row.dayId)?.title}
                  </th>
                  <td className="py-1 pr-1 text-right">{row.order}</td>
                  <td className="py-1 pr-1 text-right">{row.sold}</td>
                  <td className="py-1 text-right">{signed(row.profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </HudPanel>
  );
}

/** Pedido a la cocina: se elige una cantidad y se ven las cajas apiladas en el muelle. */
export function OrderPicker({
  day,
  content,
  state,
  value,
  onSelect,
  onOrder,
}: {
  day: MarketDay;
  content: MercadoContent;
  state: MarketState;
  value: number | null;
  onSelect: (quantity: number) => void;
  onOrder: (quantity: number) => void;
}) {
  const name = useId();
  const heading = useHeadingFocus();
  return (
    <form
      className={cx(PLATE, 'w-full max-w-2xl')}
      onSubmit={(event) => {
        event.preventDefault();
        if (value !== null) onOrder(value);
      }}
    >
      <h3 ref={heading} tabIndex={-1} className="font-display text-lg font-extrabold outline-none">
        ¿Cuántas {content.product.unit} encargas a la cocina?
      </h3>
      <p className="text-sm text-ink-soft max-sm:hidden">
        Lee la pizarra. Cada caja lleva 20; lo que sobra se pierde. Elige con 1 a{' '}
        {day.orders.length} o con las flechas.
      </p>
      <fieldset className="mt-2">
        <legend className="sr-only">Pedido a la cocina</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {day.orders.map((o, i) => {
            const ok = affordable(state, content, o);
            return (
              <label
                key={o}
                className={cx(
                  'flex min-h-14 cursor-pointer flex-col justify-center border-[1.5px] px-3 py-1.5',
                  'has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-(--focus)',
                  value === o
                    ? 'border-ink bg-ink text-land-sun'
                    : 'border-ink hover:bg-plate-sunk',
                  !ok && 'cursor-not-allowed opacity-45',
                )}
              >
                <input
                  type="radio"
                  name={name}
                  className="sr-only"
                  disabled={!ok}
                  checked={value === o}
                  aria-keyshortcuts={String(i + 1)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && value !== null) {
                      event.preventDefault();
                      onOrder(value);
                    }
                  }}
                  onChange={() => {
                    onSelect(o);
                  }}
                />
                <span className="font-display text-xl font-extrabold tabular-nums">
                  <span aria-hidden="true" className="mr-1.5 text-xs opacity-70">
                    {i + 1}
                  </span>
                  {o}
                </span>
                <span
                  className={cx(
                    'text-xs tabular-nums',
                    value === o ? 'text-plate' : 'text-ink-soft',
                  )}
                >
                  {ok
                    ? `${String(Math.ceil(o / 20))} cajas · ${money.format(o * content.product.cost)}`
                    : 'no alcanza la caja'}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <button
        type="submit"
        disabled={value === null}
        className={cx(BIG_BUTTON, 'mt-3 disabled:opacity-50')}
      >
        Encargar a la cocina
      </button>
    </form>
  );
}

/** El dilema que trae el ayudante: opciones con 1 a 3, consecuencia visible tras decidir. */
export function DilemmaCard({
  day,
  decided,
  onDecide,
  onContinue,
}: {
  day: MarketDay;
  decided: MarketDay['dilemma']['options'][number] | null;
  onDecide: (optionId: string) => void;
  onContinue: () => void;
}) {
  const heading = useHeadingFocus();
  const proceed = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (decided) proceed.current?.focus();
  }, [decided]);
  const { dilemma } = day;
  return (
    <section aria-labelledby="dilema-titulo" className={cx(PLATE, 'w-full max-w-2xl')}>
      <p className="toponym text-[0.625rem] text-ink-soft">Tu equipo te necesita</p>
      <h3
        id="dilema-titulo"
        ref={heading}
        tabIndex={-1}
        className="font-display text-lg font-extrabold outline-none"
      >
        {dilemma.prompt}
      </h3>
      <ul className="mt-2 grid gap-1.5">
        {dilemma.options.map((option, i) => {
          const chosen = decided?.id === option.id;
          return (
            <li key={option.id}>
              <button
                type="button"
                disabled={decided !== null}
                aria-keyshortcuts={String(i + 1)}
                onClick={() => {
                  onDecide(option.id);
                }}
                className={cx(
                  'flex min-h-11 w-full items-start gap-3 border-[1.5px] px-3 py-1.5 text-left text-sm',
                  'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-(--focus)',
                  decided === null && 'border-plate-edge hover:border-ink',
                  decided !== null &&
                    option.quality === 1 &&
                    'border-isle-latidosocial bg-land-low/15',
                  chosen && option.quality < 1 && 'border-land-high bg-land-high/10',
                  decided !== null &&
                    !chosen &&
                    option.quality < 1 &&
                    'border-plate-edge opacity-60',
                )}
              >
                <kbd
                  aria-hidden="true"
                  className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center border-[1.5px] border-ink font-display text-xs font-bold"
                >
                  {i + 1}
                </kbd>
                <span>
                  {option.text}
                  {decided !== null && (chosen || option.quality === 1) && (
                    <span className="mt-0.5 block text-xs font-semibold">
                      {QUALITY_LABEL[option.quality]}
                      {chosen && effectSummary(option.effects, EFFECT_LABELS) && (
                        <span className="font-normal text-ink-soft">
                          {' '}
                          · {effectSummary(option.effects, EFFECT_LABELS)}
                        </span>
                      )}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div role="status" aria-live="polite" className="mt-2 min-h-5 text-sm">
        {decided && (
          <p>
            <span className="font-semibold">{QUALITY_LABEL[decided.quality]}.</span>{' '}
            {decided.feedback}
          </p>
        )}
      </div>
      {decided && (
        <button ref={proceed} type="button" onClick={onContinue} className={cx(BIG_BUTTON, 'mt-2')}>
          Abrir el puesto
        </button>
      )}
    </section>
  );
}

/** Mientras se atiende a la fila: saltar la jornada. */
export function ServingBar({ onSkip }: { onSkip: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <div className="pointer-events-auto flex flex-wrap items-center gap-3">
      <p role="status" className="bg-sea-950/85 px-3 py-2 text-sm text-plate plate-rule">
        El puesto está abierto: los clientes hacen fila.
      </p>
      <button
        ref={ref}
        type="button"
        onClick={onSkip}
        className="inline-flex min-h-11 items-center border-[1.5px] border-sea-300 bg-sea-950/85 px-4 font-display text-sm font-bold text-plate hover:border-land-sun focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-land-sun"
      >
        Pasar al cierre
      </button>
    </div>
  );
}

/** Cierre de la jornada: lo vendido, lo sobrante, lo que no se alcanzó a atender y por qué. */
export function DayClose({
  day,
  result,
  unit,
  last,
  onNext,
}: {
  day: MarketDay;
  result: DayResult;
  unit: string;
  last: boolean;
  onNext: () => void;
}): ReactNode {
  const heading = useHeadingFocus();
  const read = result.order === result.best;
  return (
    <section aria-labelledby="cierre-jornada" className={cx(PLATE, 'w-full max-w-2xl')}>
      <h3
        id="cierre-jornada"
        ref={heading}
        tabIndex={-1}
        className="font-display text-lg font-extrabold outline-none"
      >
        Cierre de la jornada
      </h3>
      <dl className="mt-2 grid grid-cols-2 gap-3 border-y-[1.5px] border-ink py-2 sm:grid-cols-4">
        <Figure label="Vendidas" value={`${String(result.sold)} de ${String(result.order)}`} />
        <Figure label="Sobrantes" value={String(result.waste)} />
        <Figure label="Sin atender" value={String(result.missed)} />
        <Figure label="Ganancia" value={signed(result.profit)} />
      </dl>
      <p
        role="status"
        className={cx(
          'mt-2 border-l-[3px] px-3 py-2 text-sm',
          read ? 'border-isle-latidosocial bg-land-low/15' : 'border-land-high bg-land-high/10',
        )}
      >
        <span className="font-semibold">
          {read
            ? 'Leíste bien los datos. '
            : `El pedido que mejor respondía a los datos era ${String(result.best)} ${unit}. `}
        </span>
        {day.reasoning}
      </p>
      <button type="button" onClick={onNext} className={cx(BIG_BUTTON, 'mt-3')}>
        {last ? 'Cerrar la temporada' : 'Siguiente jornada'}
      </button>
    </section>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-ink-soft">{label}</dt>
      <dd className="font-display text-lg font-extrabold tabular-nums">{value}</dd>
    </div>
  );
}
