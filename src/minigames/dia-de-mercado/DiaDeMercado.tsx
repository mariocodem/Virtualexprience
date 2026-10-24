import { useEffect, useId, useRef, useState } from 'react';
import { useReducedMotion } from '@/a11y/useReducedMotion';
import { minigameLevel } from '@/ai/adaptiveEngine';
import type { MercadoContent } from '@/data/contentSchemas';
import { useProgress } from '@/progress/store';
import { useMastery } from '@/stations/useMastery';
import { Button } from '@/ui/Button';
import { cx } from '@/ui/cx';
import { DilemmaPanel } from '../shared/DilemmaPanel';
import { GameBriefing } from '../shared/GameBriefing';
import { GameReport } from '../shared/GameReport';
import { Meter } from '../shared/Meter';
import type { MinigameProps } from '../shared/types';
import {
  affordable,
  currentDayId,
  isFinished,
  marketPlan,
  nextDay,
  placeOrder,
  report,
  resolveDay,
  selectDays,
  startMarket,
  type DayResult,
  type MarketDay,
  type MarketReport,
  type MarketState,
} from './engine';
import { MarketScene } from './MarketScene';

const money = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});
const signed = (value: number) => `${value >= 0 ? '+' : '−'}${money.format(Math.abs(value))}`;

const EFFECT_LABELS = {
  caja: 'Caja (miles de pesos)',
  reputacion: 'Reputación',
  equipo: 'Ánimo del equipo',
};

type Stage =
  | { kind: 'briefing' }
  | { kind: 'temporada'; queue: MarketDay[]; state: MarketState }
  | { kind: 'informe'; queue: MarketDay[]; state: MarketState; result: MarketReport };

/**
 * Día de mercado (Gerencia+). Gestionar es decidir con datos y con el equipo:
 * el pedido de cada jornada se infiere de las cifras, y cada dilema pone en
 * juego la caja, la reputación y el ánimo de quienes trabajan contigo.
 */
