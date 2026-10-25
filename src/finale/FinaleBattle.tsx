import { useEffect, useEffectEvent, useId, useRef, useState } from 'react';
import {
  INITIAL_MASTERY,
  shouldOfferHint,
  tierDifficulty,
  updateMastery,
} from '@/ai/adaptiveEngine';
import { aiFeedback, localFeedback, pick } from '@/ai/brujula';
import { useReducedMotion } from '@/a11y/useReducedMotion';
import {
  answerFinale,
  finaleAccuracy,
  finaleDensity,
  finaleLevel,
  finalePlan,
  formKey,
  hitsNeeded,
  itemsOf,
  startFinale,
  type FinaleEvent,
  type FinalePlan,
  type FinaleState,
  type FormKey,
} from '@/boss/finale';
import { getIsland, world } from '@/data';
import type { FinaleContent } from '@/data/contentSchemas';
import { useProgress } from '@/progress/store';
import type { ProgressEvent } from '@/progress/types';
import { BrujulaBubble, type BrujulaMessage } from '@/stations/BrujulaBubble';
import { BrumaCreature, type BrumaPulse } from '@/stations/boss/BrumaCreature';
import { Embate } from '@/stations/boss/Embate';
import { EMBATE_KEYS } from '@/stations/boss/keys';
import { Button } from '@/ui/Button';
import { cx } from '@/ui/cx';
import type { IslandId } from '@/types/domain';
import { ISLE } from '@/world/palette';
import { FinaleReport } from './FinaleReport';

const HINTS = 3;
const ISLANDS = world.islands.map((i) => i.id);

/** Jirones de la Gran Bruma: el gris de la niebla teñido por la isla cuya forma toma. */
function tintOf(form: FormKey | null): readonly [number, number, number] {
  if (!form || form === 'corazon') return [150, 140, 200];
  const hex = ISLE[form];
  const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const fog = [196, 210, 224];
  return [0, 1, 2].map((i) => Math.round(((rgb[i] ?? 0) + (fog[i] ?? 0) * 1.4) / 2.4)) as [
    number,
    number,
    number,
  ];
}

const formName = (content: FinaleContent, form: FormKey | null) =>
  !form
    ? ''
    : form === 'corazon'
      ? content.heart.name
      : (content.forms.find((f) => f.island === form)?.name ?? '');

const formTaunt = (content: FinaleContent, form: FormKey | null) =>
  !form
    ? content.bruma.intro
    : form === 'corazon'
      ? content.heart.taunt
      : (content.forms.find((f) => f.island === form)?.taunt ?? '');

interface Ending {
  kind: 'victoria' | 'retirada';
  state: FinaleState;
  events: ProgressEvent[];
}

/**
 * Batalla contra la Gran Bruma. Cada forma es la de una isla y su embate pide
 * esa competencia en una situación común (la Noche del Faro); el corazón las
 * combina todas. La luz son los seis fragmentos.
 */
