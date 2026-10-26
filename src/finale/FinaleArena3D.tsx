import { lazy, Suspense, useRef, useState } from 'react';
import { usePreferences } from '@/a11y/preferences';
import { useReducedMotion } from '@/a11y/useReducedMotion';
import { INITIAL_MASTERY, tierDifficulty, updateMastery } from '@/ai/adaptiveEngine';
import { finaleLevel, finalePlan, tierFor, type FinalePlan, type FormKey } from '@/boss/finale';
import { getIsland, world } from '@/data';
import type { BossContent, FinaleContent } from '@/data/contentSchemas';
import { arenaFor } from '@/games/arenas';
import { brumaTint } from '@/games/shared/palette';
import type { ArenaResult, Decision } from '@/games/types';
import { useProgress } from '@/progress/store';
import type { ProgressEvent } from '@/progress/types';
import { BrumaCreature } from '@/stations/boss/BrumaCreature';
import { BrujulaBubble, type BrujulaMessage } from '@/stations/BrujulaBubble';
import { Button } from '@/ui/Button';
import { ButtonLink } from '@/ui/ButtonLink';
import { ATLAS, ISLE } from '@/world/palette';

const ISLANDS = world.islands.map((i) => i.id);
const HeartArena = lazy(async () => ({
  default: (await import('@/games/shared/QuizArena')).QuizArena,
}));

/** Luces por forma: cada una es un combate corto. */
const FORM_LIGHTS = 4;
const HEART_LIGHTS = 5;

const rgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

type Stage = 'cartela' | 'transicion' | 'combate' | 'retirada' | 'victoria';

/** La Gran Bruma con la forma de una isla, como contenido de arena. */
function formContent(content: FinaleContent, form: FormKey): BossContent {
  const { bruma } = content;
  const shape =
    form === 'corazon'
      ? { name: content.heart.name, taunt: content.heart.taunt, items: content.heart.items }
      : (() => {
          const f = content.forms.find((x) => x.island === form);
          if (!f) throw new Error(`La Gran Bruma no tiene la forma de ${form}.`);
          return f;
        })();
  return {
    kind: 'desafio',
    bruma: {
      name: `${bruma.name} · ${shape.name}`,
      nature: bruma.nature,
      intro: shape.taunt,
      victory: bruma.victory,
      defeat: 'release' in shape ? shape.release : bruma.defeat,
      taunts: {
        phase1: [shape.taunt],
        phase2: bruma.taunts.miss,
        phase3: bruma.taunts.miss,
        hit: bruma.taunts.hit,
        miss: bruma.taunts.miss,
      },
    },
    items: shape.items,
  };
}

/**
 * El Gran Reto en 3D: la Gran Bruma toma, una tras otra, la forma de cada isla
 * y se la enfrenta con la mecánica de esa isla, en un combate corto; al final
 * llega su corazón, que combina todas. La versión accesible es FinaleBattle.
 */
