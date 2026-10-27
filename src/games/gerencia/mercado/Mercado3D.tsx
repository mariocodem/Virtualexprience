import { useFrame } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePreferences } from '@/a11y/preferences';
import { useReducedMotion } from '@/a11y/useReducedMotion';
import { minigameLevel } from '@/ai/adaptiveEngine';
import type { MercadoContent } from '@/data/contentSchemas';
import {
  currentDayId,
  isFinished,
  marketPlan,
  nextDay,
  placeOrder,
  report,
  resolveDay,
  selectDays,
  startMarket,
  type MarketDay,
  type MarketReport,
  type MarketState,
} from '@/minigames/dia-de-mercado/engine';
import { GameBriefing } from '@/minigames/shared/GameBriefing';
import { GameReport } from '@/minigames/shared/GameReport';
import type { MinigameProps } from '@/minigames/shared/types';
import { cx } from '@/ui/cx';
import { useProgress } from '@/progress/store';
import { useMastery } from '@/stations/useMastery';
import { Controls } from '../../shared/controls';
import { GameStage } from '../../shared/GameStage';
import { Banner } from '../../shared/hud';
import type { ControlHelp } from '../../shared/stage';
import { gerencia3d } from '../data/schema';
import { createQueue, finishQueue, planCustomers, type Queue, type Step } from './market3d';
import { CashBook, Chalkboard, DayClose, DilemmaCard, OrderPicker, ServingBar } from './MercadoHud';
import {
  Cargo,
  Customers,
  DayCycle,
  Dock,
  MarketCamera,
  Stall,
  Team,
  type Live,
  type MarketLive,
} from './MercadoScene';
import { money } from './format';
import { closingTip, seasonReading } from './report';

type Stage =
  | { kind: 'briefing' }
  | { kind: 'temporada'; queue: MarketDay[]; state: MarketState }
  | { kind: 'informe'; queue: MarketDay[]; state: MarketState; result: MarketReport };

const HELP: ControlHelp[] = [
  { keys: '1 a 4', action: 'Elegir la cantidad del pedido o la salida del dilema' },
  { keys: '← →', action: 'Cambiar la cantidad del pedido' },
  { keys: 'Enter', action: 'Encargar, abrir el puesto y seguir' },
  { keys: 'Esc o P', action: 'Pausa' },
];

const WORKERS = gerencia3d.team;

/**
 * Día de mercado en 3D (Gerencia+): el puesto de empanadas del muelle. Se
 * carga el pedido en cajas, el equipo trae el dilema, los clientes hacen fila
 * y lo que sobra queda en el mostrador; cada jornada amanece y anochece. Usa
 * el mismo motor y las mismas métricas que la versión accesible.
 */