export function FinaleBattle({
  content,
  onEvents,
}: {
  content: FinaleContent;
  onEvents: (events: ProgressEvent[]) => void;
}) {
  const still = useReducedMotion();
  const random = useRef(Math.random).current;
  const setMastery = useProgress((s) => s.setMastery);
  const recordFinale = useProgress((s) => s.recordFinale);
  const [plan] = useState<FinalePlan>(() =>
    finalePlan(finaleLevel(useProgress.getState().mastery, ISLANDS)),
  );
  const attempts = useRef(new Map<IslandId, number>());

  const [battle, setBattle] = useState<FinaleState | null>(null);
  const [feedback, setFeedback] = useState<FinaleEvent | null>(null);
  const [ending, setEnding] = useState<Ending | null>(null);
  const [untimed, setUntimed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(plan.seconds);
  const [hints, setHints] = useState(HINTS);
  const [hidden, setHidden] = useState<string[]>([]);
  const [pulse, setPulse] = useState<BrumaPulse | null>(null);
  const [line, setLine] = useState(content.bruma.intro);
  const [message, setMessage] = useState<BrujulaMessage | null>(null);

  // Cada embate afina el dominio de la competencia de su isla; el corazón, el de todas.
  // Llega tras toda la ruta: el paso es corto, afina la estimación sin rehacerla.
  const record = (form: FormKey, tier: 1 | 2 | 3, outcome: number) => {
    const islands = form === 'corazon' ? ISLANDS : [form];
    for (const island of islands) {
      const current = useProgress.getState().mastery[island] ?? INITIAL_MASTERY;
      const n = attempts.current.get(island) ?? 0;
      setMastery(island, updateMastery(current, tierDifficulty(tier), outcome, n + 4));
      attempts.current.set(island, n + 1);
    }
  };

  const begin = () => {
    const state = startFinale(content, plan, useProgress.getState().mastery, random);
    setBattle(state);
    setEnding(null);
    setFeedback(null);
    setHidden([]);
    setHints(HINTS);
    setTimeLeft(plan.seconds);
    setMessage(null);
    setLine(formTaunt(content, formKey(state)));
  };

  const respond = (optionId: string | null) => {
    if (!battle || feedback || battle.outcome !== 'en-curso') return;
    const { state, event } = answerFinale(
      battle,
      content,
      useProgress.getState().mastery,
      optionId,
      random,
    );
    record(event.form, event.item.tier, event.correct ? 1 : 0);
    setBattle(state);
    setFeedback(event);
    setHidden([]);
    setPulse({ kind: event.correct ? 'acierto' : 'fallo', at: performance.now() });
    setLine(
      event.outcome === 'victoria'
        ? content.bruma.defeat
        : event.outcome === 'retirada'
          ? content.bruma.victory
          : event.formCleared && event.formCleared !== 'corazon'
            ? (content.forms.find((f) => f.island === event.formCleared)?.release ?? '')
            : pick(event.correct ? content.bruma.taunts.hit : content.bruma.taunts.miss, random),
    );

    const local = localFeedback(event.item, optionId);
    setMessage({ text: local.tip, source: 'local' });
    const competency =
      event.form === 'corazon'
        ? 'Las seis competencias del archipiélago'
        : getIsland(event.form).competency;
    void aiFeedback(event.item, optionId, competency).then((output) => {
      if (output) {
        setMessage({ text: [output.feedback, output.tip].filter(Boolean).join(' '), source: 'ia' });
      }
    });
  };

  const proceed = () => {
    if (!battle || !feedback) return;
    if (battle.outcome !== 'en-curso') {
      const won = battle.outcome === 'victoria';
      const events = recordFinale(finaleAccuracy(battle), won);
      onEvents(events);
      setEnding({ kind: won ? 'victoria' : 'retirada', state: battle, events });
      setBattle(null);
      setFeedback(null);
      return;
    }
    if (feedback.formCleared) setLine(formTaunt(content, formKey(battle)));
    setFeedback(null);
    setTimeLeft(plan.seconds);
    setMessage(null);
  };

  const running = battle !== null && battle.outcome === 'en-curso' && !feedback && !untimed;
  const tick = useEffectEvent(() => {
    if (timeLeft <= 1) {
      setTimeLeft(0);
      respond(null);
    } else {
      setTimeLeft(timeLeft - 1);
    }
  });
  const embate = battle?.current ?? null;
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(tick, 1000);
    return () => {
      window.clearInterval(id);
    };
  }, [running, embate]);

  const form = battle ? formKey(battle) : null;
  const current =
    battle && form ? itemsOf(content, form).find((i) => i.id === battle.current) : undefined;
  const formMastery =
    form && form !== 'corazon' ? (useProgress.getState().mastery[form] ?? INITIAL_MASTERY) : 0.5;
  const offerHint =
    battle !== null &&
    !feedback &&
    hints > 0 &&
    hidden.length === 0 &&
    shouldOfferHint(battle.consecutiveMisses, formMastery);

  const takeHint = () => {
    if (!current) return;
    const wrong = current.options.filter((o) => !o.correct && !hidden.includes(o.id));
    const drop = wrong[Math.floor(random() * wrong.length)];
    if (!drop) return;
    setHidden([drop.id]);
    setHints((n) => n - 1);
    setMessage({
      text: `Mi aguja descarta «${drop.text}». Piensa qué haría alguien que domina esta competencia.`,
      source: 'local',
    });
  };

  const onKey = useEffectEvent((event: KeyboardEvent) => {
    if (!current || feedback || event.altKey || event.ctrlKey || event.metaKey) return;
    const index = EMBATE_KEYS.indexOf(event.key);
    const option = current.options.filter((o) => !hidden.includes(o.id))[index];
    if (option) {
      event.preventDefault();
      respond(option.id);
    }
  });
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      onKey(event);
    };
    document.addEventListener('keydown', listener);
    return () => {
      document.removeEventListener('keydown', listener);
    };
  }, []);

  const shown = feedback?.item ?? current;
  // Durante la respuesta, la Bruma conserva la forma del embate que se acaba de jugar.
  const showing = feedback?.form ?? form;
  const remaining = battle ? battle.order.length - battle.cleared.length : 7;
  const fog = ending
    ? ending.kind === 'victoria'
      ? 0
      : finaleDensity(ending.state)
    : battle
      ? finaleDensity(battle)
      : 1;

  return (
    <section aria-labelledby="gran-bruma-titulo" className="grid gap-6">
      <div className="grid items-end gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="relative">
          <BrumaCreature
            density={fog}
            phase={remaining > 4 ? 1 : remaining > 2 ? 2 : 3}
            tint={tintOf(showing)}
            eyes={Math.max(0, Math.min(6, remaining - 1))}
            pulse={pulse}
            still={still}
            className="mx-auto block aspect-[4/3] w-full max-w-xl"
          />
          <figure className="relative -mt-10 max-w-xl lg:-mt-14">
            <blockquote
              aria-live="polite"
              className="relative border-sea-300 bg-sea-900/90 px-5 py-4 text-lg leading-snug text-plate italic plate-rule"
            >
              «{line}»
            </blockquote>
            <figcaption className="mt-2 text-sm text-sea-100">
              — {content.bruma.name}
              {showing && battle && <> · {formName(content, showing)}</>}
            </figcaption>
          </figure>
        </div>

        <div className="grid gap-4">
          <div>
            <p className="toponym text-xs text-sea-100">
              Gran Reto Integrador · Nivel {plan.level} de 5
            </p>
            <h1
              id="gran-bruma-titulo"
              className="mt-2 display text-[clamp(2.25rem,1.5rem+2.5vw,3.75rem)] text-plate"
            >
              {content.bruma.name}
            </h1>
            <p className="mt-3 max-w-[55ch] text-sea-100">{content.bruma.nature}</p>
          </div>
          {battle && (
            <FinaleGauges
              battle={battle}
              content={content}
              timeLeft={timeLeft}
              untimed={untimed}
              showing={showing}
            />
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <article className="bg-plate p-6 text-ink [--focus:var(--route)] plate-rule lg:p-8">
          {ending ? (
            <FinaleReport
              content={content}
              ending={ending.kind}
              state={ending.state}
              events={ending.events}
              onRetry={begin}
            />
          ) : !battle ? (
            <Briefing plan={plan} untimed={untimed} onUntimed={setUntimed} onBegin={begin} />
          ) : shown ? (
            <Embate
              key={`${String(battle.answers.length)}-${shown.id}`}
              number={battle.answers.length + (feedback ? 0 : 1)}
              item={shown}
              feedback={
                feedback && {
                  correct: feedback.correct,
                  optionId: feedback.optionId,
                  outcome: feedback.outcome,
                  note:
                    feedback.formCleared && feedback.outcome === 'en-curso'
                      ? `Disipaste «${formName(content, feedback.formCleared)}». La Gran Bruma cambia de forma.`
                      : null,
                }
              }
              hidden={hidden}
              offerHint={offerHint}
              hints={hints}
              victoryLabel="Encender el Faro Minuto"
              onHint={takeHint}
              onAnswer={respond}
              onProceed={proceed}
            />
          ) : null}
        </article>
        <BrujulaBubble message={message} className="lg:sticky lg:top-6 lg:self-start" />
      </div>
    </section>
  );
}

function FinaleGauges({
  battle,
  content,
  timeLeft,
  untimed,
  showing,
}: {
  battle: FinaleState;
  content: FinaleContent;
  timeLeft: number;
  untimed: boolean;
  showing: FormKey | null;
}) {
  const { plan } = battle;
  const urgent = !untimed && timeLeft <= 10;
  const index = showing ? battle.order.indexOf(showing) : battle.form;
  const needed = showing ? hitsNeeded(plan, showing) : 1;
  const hits = battle.cleared.includes(showing ?? 'corazon') ? needed : battle.hits;
  return (
    <div className="grid gap-3 border-sea-500 bg-sea-950/70 p-4 plate-rule">
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
          <span className="font-semibold text-plate">Formas de la Gran Bruma</span>
          <span className="text-sea-100 tabular-nums">
            Forma {Math.min(index + 1, battle.order.length)} de {battle.order.length} · {hits}/
            {needed} aciertos
          </span>
        </div>
        <ol className="mt-2 grid grid-cols-7 gap-1" aria-label="Formas de la Gran Bruma">
          {battle.order.map((f, i) => {
            const done = battle.cleared.includes(f);
            const now = i === index;
            return (
              <li
                key={f}
                className={cx('h-3', now && !done && 'outline-2 outline-offset-2 outline-land-sun')}
                style={{
                  background: done
                    ? f === 'corazon'
                      ? 'var(--land-sun)'
                      : ISLE[f]
                    : 'var(--sea-800)',
                }}
              >
                <span className="sr-only">
                  {formName(content, f)}: {done ? 'disipada' : now ? 'en curso' : 'pendiente'}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm text-plate">
          <span className="font-semibold">Tu luz</span>
          <span aria-hidden="true" className="flex gap-1">
            {ISLANDS.map((id, i) => (
              <span
                key={id}
                className="inline-block size-3.5 border-[1.5px] border-sea-100"
                style={{ background: i < battle.lights ? ISLE[id] : 'transparent' }}
              />
            ))}
          </span>
          <span className="sr-only">
            {battle.lights} de {plan.lights} fragmentos encendidos
          </span>
        </p>
        <p
          role="timer"
          aria-live="off"
          className={cx(
            'text-sm tabular-nums',
            urgent ? 'font-bold text-land-sun' : 'text-sea-100',
          )}
        >
          {untimed ? 'Sin límite de tiempo' : `${String(timeLeft)} s de ${String(plan.seconds)}`}
        </p>
      </div>
      {!untimed && (
        <div aria-hidden="true" className="h-1 bg-sea-800">
          <div
            className={cx('h-full', urgent ? 'bg-land-sun' : 'bg-sea-300')}
            style={{ width: `${String((timeLeft / plan.seconds) * 100)}%` }}
          />
        </div>
      )}
      <p className="sr-only" aria-live="polite">
        {urgent && timeLeft === 10 ? 'Quedan 10 segundos.' : ''}
      </p>
    </div>
  );
}

function Briefing({
  plan,
  untimed,
  onUntimed,
  onBegin,
}: {
  plan: FinalePlan;
  untimed: boolean;
  onUntimed: (value: boolean) => void;
  onBegin: () => void;
}) {
  const id = useId();
  const stats = [
    { label: 'Formas', value: '6 + corazón' },
    { label: 'Aciertos por forma', value: String(plan.hitsPerForm) },
    { label: 'Tu luz', value: `${String(plan.lights)} fragmentos` },
    { label: 'Por embate', value: `${String(plan.seconds)} s` },
  ];
  return (
    <div>
      <h2 className="font-display text-2xl font-extrabold">Antes de enfrentarla</h2>
      <p className="mt-2 max-w-[60ch] text-ink-soft">
        Es la Noche del Faro: todas las islas navegan juntas para encenderlo y la Gran Bruma cae
        sobre el canal. Brújula ajustó el reto a tu dominio de las seis competencias.
      </p>
      <dl className="mt-5 grid grid-cols-2 gap-4 border-y-[1.5px] border-ink py-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label}>
            <dt className="text-sm text-ink-soft">{s.label}</dt>
            <dd className="font-display text-xl font-extrabold tabular-nums">{s.value}</dd>
          </div>
        ))}
      </dl>
      <ul className="mt-4 max-w-[60ch] list-disc space-y-1 pl-5 text-sm">
        <li>
          La Gran Bruma toma, una tras otra, la forma de cada isla: cada embate pide su competencia.
          Al final llega su corazón, donde hay que combinarlas todas.
        </li>
        <li>
          Tu luz son tus seis fragmentos. Cada error o tiempo agotado apaga uno; sin luz, te retiras
          y puedes volver.
        </li>
        <li>
          Los embates se vuelven más sutiles en las competencias que mejor dominas. Responde con
          clic o con las teclas 1 a 5.
        </li>
      </ul>
      <label htmlFor={id} className="mt-5 flex max-w-[60ch] cursor-pointer items-start gap-3">
        <input
          id={id}
          type="checkbox"
          checked={untimed}
          onChange={(event) => {
            onUntimed(event.target.checked);
          }}
          className="mt-1 size-4 accent-ink"
        />
        <span>
          <span className="font-semibold">Sin límite de tiempo.</span>{' '}
          <span className="text-ink-soft">Detén el reloj de la Bruma para leer con calma.</span>
        </span>
      </label>
      <Button size="lg" className="mt-6" onClick={onBegin}>
        Enfrentar a la Gran Bruma
      </Button>
    </div>
  );
}
