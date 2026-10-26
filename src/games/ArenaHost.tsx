import { Suspense, useState } from 'react';
import { usePreferences } from '@/a11y/preferences';
import { useReducedMotion } from '@/a11y/useReducedMotion';
import { bossConfig, bossLevel } from '@/ai/adaptiveEngine';
import type { BossContent } from '@/data/contentSchemas';
import { hasWebGL2 } from '@/landing/webgl';
import { useProgress } from '@/progress/store';
import { BossBattle } from '@/stations/boss/BossBattle';
import { BrumaCreature } from '@/stations/boss/BrumaCreature';
import { BrujulaBubble, type BrujulaMessage } from '@/stations/BrujulaBubble';
import { useMastery } from '@/stations/useMastery';
import type { Island, Station } from '@/types/domain';
import { Button } from '@/ui/Button';
import { ButtonLink } from '@/ui/ButtonLink';
import { ModeSwitch } from './ModeSwitch';
import { arenaFor } from './arenas';
import { ARENA_HELP } from './shared/stage';
import type { ArenaEntry, ArenaResult } from './types';

interface Props {
  island: Island;
  station: Station;
  content: BossContent;
  message: BrujulaMessage | null;
  onBrujula: (message: BrujulaMessage | null) => void;
  onComplete: (score: number, epilogue?: string) => void;
  onFail: (score: number) => void;
}

/**
 * Desafío de isla: la arena 3D contra su Bruma, o su versión accesible de
 * embates. La dificultad sale del mismo motor adaptativo en ambas.
 */
export function ArenaHost(props: Props) {
  const mode = usePreferences((s) => s.gameMode);
  const [webgl] = useState(hasWebGL2);
  const entry = arenaFor(props.island.id);

  if (!webgl || mode === 'accesible') {
    return (
      <div className="grid gap-4">
        <ModeSwitch
          onSea
          available={webgl}
          reason="Este navegador no puede mostrar 3D: se juega la versión accesible."
        />
        <BossBattle {...props} />
      </div>
    );
  }
  return <ArenaFlow {...props} entry={entry} />;
}