export function Mercado3D({
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
  const setMode = usePreferences((s) => s.setGameMode);
  const [level] = useState(() => minigameLevel(mastery));
  const plan = marketPlan(level);
  const [stage, setStage] = useState<Stage>({ kind: 'briefing' });
  const [controls] = useState(() => new Controls());
  const live = useRef<MarketLive>({
    step: 'pedido',
    preview: 0,
    order: 0,
    queue: null,
    team: 60,
    messenger: false,
    speed: 1,
  });
  const [paused, setPaused] = useState(false);
  const [preview, setPreview] = useState<number | null>(null);
  const [decided, setDecided] = useState<MarketDay['dilemma']['options'][number] | null>(null);
  const [dayDone, setDayDone] = useState(false);
  const [book, setBook] = useState(false);
  const [counts, setCounts] = useState({ sold: 0, missed: 0, stock: 0 });
  const [announce, setAnnounce] = useState('');
  const [banner, setBanner] = useState<{ text: string; at: number } | null>(null);
  const chosen = useRef<string | null>(null);

  const season = stage.kind === 'temporada' ? stage : null;
  const day = season?.queue.find((d) => d.id === currentDayId(season.state)) ?? null;
  const step: Step = !season
    ? 'pedido'
    : season.state.phase === 'pedido'
      ? 'pedido'
      : season.state.phase === 'dilema'
        ? 'dilema'
        : dayDone
          ? 'cierre'
          : 'jornada';

  // La escena lee de aquí en cada cuadro.
  useEffect(() => {
    live.current.step = step;
    live.current.preview = preview ?? 0;
    live.current.order = season?.state.order ?? 0;
    live.current.team = season?.state.team ?? 60;
    live.current.messenger = step === 'dilema' && decided === null;
    live.current.speed = still ? 4 : 1;
  }, [live, step, preview, season?.state.order, season?.state.team, decided, still]);

  const begin = () => {
    const queue = selectDays(content.days, plan, Math.random);
    onBrujula(null);
    setPreview(null);
    setDecided(null);
    setDayDone(false);
    live.current.queue = null;
    setStage({ kind: 'temporada', queue, state: startMarket(content, queue) });
    if (queue[0]) announceDay(queue[0], 0);
    window.scrollTo({ top: 0 });
  };

  const update = useCallback((next: MarketState, queue: MarketDay[]) => {
    setStage({ kind: 'temporada', queue, state: next });
  }, []);

  const shout = (text: string) => {
    setBanner({ text, at: performance.now() });
  };

  const announceDay = (d: MarketDay, index: number) => {
    setAnnounce(
      `Jornada ${String(index + 1)}: ${d.title}. ${d.data.map((r) => `${r.label}: ${r.value}`).join('. ')}`,
    );
  };

  const order = (quantity: number) => {
    if (!season || !day) return;
    const next = placeOrder(season.state, content, day, quantity);
    if (next === season.state) return;
    setDecided(null);
    update(next, season.queue);
    setAnnounce(
      `Pedido de ${String(quantity)} ${content.product.unit}. Llega ${gerencia3d.team[1]?.name ?? 'tu ayudante'} con un problema.`,
    );
  };

  const decide = (optionId: string) => {
    if (!day || decided) return;
    const option = day.dilemma.options.find((o) => o.id === optionId);
    if (!option) return;
    chosen.current = option.id;
    record(day.tier, option.quality);
    setDecided(option);
  };

  const openStall = () => {
    if (!season || !day || !chosen.current) return;
    const next = resolveDay(season.state, content, day, chosen.current);
    const result = next.ledger.at(-1);
    chosen.current = null;
    if (!result) return;
    record(day.tier, result.order === result.best ? 1 : 0);
    onBrujula({ text: closingTip(result, next.team), source: 'local' });
    live.current.queue = createQueue(planCustomers(result), result.order);
    setCounts({ sold: 0, missed: 0, stock: result.order });
    setDayDone(false);
    update(next, season.queue);
    setAnnounce('El puesto abre y los clientes hacen fila.');
  };

  const onServed = useCallback(() => {
    setDayDone(true);
    const q = live.current.queue;
    if (q) setCounts({ sold: q.sold, missed: q.missed, stock: q.stock });
    setAnnounce(
      q
        ? `Se cierra la jornada: ${String(q.sold)} vendidas, ${String(q.stock)} sobrantes, ${String(q.missed)} sin atender.`
        : 'Se cierra la jornada.',
    );
  }, [live]);

  const skip = () => {
    const q = live.current.queue;
    if (q) finishQueue(q);
  };

  const next = () => {
    if (!season) return;
    const after = nextDay(season.state);
    onBrujula(null);
    setPreview(null);
    setDecided(null);
    setDayDone(false);
    live.current.queue = null;
    if (isFinished(after)) {
      const result = report(after, content);
      onEvents(
        recordMinigame('dia-de-mercado', {
          accuracy: result.accuracy,
          criteria: result.criteria,
          toolsUsed: result.toolsUsed,
        }),
      );
      if (result.score < 0.6) onFail(result.score);
      setStage({ kind: 'informe', queue: season.queue, state: after, result });
      window.scrollTo({ top: 0 });
    } else {
      update(after, season.queue);
      const upcoming = season.queue.find((d) => d.id === currentDayId(after));
      if (upcoming) announceDay(upcoming, after.index);
    }
  };

  // Teclas numéricas: cantidad del pedido o salida del dilema.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (paused || event.altKey || event.ctrlKey || event.metaKey) return;
      const index = ['1', '2', '3', '4'].indexOf(event.key);
      if (index < 0 || !day) return;
      if (!document.activeElement?.closest('[role="application"]')) return;
      if (step === 'pedido') {
        const option = day.orders[index];
        if (option === undefined || !season) return;
        if (option * content.product.cost > season.state.cash) {
          shout('No alcanza la caja para ese pedido');
          return;
        }
        event.preventDefault();
        setPreview(option);
      } else if (step === 'dilema' && !decided) {
        const option = day.dilemma.options[index];
        if (!option) return;
        event.preventDefault();
        decide(option.id);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
    };
  });

  const workers = useMemo(
    () =>
      [
        {
          id: WORKERS[0]?.id ?? 'a',
          shirt: WORKERS[0]?.shirt ?? '#d7262e',
          home: [-1.3, -0.5] as [number, number],
        },
        {
          id: WORKERS[1]?.id ?? 'b',
          shirt: WORKERS[1]?.shirt ?? '#4a5bb8',
          home: [1.5, -0.45] as [number, number],
        },
      ] as [
        { id: string; shirt: string; home: [number, number] },
        { id: string; shirt: string; home: [number, number] },
      ],
    [],
  );

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
          `Cada mañana lees la pizarra del puesto y eliges cuántas ${content.product.unit} encargar: verás las cajas apilarse en el muelle. Lo que no se vende se pierde.`,
          'Antes de abrir, alguien de tu equipo te trae un dilema. Mueve la caja, la reputación (que atrae o aleja clientes) y el ánimo del equipo (que define a cuántos alcanzan a atender).',
          'Después abre el puesto: los clientes hacen fila, compran y se van; quien no alcanza producto o atención se va sin comprar.',
          'Algunos datos engañan: un día atípico, un promedio que mezcla días distintos. Se evalúan los pedidos que responden a los datos, tus decisiones y la ganancia promedio.',
        ]}
        beginLabel="Abrir el puesto"
        onBegin={begin}
      />
    );
  }

  if (stage.kind === 'informe') {
    return (
      <MarketReport3D
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

  if (!season || !day) return null;
  const { state } = season;
  const today = state.phase === 'cierre' ? state.ledger.at(-1) : undefined;
  const last = state.index + 1 === season.queue.length;

  return (
    <GameStage
      label="Día de mercado: el puesto de empanadas del muelle"
      controls={controls}
      paused={paused}
      onPause={setPaused}
      help={HELP}
      announce={announce}
      onAccessible={() => {
        setMode('accesible');
      }}
      touch={false}
      camera={{ fov: 40, position: [1, 4.7, 12.7], near: 0.5, far: 200 }}
      hud={
        <>
          <div className="absolute top-3 left-3 grid gap-2 max-sm:top-14">
            <Chalkboard
              day={day}
              index={state.index}
              total={season.queue.length}
              sold={counts.sold}
              missed={counts.missed}
              stock={counts.stock}
              live={step === 'jornada' || step === 'cierre'}
            />
            <div className={cx('sm:hidden', (step === 'pedido' || step === 'dilema') && 'hidden')}>
              <CashBook
                state={state}
                queue={season.queue}
                open={book}
                onToggle={() => {
                  setBook((b) => !b);
                }}
              />
            </div>
          </div>
          <div className="absolute top-16 right-3 max-sm:hidden sm:top-[4.25rem]">
            <CashBook
              state={state}
              queue={season.queue}
              open={book}
              onToggle={() => {
                setBook((b) => !b);
              }}
            />
          </div>
          {banner && <Banner text={banner.text} at={banner.at} />}
          <div className="absolute inset-x-3 bottom-3 flex flex-col items-start gap-2 sm:bottom-4 sm:left-4">
            {step === 'pedido' && (
              <OrderPicker
                key={day.id}
                day={day}
                content={content}
                state={state}
                value={preview}
                onSelect={setPreview}
                onOrder={order}
              />
            )}
            {step === 'dilema' && (
              <DilemmaCard
                key={`${day.id}-dilema`}
                day={day}
                decided={decided}
                onDecide={decide}
                onContinue={openStall}
              />
            )}
            {step === 'jornada' && <ServingBar onSkip={skip} />}
            {step === 'cierre' && today && (
              <DayClose
                key={`${day.id}-cierre`}
                day={day}
                result={today}
                unit={content.product.unit}
                last={last}
                onNext={next}
              />
            )}
          </div>
        </>
      }
    >
      <DayCycle live={live} onDone={onServed} />
      <Dock />
      <Stall />
      <Cargo live={live} />
      <Customers live={live} />
      <Team live={live} workers={workers} still={still} />
      <MarketCamera still={still} />
      <Ticker live={live} onTick={setCounts} />
    </GameStage>
  );
}

/** Pasa al HUD, unas cuantas veces por segundo, lo que va pasando en la fila. */
function Ticker({
  live,
  onTick,
}: {
  live: Live;
  onTick: (counts: { sold: number; missed: number; stock: number }) => void;
}) {
  const acc = useRef(0);
  const last = useRef<Queue | null>(null);
  useFrame((_, dt) => {
    const q = live.current.queue;
    acc.current += dt;
    if (!q || (acc.current < 0.2 && last.current === q)) return;
    acc.current = 0;
    last.current = q;
    if (live.current.step === 'jornada') onTick({ sold: q.sold, missed: q.missed, stock: q.stock });
  });
  return null;
}

function MarketReport3D({
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
  const [brujula] = useState(() => seasonReading(state, result, content, (v) => money.format(v)));
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
        <h3 className="font-display text-lg font-extrabold">Libro de cuentas</h3>
        <table className="mt-2 w-full text-sm tabular-nums">
          <caption className="sr-only">
            Pedido, ventas, sobrantes y ganancia de cada jornada
          </caption>
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
            {state.ledger.map((row, i) => (
              <tr key={row.dayId} className="border-b-[1px] border-plate-edge">
                <th scope="row" className="py-1 pr-2 text-left font-normal">
                  {i + 1}. {queue.find((d) => d.id === row.dayId)?.title}
                </th>
                <td className="py-1 pr-2 text-right">{row.order}</td>
                <td className="py-1 pr-2 text-right">{row.sold}</td>
                <td className="py-1 text-right">
                  {row.profit >= 0 ? '+' : '−'}
                  {money.format(Math.abs(row.profit))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GameReport>
  );
}
