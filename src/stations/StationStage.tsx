import { A11yTrigger } from '@/a11y/A11yPanel';
import { lazy, Suspense, use, useCallback, useEffect, useState } from 'react';
import { usePreferences } from '@/a11y/preferences';
import { Link, useNavigate, useParams } from 'react-router';
import { findIsland, getStation, stationsOf, world } from '@/data';
import { loadStationContent } from '@/data/content';
import type { StationContent } from '@/data/contentSchemas';
import { ArenaHost } from '@/games/ArenaHost';
import { GameHost } from '@/games/GameHost';
import { hasWebGL2 } from '@/landing/webgl';
import { MinigameHost } from '@/minigames/MinigameHost';
import { nextStation, stationStatus } from '@/progress/selectors';
import { pickProgress, useProgress } from '@/progress/store';
import type { ProgressEvent } from '@/progress/types';
import { useAnnouncer } from '@/progress/useAnnouncer';
import type { Island, Station } from '@/types/domain';
import { ButtonLink } from '@/ui/ButtonLink';
import { cx } from '@/ui/cx';
import { IconArrowRight } from '@/ui/icons';
import { STATION_TYPE_LABEL } from '@/world/stationText';
import { AiBadge } from './AiBadge';
import { BrujulaBubble, type BrujulaMessage } from './BrujulaBubble';
import { CompletionCard } from './CompletionCard';
import { ExplorarStation } from './ExplorarStation';
import { PracticarStation } from './PracticarStation';
import { ReflexionarStation } from './ReflexionarStation';
import { StageBackdrop } from './StageBackdrop';

// Las estaciones se juegan en la plaza 3D de su isla; la versión accesible queda al lado.
const Explorar3D = lazy(() => import('@/games/stations/Explorar3D'));
const Practicar3D = lazy(() => import('@/games/stations/Practicar3D'));
const Reflexionar3D = lazy(() => import('@/games/stations/Reflexionar3D'));

/**
 * Escenario de una estación, a pantalla completa sobre la isla. La ruta
 * `/mundo/:isla/:estacion` decide qué estación; el contenido llega de
 * src/data/content y el componente de cada tipo lo hace jugable.
 */
export default function StationStage() {
  const { isla = '', estacion = '' } = useParams();
  const island = findIsland(isla);
  const station = getStation(estacion);
  if (!island || station?.islandId !== island.id) return <StageMissing island={island} />;
  return <Stage key={station.id} island={island} station={station} />;
}

interface Result {
  score: number;
  events: ProgressEvent[];
  epilogue?: string | undefined;
}