export function FinaleArena3D({
  content,
  onEvents,
}: {
  content: FinaleContent;
  onEvents: (events: ProgressEvent[]) => void;
}) {
  const still = useReducedMotion();
  const calm = usePreferences((s) => s.calmPace);
  const setCalm = usePreferences((s) => s.setCalmPace);
  const setMode = usePreferences((s) => s.setGameMode);
  const setMastery = useProgress((s) => s.setMastery);
  const recordFinale = useProgress((s) => s.recordFinale);
  const [plan] = useState<FinalePlan>(() =>
    finalePlan(finaleLevel(useProgress.getState().mastery, ISLANDS)),
  );
  const order: FormKey[] = [...content.forms.map((f) => f.island), 'corazon'];
  const [index, setIndex] = useState(0);
  const [stage, setStage] = useState<Stage>('cartela');
  const [run, setRun] = useState(0);
  const [message, setMessage] = useState<BrujulaMessage | null>(null);
  const [victory, setVictory] = useState<{
    events: ProgressEvent[];
    tally: Map<FormKey, { correct: number; total: number }>;
    accuracy: number;
  } | null>(null);
  const tally = useRef(new Map<FormKey, { correct: number; total: number }>());
  const attempts = useRef(new Map<string, number>());

  const form = order[index] ?? 'corazon';
  const total = () =>
    [...tally.current.values()].reduce(
      (sum, t) => ({ correct: sum.correct + t.correct, total: sum.total + t.total }),
      { correct: 0, total: 0 },
    );
  const accuracy = () => {
    const t = total();
    return t.total === 0 ? 0 : t.correct / t.total;
  };

  const decide = (d: Decision) => {
    const entry = tally.current.get(form) ?? { correct: 0, total: 0 };
    tally.current.set(form, {
      correct: entry.correct + (d.correct ? 1 : 0),
      total: entry.total + 1,
    });
    for (const island of form === 'corazon' ? ISLANDS : [form]) {
      const current = useProgress.getState().mastery[island] ?? INITIAL_MASTERY;
      const n = attempts.current.get(island) ?? 0;
      setMastery(island, updateMastery(current, tierDifficulty(d.tier), d.correct ? 1 : 0, n + 4));
      attempts.current.set(island, n + 1);
    }
  };

  const end = (result: ArenaResult) => {
    setMessage(null);
    if (result.outcome === 'retirada') {
      onEvents(recordFinale(accuracy(), false));
      setStage('retirada');
      return;
    }
    if (index + 1 >= order.length) {
      const won = recordFinale(accuracy(), true);
      onEvents(won);
      setVictory({ events: won, tally: new Map(tally.current), accuracy: accuracy() });
      setStage('victoria');
      return;
    }
    setIndex(index + 1);
    setStage('transicion');
  };

  const fight = () => {
    setRun((n) => n + 1);
    setStage('combate');
  };

  const restart = () => {
    tally.current.clear();
    setIndex(0);
    setStage('cartela');
  };

  const mastery =
    form === 'corazon' ? 0.75 : (useProgress.getState().mastery[form] ?? INITIAL_MASTERY);
  const base = tierFor(form, 0, mastery);
  const tiers = [base, Math.min(3, base + 1), 3] as [1 | 2 | 3, 1 | 2 | 3, 1 | 2 | 3];
  const shared = {
    content: formContent(content, form),
    level: plan.level,
    goal: form === 'corazon' ? plan.heartHits : plan.hitsPerForm,
    lights: form === 'corazon' ? HEART_LIGHTS : FORM_LIGHTS,
    tiers,
    calm,
    still,
    onBrujula: setMessage,
    onDecision: decide,
    onEnd: end,
    onAccessible: () => {
      setMode('accesible');
    },
  };
  const name =
    form === 'corazon'
      ? content.heart.name
      : (content.forms.find((f) => f.island === form)?.name ?? '');
  const where = form === 'corazon' ? 'Las seis competencias' : getIsland(form).name;
  const Arena = form === 'corazon' ? null : arenaFor(form).Component;

  return (
    <section aria-labelledby="gran-bruma-3d" className="grid gap-5">
      <div>
        <p className="toponym text-xs text-sea-100">
          Gran Reto Integrador · Forma {Math.min(index + 1, order.length)} de {order.length} · Nivel{' '}
          {plan.level} de 5
        </p>
        <h1
          id="gran-bruma-3d"
          className="mt-2 display text-[clamp(2rem,1.4rem+2vw,3.25rem)] text-plate"
        >
          {content.bruma.name}
        </h1>
        <ol className="mt-3 grid max-w-xl grid-cols-7 gap-1" aria-label="Formas de la Gran Bruma">
          {order.map((f, i) => (
            <li
              key={f}
              className="h-2.5"
              style={{
                background:
                  i < index || stage === 'victoria'
                    ? f === 'corazon'
                      ? ATLAS.sun
                      : ISLE[f]
                    : ATLAS.sea[4],
              }}
            >
              <span className="sr-only">
                {f === 'corazon' ? content.heart.name : getIsland(f).name}:{' '}
                {i < index || stage === 'victoria'
                  ? 'disipada'
                  : i === index
                    ? 'en curso'
                    : 'pendiente'}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {stage === 'combate' ? (
        <Suspense
          fallback={
            <p role="status" className="py-24 text-center toponym text-sm text-sea-100">
              La Gran Bruma cambia de forma…
            </p>
          }
        >
          {Arena ? (
            <Arena
              key={`${String(index)}-${String(run)}`}
              island={getIsland(form as Exclude<FormKey, 'corazon'>)}
              {...shared}
            />
          ) : (
            <HeartArena
              key={`corazon-${String(run)}`}
              island={getIsland(ISLANDS[0] ?? 'comunicarte')}
              theme={{ tint: brumaTint('corazon'), rim: ATLAS.sun }}
              {...shared}
            />
          )}
        </Suspense>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div>
            <BrumaCreature
              density={stage === 'victoria' ? 0 : 1 - index / order.length}
              phase={index < 3 ? 1 : index < 5 ? 2 : 3}
              tint={rgb(brumaTint(form))}
              eyes={Math.max(0, order.length - 1 - index)}
              pulse={null}
              still={still}
              className="mx-auto block aspect-[4/3] w-full max-w-lg"
            />
          </div>
          <article className="bg-plate p-6 text-ink [--focus:var(--route)] plate-rule lg:p-8">
            {stage === 'cartela' && (
              <>
                <h2 className="font-display text-2xl font-extrabold">Antes de enfrentarla</h2>
                <p className="mt-2 max-w-[60ch] text-ink-soft">{content.bruma.nature}</p>
                <ul className="mt-4 max-w-[62ch] list-disc space-y-1 pl-5 text-sm">
                  <li>
                    La Gran Bruma toma la forma de cada isla: la enfrentas con la mecánica de esa
                    isla, en un combate corto.
                  </li>
                  <li>Al final llega su corazón, que combina las seis competencias.</li>
                  <li>
                    Si te retiras en una forma, puedes reintentarla sin perder las que ya disipaste.
                  </li>
                </ul>
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
                      Ataques más lentos y la linterna ayuda a apuntar.
                    </span>
                  </span>
                </label>
                <Button size="lg" className="mt-6" onClick={fight}>
                  Enfrentar a la Gran Bruma
                </Button>
              </>
            )}
            {stage === 'transicion' && (
              <>
                <p className="toponym text-xs text-ink-soft">Disipaste una forma</p>
                <h2 className="mt-1 font-display text-2xl font-extrabold">
                  Ahora toma la forma de {name}
                </h2>
                <p className="mt-2 text-ink-soft">{where}</p>
                <blockquote className="mt-4 border-l-[3px] border-sea-700 pl-4 italic">
                  {formContent(content, form).bruma.intro}
                </blockquote>
                <Button size="lg" className="mt-6" onClick={fight}>
                  Seguir el combate
                </Button>
              </>
            )}
            {stage === 'retirada' && (
              <>
                <h2 className="font-display text-2xl font-extrabold">
                  La Gran Bruma te obligó a retirarte
                </h2>
                <p className="mt-2 max-w-[60ch] text-ink-soft">
                  Caíste en «{name}» ({where}). Las formas que ya disipaste siguen disipadas.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button size="lg" onClick={fight}>
                    Reintentar esta forma
                  </Button>
                  <Button size="lg" variant="secondary" onClick={restart}>
                    Empezar de nuevo
                  </Button>
                </div>
              </>
            )}
            {stage === 'victoria' && victory && (
              <FinaleVictory content={content} order={order} {...victory} />
            )}
          </article>
        </div>
      )}
      <BrujulaBubble message={message} className="max-w-xl" />
    </section>
  );
}

function FinaleVictory({
  content,
  order,
  tally,
  events,
  accuracy,
}: {
  content: FinaleContent;
  order: FormKey[];
  tally: Map<FormKey, { correct: number; total: number }>;
  events: ProgressEvent[];
  accuracy: number;
}) {
  const xp = events.reduce((sum, e) => (e.type === 'xp' ? sum + e.amount : sum), 0);
  const badges = events.flatMap((e) =>
    e.type === 'badge' ? (world.badges.find((b) => b.id === e.badgeId) ?? []) : [],
  );
  return (
    <section aria-labelledby="faro-3d-encendido">
      <p className="toponym text-xs text-ink-soft">La Gran Bruma se disipa</p>
      <h2 id="faro-3d-encendido" className="mt-2 display text-[clamp(1.75rem,1.3rem+1.6vw,2.6rem)]">
        El Faro Minuto vuelve a brillar
      </h2>
      <blockquote className="mt-4 border-l-[3px] border-sea-700 pl-4 text-ink-soft italic">
        {content.epilogue}
      </blockquote>
      <dl className="mt-5 grid grid-cols-2 gap-4 border-y-[1.5px] border-ink py-4">
        <div>
          <dt className="text-sm text-ink-soft">Resultado</dt>
          <dd className="font-display text-3xl font-extrabold tabular-nums">
            {Math.round(accuracy * 100)} %
          </dd>
        </div>
        <div>
          <dt className="text-sm text-ink-soft">Experiencia</dt>
          <dd className="font-display text-3xl font-extrabold tabular-nums">
            {xp > 0 ? `+${String(xp)}` : '—'} <span className="text-base">XP</span>
          </dd>
        </div>
      </dl>
      <h3 className="mt-6 font-display text-lg font-bold">Tu luz por competencia</h3>
      <ul className="mt-2 grid gap-2 sm:grid-cols-2">
        {order.map((f) => {
          const t = tally.get(f) ?? { correct: 0, total: 0 };
          return (
            <li
              key={f}
              className="border-l-[3px] bg-plate-sunk px-3 py-2 text-sm"
              style={{ borderColor: f === 'corazon' ? ATLAS.sun : ISLE[f] }}
            >
              <span className="font-semibold">
                {f === 'corazon' ? content.heart.name : getIsland(f).name}
              </span>
              <span className="block tabular-nums">
                {t.correct} de {t.total} decisiones acertadas
              </span>
            </li>
          );
        })}
      </ul>
      {badges.length > 0 && (
        <p className="mt-4 text-sm">
          <span className="font-semibold">Insignias:</span> {badges.map((b) => b.name).join(', ')}.
        </p>
      )}
      <ButtonLink to="/mundo?faro=1" size="lg" className="mt-6">
        Ver el faro encendido
      </ButtonLink>
    </section>
  );
}