function ArenaFlow({
  island,
  station,
  content,
  message,
  onBrujula,
  onComplete,
  onFail,
  entry,
}: Props & { entry: ArenaEntry }) {
  const still = useReducedMotion();
  const calm = usePreferences((s) => s.calmPace);
  const setCalm = usePreferences((s) => s.setCalmPace);
  const setMode = usePreferences((s) => s.setGameMode);
  const { mastery, record } = useMastery(island.id);
  const defeated = useProgress((s) => s.fragments.filter((id) => id !== island.id).length);
  const [plan] = useState(() => bossConfig(bossLevel(defeated, mastery)));
  const [stage, setStage] = useState<'cartela' | 'combate' | 'retirada'>('cartela');
  const [run, setRun] = useState(0);
  const [last, setLast] = useState<ArenaResult | null>(null);

  const play = () => {
    setRun((n) => n + 1);
    setStage('combate');
    onBrujula(null);
  };

  const end = (result: ArenaResult) => {
    if (result.outcome === 'victoria') {
      onComplete(result.accuracy, content.bruma.defeat);
      return;
    }
    onFail(result.accuracy);
    setLast(result);
    setStage('retirada');
  };

  const Arena = entry.Component;

  return (
    <section aria-labelledby="arena-titulo" className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="toponym text-xs text-sea-100">
            Desafío de isla · {entry.verb} · Nivel {plan.level} de 5
          </p>
          <h1
            id="arena-titulo"
            className="mt-2 display text-[clamp(2rem,1.4rem+2vw,3.25rem)] text-plate"
          >
            {station.title}
          </h1>
        </div>
        <ModeSwitch onSea available />
      </div>

      {stage === 'combate' ? (
        <Suspense
          fallback={
            <p role="status" className="py-24 text-center toponym text-sm text-sea-100">
              La niebla se espesa…
            </p>
          }
        >
          <Arena
            key={run}
            island={island}
            content={content}
            level={plan.level}
            goal={plan.hitsToWin}
            lights={plan.lights + 2}
            tiers={plan.tiers}
            calm={calm}
            still={still}
            onBrujula={onBrujula}
            onDecision={(d) => {
              record(d.tier, d.correct ? 1 : 0);
            }}
            onEnd={end}
            onAccessible={() => {
              setMode('accesible');
            }}
          />
        </Suspense>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div>
            <BrumaCreature
              density={1}
              phase={1}
              pulse={null}
              still={still}
              className="mx-auto block aspect-[4/3] w-full max-w-lg"
            />
            <p className="-mt-6 max-w-lg text-lg text-plate italic">«{content.bruma.intro}»</p>
            <p className="mt-1 text-sm text-sea-100">— {content.bruma.name}</p>
          </div>
          <article className="bg-plate p-6 text-ink [--focus:var(--route)] plate-rule lg:p-8">
            {stage === 'retirada' && last ? (
              <>
                <h2 className="font-display text-2xl font-extrabold">
                  La Bruma te obligó a retirarte
                </h2>
                <p className="mt-2 max-w-[60ch] text-ink-soft">
                  Acertaste {Math.round(last.accuracy * 100)} % de tus decisiones ({last.decisions}{' '}
                  {last.decisions === 1 ? 'decisión' : 'decisiones'}). Cada acierto carga tu
                  linterna: piensa antes de elegir y esquiva mientras cargas.
                </p>
              </>
            ) : (
              <>
                <h2 className="font-display text-2xl font-extrabold">Antes de enfrentarla</h2>
                <p className="mt-2 max-w-[60ch] text-ink-soft">{content.bruma.nature}</p>
              </>
            )}
            <dl className="mt-5 grid grid-cols-2 gap-4 border-y-[1.5px] border-ink py-4 sm:grid-cols-3">
              <div>
                <dt className="text-sm text-ink-soft">Golpes de luz</dt>
                <dd className="font-display text-xl font-extrabold tabular-nums">
                  {plan.hitsToWin}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-ink-soft">Tu luz</dt>
                <dd className="font-display text-xl font-extrabold tabular-nums">
                  {plan.lights + 2}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-ink-soft">Mecánica</dt>
                <dd className="font-display text-base font-extrabold">{entry.verb}</dd>
              </div>
            </dl>
            <ul className="mt-4 max-w-[62ch] list-disc space-y-1 pl-5 text-sm">
              {entry.howTo.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <details className="mt-3 text-sm">
              <summary className="min-h-11 cursor-pointer font-semibold">Controles</summary>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                {ARENA_HELP.map((h) => (
                  <div key={h.keys} className="contents">
                    <dt className="font-semibold">{h.keys}</dt>
                    <dd>{h.action}</dd>
                  </div>
                ))}
              </dl>
            </details>
            <label className="mt-4 flex max-w-[60ch] cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={calm}
                onChange={(event) => {
                  setCalm(event.target.checked);
                }}
                className="mt-1 size-4 accent-ink"
              />
              <span>
                <span className="font-semibold">Ritmo tranquilo.</span>{' '}
                <span className="text-ink-soft">
                  Ataques más lentos y espaciados, y la linterna ayuda a apuntar.
                </span>
              </span>
            </label>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button size="lg" onClick={play}>
                {stage === 'retirada' ? 'Volver a enfrentarla' : 'Enfrentar a la Bruma'}
              </Button>
              {stage === 'retirada' && (
                <ButtonLink
                  to={`/mundo/${island.id}?estacion=${station.id}`}
                  size="lg"
                  variant="secondary"
                >
                  Repasar en el sendero
                </ButtonLink>
              )}
            </div>
          </article>
        </div>
      )}
      <BrujulaBubble message={message} className="max-w-xl" />
    </section>
  );
}