function Stage({ island, station }: { island: Island; station: Station }) {
  const navigate = useNavigate();
  const state = useProgress((s) => s);
  const progress = pickProgress(state);
  const announce = useAnnouncer();
  // El estado al llegar decide si se puede jugar; completar no debe cerrar el escenario.
  const [entry] = useState(() => stationStatus(progress, station));
  const [message, setMessage] = useState<BrujulaMessage | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const { startStation, completeStation, recordAttempt } = state;
  useEffect(() => {
    announce(startStation(station.id));
  }, [station.id, startStation, announce]);

  const back = `/mundo/${island.id}?estacion=${station.id}`;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      if (event.target instanceof HTMLTextAreaElement) return;
      void navigate(back);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
    };
  }, [navigate, back]);

  const complete = useCallback(
    (score: number, epilogue?: string) => {
      const events = completeStation(station.id, score);
      announce(events);
      setMessage(null);
      setResult({ score, events, epilogue });
      window.scrollTo({ top: 0 });
    },
    [completeStation, station.id, announce],
  );
  const fail = useCallback(
    (score: number) => {
      announce(recordAttempt(station.id, score));
    },
    [recordAttempt, station.id, announce],
  );

  const own = stationsOf(island.id);
  const order = own.findIndex((s) => s.id === station.id) + 1;
  const lit = progress.fragments.includes(island.id);
  const playable = entry !== 'bloqueada' && entry !== 'en-preparacion';
  const boss = station.type === 'desafio';
  // Los minijuegos y la Bruma necesitan la mesa ancha.
  const gameMode = usePreferences((s) => s.gameMode);
  const [webgl] = useState(hasWebGL2);
  // En 3D toda estación usa el ancho de un escenario de juego.
  const wide = boss || station.type === 'reto' || (webgl && gameMode === '3d');

  return (
    <div className="on-sea relative isolate min-h-svh overflow-hidden bg-sea-950 text-plate">
      <title>{`${station.title} · ${island.name} · Archipiélago VirtuX`}</title>
      <StageBackdrop island={island} lit={lit} />

      <header className="relative z-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 lg:px-8">
        <Link
          to={back}
          className="inline-flex min-h-11 items-center gap-2 font-display font-bold text-plate no-underline hover:text-land-sun"
        >
          <IconArrowRight size={18} className="rotate-180" />
          Volver al sendero
          <kbd className="ml-1 border border-sea-300 px-1.5 text-xs font-semibold text-sea-100">
            Esc
          </kbd>
        </Link>
        <p className="placename text-sm text-sea-100">
          {island.name} <span className="text-sea-300">·</span>{' '}
          <span className="tabular-nums">
            Estación {order} de {own.length}
          </span>
        </p>
        <div className="flex items-center gap-x-6">
          <AiBadge />
          <A11yTrigger tone="sea" />
        </div>
      </header>

      <div
        className={cx(
          'relative z-10 mx-auto grid gap-6 px-4 pb-16 lg:px-8',
          boss
            ? 'max-w-7xl'
            : wide
              ? 'max-w-7xl xl:grid-cols-[minmax(0,1fr)_18rem]'
              : 'max-w-6xl lg:grid-cols-[minmax(0,1fr)_18rem]',
        )}
      >
        {!playable ? (
          <Gate island={island} station={station} entry={entry} />
        ) : result ? (
          <article className="bg-plate p-6 text-ink [--focus:var(--route)] plate-rule lg:p-10">
            <CompletionCard
              island={island}
              station={station}
              score={result.score}
              events={result.events}
              next={nextStation(progress, world, island.id)}
              {...(result.epilogue ? { epilogue: result.epilogue } : {})}
            />
          </article>
        ) : (
          <Suspense fallback={<Loading />}>
            <StationBody
              island={island}
              station={station}
              promise={loadStationContent(station.id)}
              onBrujula={setMessage}
              onEvents={announce}
              onComplete={complete}
              onFail={fail}
              message={message}
            />
          </Suspense>
        )}

        {!boss && playable && (
          <BrujulaBubble
            message={message}
            className={cx(
              wide ? 'xl:sticky xl:top-6 xl:self-start' : 'lg:sticky lg:top-6 lg:self-start',
            )}
          />
        )}
      </div>
    </div>
  );
}