export function DiaDeMercado({
  content,
  island,
  onBrujula,
  onEvents,
  onComplete,
  onFail,
}: MinigameProps<MercadoContent>) {
  const still = useReducedMotion();
  const { mastery, record } = useMastery(island.id);
  const recordMinigame = useProgress((s) => s.recordMinigame);
  const [level] = useState(() => minigameLevel(mastery));
  const plan = marketPlan(level);
  const [stage, setStage] = useState<Stage>({ kind: 'briefing' });
  const chosen = useRef<string | null>(null);

  const begin = () => {
    const queue = selectDays(content.days, plan, Math.random);
    onBrujula(null);
    setStage({ kind: 'temporada', queue, state: startMarket(content, queue) });
    window.scrollTo({ top: 0 });
  };

  if (stage.kind === 'briefing') {
    return (
      <GameBriefing
        intro={content.intro}
        level={level}
        figures={[
          { label: 'Jornadas', value: String(plan.days) },
          { label: 'Caja inicial', value: money.format(content.startCash) },
          {
            label: 'Costo y precio',
            value: `${money.format(content.product.cost)} / ${money.format(content.product.price)}`,
          },
          { label: 'Meta diaria', value: money.format(content.goal) },
        ]}
        rules={[
          `Cada mañana encargas ${content.product.unit} a la cocina. Lo que no se vende se pierde: lee los datos de la jornada antes de pedir.`,
          'Después llega una decisión de gestión. Mueve la caja, la reputación (que atrae o aleja clientes) y el ánimo del equipo (que define a cuántos alcanzan a atender).',
          'Algunos datos engañan: un día atípico, un promedio que mezcla días distintos. Combínalos con cuidado.',
          'Se evalúan los pedidos que responden a los datos, la calidad de tus decisiones y la ganancia promedio.',
        ]}
        beginLabel="Abrir el puesto"
        onBegin={begin}
      />
    );
  }

  if (stage.kind === 'informe') {
    return (
      <MarketReportView
        content={content}
        queue={stage.queue}
        state={stage.state}
        result={stage.result}
        competency={island.competency}
        back={`/mundo/${island.id}?estacion=gerencia-mercado`}
        onComplete={() => {
          onComplete(stage.result.score);
        }}
        onRetry={begin}
      />
    );
  }

  const { queue, state } = stage;
  const day = queue.find((d) => d.id === currentDayId(state));
  if (!day) return null;
  const today = state.phase === 'cierre' ? state.ledger.at(-1) : undefined;
  const update = (next: MarketState) => {
    setStage({ kind: 'temporada', queue, state: next });
  };

  return (
    <div className="grid gap-5">
      <p className="toponym text-[0.625rem] text-ink-soft">
        Mercado de Gerencia+ · Jornada {state.index + 1} de {queue.length} · {day.title}
      </p>
      <div className="bg-plate-sunk plate-rule">
        <MarketScene
          order={state.order}
          sold={today?.sold ?? 0}
          missed={today?.missed ?? 0}
          closed={state.phase === 'cierre'}
          team={state.team}
          still={still}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div>
          {state.phase === 'pedido' && (
            <OrderDesk
              key={day.id}
              day={day}
              content={content}
              state={state}
              onOrder={(quantity) => {
                update(placeOrder(state, content, day, quantity));
              }}
            />
          )}
          {state.phase === 'dilema' && (
            <DilemmaPanel
              key={`${day.id}-dilema`}
              dilemma={day.dilemma}
              effectLabels={EFFECT_LABELS}
              continueLabel="Cerrar la jornada"
              onDecide={(option) => {
                chosen.current = option.id;
                record(day.tier, option.quality);
              }}
              onContinue={() => {
                if (!chosen.current) return;
                const next = resolveDay(state, content, day, chosen.current);
                const result = next.ledger.at(-1);
                chosen.current = null;
                update(next);
                if (result) {
                  record(day.tier, result.order === result.best ? 1 : 0);
                  onBrujula({ text: closingTip(result, next.team), source: 'local' });
                }
              }}
            />
          )}
          {state.phase === 'cierre' && today && (
            <DayClose
              key={`${day.id}-cierre`}
              day={day}
              result={today}
              unit={content.product.unit}
              last={state.index + 1 === queue.length}
              onNext={() => {
                const next = nextDay(state);
                onBrujula(null);
                if (isFinished(next)) {
                  const result = report(next, content);
                  onEvents(
                    recordMinigame('dia-de-mercado', {
                      accuracy: result.accuracy,
                      criteria: result.criteria,
                      toolsUsed: result.toolsUsed,
                    }),
                  );
                  if (result.score < 0.6) onFail(result.score);
                  setStage({ kind: 'informe', queue, state: next, result });
                } else {
                  update(next);
                }
              }}
            />
          )}
        </div>

        <aside
          aria-label="Estado del puesto"
          className="grid content-start gap-4 border-t-[1.5px] border-ink pt-4 lg:border-t-0 lg:border-l-[1.5px] lg:pt-0 lg:pl-6"
        >
          <div>
            <p className="text-sm text-ink-soft">Caja</p>
            <p className="font-display text-3xl font-extrabold tabular-nums">
              {money.format(state.cash)}
            </p>
          </div>
          <Meter
            label="Reputación"
            value={state.reputation}
            valueText={`${String(Math.round(state.reputation))} de 100`}
          />
          <Meter
            label="Ánimo del equipo"
            value={state.team}
            valueText={`${String(Math.round(state.team))} de 100`}
            tone={state.team < 40 ? 'high' : 'ink'}
          />
          <Ledger queue={queue} ledger={state.ledger} />
        </aside>
      </div>
    </div>
  );
}

function closingTip(result: DayResult, team: number): string {
  if (team < 40)
    return 'Tu equipo está agotado y atiende a menos clientes. Cuidar el ánimo también es cuidar las ventas.';
  if (result.order === result.best)
    return 'Tu pedido respondió a los datos: vendiste sin desperdiciar.';
  if (result.order > result.best)
    return 'Pediste por encima de lo que decían los datos: cada empanada sobrante es caja perdida.';
  return 'Te quedaste corto: hubo clientes que se fueron sin comprar. Revisa qué dato anticipaba más demanda.';
}