function StationBody({
  island,
  station,
  promise,
  message,
  onBrujula,
  onEvents,
  onComplete,
  onFail,
}: {
  island: Island;
  station: Station;
  promise: Promise<StationContent>;
  message: BrujulaMessage | null;
  onBrujula: (message: BrujulaMessage | null) => void;
  onEvents: (events: ProgressEvent[]) => void;
  onComplete: (score: number, epilogue?: string) => void;
  onFail: (score: number) => void;
}) {
  const content = use(promise);
  const retry = (score: number) => {
    onFail(score);
    onBrujula({
      text: `Lograste ${String(Math.round(score * 100))} %. Repasa las explicaciones y vuelve a intentarlo: cada ronda afina tu dominio.`,
      source: 'local',
    });
  };

  if (content.kind === 'desafio') {
    return (
      <ArenaHost
        island={island}
        station={station}
        content={content}
        message={message}
        onBrujula={onBrujula}
        onComplete={onComplete}
        onFail={onFail}
      />
    );
  }

  return (
    <article className="bg-plate p-6 text-ink [--focus:var(--route)] plate-rule lg:p-10">
      <p className="toponym text-xs text-ink-soft">{STATION_TYPE_LABEL[station.type]}</p>
      <h1 className="mt-2 display text-[clamp(2rem,1.4rem+2vw,3.25rem)]">{station.title}</h1>
      <p className="mt-3 max-w-[60ch] text-ink-soft">{station.summary}</p>
      <div className="mt-8 border-t-[1.5px] border-ink pt-6">
        {content.kind === 'explorar' && (
          <GameHost
            accessible={
              <ExplorarStation
                content={content}
                island={island}
                onBrujula={onBrujula}
                onEvents={onEvents}
                onComplete={onComplete}
              />
            }
            immersive={
              <Explorar3D
                content={content}
                island={island}
                onBrujula={onBrujula}
                onEvents={onEvents}
                onComplete={onComplete}
              />
            }
          />
        )}
        {content.kind === 'practicar' && (
          <GameHost
            accessible={
              <PracticarStation
                content={content}
                island={island}
                onBrujula={onBrujula}
                onComplete={onComplete}
                onFail={retry}
              />
            }
            immersive={
              <Practicar3D
                content={content}
                island={island}
                onBrujula={onBrujula}
                onComplete={onComplete}
                onFail={retry}
              />
            }
          />
        )}
        {content.kind === 'reflexionar' && (
          <GameHost
            accessible={
              <ReflexionarStation
                stationId={station.id}
                content={content}
                onEvents={onEvents}
                onComplete={onComplete}
              />
            }
            immersive={
              <Reflexionar3D
                stationId={station.id}
                content={content}
                island={island}
                onEvents={onEvents}
                onComplete={onComplete}
              />
            }
          />
        )}
        {content.kind === 'reto' && (
          <MinigameHost
            content={content}
            island={island}
            onBrujula={onBrujula}
            onEvents={onEvents}
            onComplete={onComplete}
            onFail={onFail}
          />
        )}
      </div>
    </article>
  );
}

function Loading() {
  return (
    <p role="status" className="py-24 text-center toponym text-sm text-sea-100">
      Izando velas…
    </p>
  );
}

function Gate({
  island,
  station,
  entry,
}: {
  island: Island;
  station: Station;
  entry: ReturnType<typeof stationStatus>;
}) {
  const pending = station.requires
    .map((id) => getStation(id))
    .filter((s): s is Station => s !== undefined);
  return (
    <article className="bg-plate p-6 text-ink [--focus:var(--route)] plate-rule lg:p-10">
      <p className="toponym text-xs text-ink-soft">{STATION_TYPE_LABEL[station.type]}</p>
      <h1 className="mt-2 display text-[clamp(2rem,1.4rem+2vw,3.25rem)]">{station.title}</h1>
      {entry === 'en-preparacion' ? (
        <p className="mt-4 max-w-[60ch]">
          Esta estación forma parte de una expedición en preparación y se abrirá en una próxima
          temporada.
        </p>
      ) : (
        <p className="mt-4 max-w-[60ch]">
          El sendero aún no llega hasta aquí. Completa antes{' '}
          {pending.map((s, i) => (
            <span key={s.id}>
              {i > 0 && ' y '}«{s.title}»
            </span>
          ))}
          .
        </p>
      )}
      <ButtonLink to={`/mundo/${island.id}?estacion=${station.id}`} className="mt-6">
        Volver al sendero
      </ButtonLink>
    </article>
  );
}

function StageMissing({ island }: { island: Island | undefined }) {
  return (
    <div className="on-sea grid min-h-svh place-items-center bg-sea-950 p-6 text-plate">
      <article className="max-w-lg bg-plate p-8 text-ink [--focus:var(--route)] plate-rule">
        <h1 className="display text-3xl">Esa estación no está en la carta</h1>
        <p className="mt-3 text-ink-soft">
          La dirección no corresponde a ninguna estación de{' '}
          {island ? island.name : 'el archipiélago'}.
        </p>
        <ButtonLink to={island ? `/mundo/${island.id}` : '/mundo'} className="mt-5">
          {island ? `Volver a ${island.name}` : 'Volver a la carta'}
        </ButtonLink>
      </article>
    </div>
  );
}