function OrderDesk({
  day,
  content,
  state,
  onOrder,
}: {
  day: MarketDay;
  content: MercadoContent;
  state: MarketState;
  onOrder: (quantity: number) => void;
}) {
  const [quantity, setQuantity] = useState<number | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const name = useId();
  useEffect(() => {
    heading.current?.focus();
  }, []);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (quantity !== null) onOrder(quantity);
      }}
    >
      <h2 ref={heading} tabIndex={-1} className="font-display text-xl font-extrabold outline-none">
        {day.title}: ¿cuántas encargas?
      </h2>
      <dl className="mt-3 grid gap-2 bg-plate-sunk p-4 plate-rule">
        {day.data.map((row) => (
          <div
            key={row.label}
            className="grid gap-x-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]"
          >
            <dt className="text-sm text-ink-soft">{row.label}</dt>
            <dd className="font-semibold">{row.value}</dd>
          </div>
        ))}
      </dl>
      <fieldset className="mt-5">
        <legend className="font-semibold">Pedido a la cocina</legend>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {day.orders.map((o) => {
            const ok = affordable(state, content, o);
            return (
              <label
                key={o}
                className={cx(
                  'flex min-h-16 cursor-pointer flex-col justify-center border-[1.5px] px-3 py-2',
                  'has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-(--focus)',
                  quantity === o
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
                  checked={quantity === o}
                  onChange={() => {
                    setQuantity(o);
                  }}
                />
                <span className="font-display text-2xl font-extrabold tabular-nums">{o}</span>
                <span
                  className={cx(
                    'text-xs tabular-nums',
                    quantity === o ? 'text-plate' : 'text-ink-soft',
                  )}
                >
                  {ok ? `cuesta ${money.format(o * content.product.cost)}` : 'no alcanza la caja'}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <Button type="submit" size="lg" className="mt-5" disabled={quantity === null}>
        Encargar a la cocina
      </Button>
    </form>
  );
}

function DayClose({
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
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  const read = result.order === result.best;
  return (
    <section aria-labelledby="cierre-jornada">
      <h2
        id="cierre-jornada"
        ref={heading}
        tabIndex={-1}
        className="font-display text-xl font-extrabold outline-none"
      >
        Cierre de la jornada
      </h2>
      <dl className="mt-3 grid grid-cols-2 gap-4 border-y-[1.5px] border-ink py-4 sm:grid-cols-4">
        <div>
          <dt className="text-sm text-ink-soft">Vendidas</dt>
          <dd className="font-display text-2xl font-extrabold tabular-nums">
            {result.sold} <span className="text-base font-bold">de {result.order}</span>
          </dd>
        </div>
        <div>
          <dt className="text-sm text-ink-soft">Sobrantes</dt>
          <dd className="font-display text-2xl font-extrabold tabular-nums">{result.waste}</dd>
        </div>
        <div>
          <dt className="text-sm text-ink-soft">Sin atender</dt>
          <dd className="font-display text-2xl font-extrabold tabular-nums">{result.missed}</dd>
        </div>
        <div>
          <dt className="text-sm text-ink-soft">Ganancia</dt>
          <dd className="font-display text-2xl font-extrabold tabular-nums">
            {signed(result.profit)}
          </dd>
        </div>
      </dl>
      <p
        role="status"
        className={cx(
          'mt-4 border-l-[3px] px-4 py-3',
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
      <Button size="lg" className="mt-5" onClick={onNext}>
        {last ? 'Cerrar la temporada' : 'Siguiente jornada'}
      </Button>
    </section>
  );
}

function Ledger({ queue, ledger }: { queue: MarketDay[]; ledger: DayResult[] }) {
  if (ledger.length === 0) return null;
  return (
    <div>
      <h3 className="font-display text-lg font-extrabold">Libro de cuentas</h3>
      <table className="mt-2 w-full text-sm tabular-nums">
        <caption className="sr-only">Pedido, ventas, sobrantes y ganancia de cada jornada</caption>
        <thead>
          <tr className="border-b-[1.5px] border-ink text-left">
            <th scope="col" className="py-1 pr-2 font-semibold">
              Jornada
            </th>
            <th scope="col" className="py-1 pr-2 text-right font-semibold">
              Pedido
            </th>
            <th scope="col" className="py-1 pr-2 text-right font-semibold">
              Vendidas
            </th>
            <th scope="col" className="py-1 text-right font-semibold">
              Ganancia
            </th>
          </tr>
        </thead>
        <tbody>
          {ledger.map((row, i) => (
            <tr key={row.dayId} className="border-b-[1px] border-plate-edge">
              <th scope="row" className="py-1 pr-2 text-left font-normal">
                {i + 1}. {queue.find((d) => d.id === row.dayId)?.title}
              </th>
              <td className="py-1 pr-2 text-right">{row.order}</td>
              <td className="py-1 pr-2 text-right">{row.sold}</td>
              <td className="py-1 text-right">{signed(row.profit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MarketReportView({
  content,
  queue,
  state,
  result,
  competency,
  back,
  onComplete,
  onRetry,
}: {
  content: MercadoContent;
  queue: MarketDay[];
  state: MarketState;
  result: MarketReport;
  competency: string;
  back: string;
  onComplete: () => void;
  onRetry: () => void;
}) {
  const days = state.ledger.length;
  const solid = state.ledger.filter((d) => d.quality === 1).length;
  const [brujula] = useState(() => {
    const parts: string[] = [];
    if (result.accuracy >= 0.75)
      parts.push(
        'Tus pedidos siguieron los datos: así se gestiona con información y no con corazonadas.',
      );
    else
      parts.push(
        'Varios pedidos se alejaron de lo que decían los datos. Antes de decidir, combina todas las cifras de la jornada.',
      );
    if (result.waste > 40)
      parts.push(
        `Se perdieron ${String(result.waste)} ${content.product.unit}: el sobrante es dinero que no vuelve.`,
      );
    if (result.criteria >= 0.75)
      parts.push(
        'En los dilemas cuidaste a tu equipo y a tus clientes: eso es liderar con propósito.',
      );
    else
      parts.push(
        'En los dilemas, busca la salida que cuide a la vez el negocio, las personas y la confianza.',
      );
    return {
      text: parts.join(' '),
      highlights: [
        `Jornadas con el pedido que mejor respondía a los datos: ${String(result.toolsUsed)} de ${String(days)}.`,
        `Decisiones de gestión sólidas: ${String(solid)} de ${String(days)}.`,
        `Ganancia promedio por jornada: ${money.format(result.averageProfit)}; meta: ${money.format(content.goal)}.`,
        `Unidades perdidas por sobrantes: ${String(result.waste)}.`,
        `Ánimo final del equipo: ${String(Math.round(state.team))} de 100. Reputación final: ${String(Math.round(state.reputation))} de 100.`,
      ],
    };
  });

  return (
    <GameReport
      title={
        result.averageProfit >= content.goal
          ? 'Una temporada bien llevada'
          : 'La temporada cierra con lecciones'
      }
      score={result.score}
      figures={[
        { label: 'Caja final', value: money.format(state.cash) },
        { label: 'Ganancia diaria', value: money.format(result.averageProfit) },
        { label: 'Pedidos acertados', value: `${String(result.toolsUsed)} de ${String(days)}` },
      ]}
      criteria={[
        {
          label: 'Decidiste los pedidos con los datos',
          met: result.accuracy >= 0.75,
          detail: 'Tendencias, clima, eventos y datos atípicos.',
        },
        { label: 'Lideraste con propósito en los dilemas', met: result.criteria >= 0.75 },
        {
          label: 'Alcanzaste la meta de ganancia diaria',
          met: result.averageProfit >= content.goal,
        },
        { label: 'Cuidaste el ánimo del equipo', met: state.team >= 60 },
      ]}
      brujula={brujula}
      game="Día de mercado"
      competency={competency}
      back={back}
      onComplete={onComplete}
      onRetry={onRetry}
    >
      <div className="mt-8">
        <Ledger queue={queue} ledger={state.ledger} />
      </div>
    </GameReport>
  );
}
