import { useEffect, useEffectEvent, useId, useRef, useState } from 'react';
import { bossConfig, bossLevel, shouldOfferHint } from '@/ai/adaptiveEngine';
import { aiFeedback, brumaAiLine, brumaLocalLine, localFeedback, type Moment } from '@/ai/brujula';
import { useReducedMotion } from '@/a11y/useReducedMotion';
import type { BossContent } from '@/data/contentSchemas';
import {
  accuracy,
  answer,
  density,
  startBattle,
  type BattleEvent,
  type BattleState,
} from '@/boss/engine';
import { useProgress } from '@/progress/store';
import type { Island, Station } from '@/types/domain';
import { Button } from '@/ui/Button';
import { ButtonLink } from '@/ui/ButtonLink';
import { cx } from '@/ui/cx';
import { BrujulaBubble, type BrujulaMessage } from '../BrujulaBubble';
import { useMastery } from '../useMastery';
import { BrumaCreature, type BrumaPulse } from './BrumaCreature';

const KEYS = ['1', '2', '3', '4', '5'];
const HINTS = 2;

interface Line {
  text: string;
  source: 'ia' | 'local';
}

/**
 * Desafío de isla: la batalla contra la Bruma. Cada acierto la disipa un poco;
 * cada error o tiempo agotado apaga una luz del explorador. La dificultad sale
 * del motor adaptativo: sube con cada Bruma vencida y se ajusta al dominio.
 */
export function BossBattle({
  island,
  station,
  content,
  message,
  onBrujula,
  onComplete,
  onFail,
}: {
  island: Island;
  station: Station;
  content: BossContent;
  message: BrujulaMessage | null;
  onBrujula: (message: BrujulaMessage | null) => void;
  onComplete: (score: number, epilogue?: string) => void;
  onFail: (score: number) => void;
}) {
  const still = useReducedMotion();
  const random = useRef(Math.random).current;
  const { mastery, record } = useMastery(island.id);
  const defeated = useProgress((s) => s.fragments.filter((id) => id !== island.id).length);
  const level = bossLevel(defeated, mastery);
  const plan = bossConfig(level);

  const [battle, setBattle] = useState<BattleState | null>(null);
  const [feedback, setFeedback] = useState<BattleEvent | null>(null);
  const [retreat, setRetreat] = useState<BattleState | null>(null);
  const [untimed, setUntimed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(plan.seconds);
  const [hints, setHints] = useState(HINTS);
  const [hidden, setHidden] = useState<string[]>([]);
  const [pulse, setPulse] = useState<BrumaPulse | null>(null);
  const [line, setLine] = useState<Line>({ text: content.bruma.intro, source: 'local' });
  const speech = useRef(0);

  // La Bruma habla al instante con su guion y, si hay IA en línea, con una frase nueva.
  const speak = (moment: Moment, state: BattleState | null) => {
    const token = ++speech.current;
    const phase = state?.phase ?? 1;
    setLine({ text: brumaLocalLine(content.bruma, moment, phase, random), source: 'local' });
    void brumaAiLine({
      island: island.name,
      bruma: content.bruma,
      level,
      phase,
      moment,
      streak: streakOf(state),
    }).then((text) => {
      if (text && token === speech.current) setLine({ text, source: 'ia' });
    });
  };

  // Solo al llegar: la presentación de la Bruma.
  const introduce = useEffectEvent(() => {
    const token = ++speech.current;
    void brumaAiLine({
      island: island.name,
      bruma: content.bruma,
      level,
      phase: 1,
      moment: 'intro',
      streak: 0,
    }).then((text) => {
      if (text && token === speech.current) setLine({ text, source: 'ia' });
    });
  });
  useEffect(() => {
    introduce();
  }, []);

  const begin = () => {
    const state = startBattle(plan, content.items, random);
    setBattle(state);
    setRetreat(null);
    setFeedback(null);
    setHidden([]);
    setHints(HINTS);
    setTimeLeft(plan.seconds);
    onBrujula(null);
    speak('fase', state);
  };

  const respond = (optionId: string | null) => {
    if (!battle || feedback || battle.outcome !== 'en-curso') return;
    const { state, event } = answer(battle, content.items, optionId, random);
    record(event.item.tier, event.correct ? 1 : 0);
    setBattle(state);
    setFeedback(event);
    setHidden([]);
    setPulse({ kind: event.correct ? 'acierto' : 'fallo', at: performance.now() });
    const moment: Moment =
      event.outcome === 'victoria'
        ? 'victoria'
        : event.outcome === 'retirada'
          ? 'retirada'
          : event.phaseChanged
            ? 'fase'
            : event.correct
              ? 'acierto'
              : 'fallo';
    speak(moment, state);

    const local = localFeedback(event.item, optionId);
    onBrujula({ text: local.tip, source: 'local' });
    void aiFeedback(event.item, optionId, island.competency).then((output) => {
      if (output) {
        onBrujula({ text: [output.feedback, output.tip].filter(Boolean).join(' '), source: 'ia' });
      }
    });
  };

  const proceed = () => {
    if (!battle || !feedback) return;
    if (battle.outcome === 'victoria') {
      onComplete(accuracy(battle), content.bruma.defeat);
      return;
    }
    if (battle.outcome === 'retirada') {
      onFail(accuracy(battle));
      setRetreat(battle);
      setBattle(null);
      setFeedback(null);
      return;
    }
    setFeedback(null);
    setTimeLeft(battle.config.seconds);
    onBrujula(null);
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
  // El reloj se reinicia con cada embate nuevo.
  const embate = battle?.current ?? null;
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(tick, 1000);
    return () => {
      window.clearInterval(id);
    };
  }, [running, embate]);

  const current = battle ? content.items.find((i) => i.id === battle.current) : undefined;
  const offerHint =
    battle !== null &&
    !feedback &&
    hints > 0 &&
    hidden.length === 0 &&
    shouldOfferHint(battle.consecutiveMisses, mastery);

  const takeHint = () => {
    if (!current) return;
    const wrong = current.options.filter((o) => !o.correct && !hidden.includes(o.id));
    const drop = wrong[Math.floor(random() * wrong.length)];
    if (!drop) return;
    setHidden([drop.id]);
    setHints((n) => n - 1);
    onBrujula({
      text: `Mi aguja descarta «${drop.text}»: no se sostiene. Piensa en el criterio antes de elegir.`,
      source: 'local',
    });
  };

  // Atajos 1–5 para responder durante el embate.
  const onKey = useEffectEvent((event: KeyboardEvent) => {
    if (!current || feedback || event.altKey || event.ctrlKey || event.metaKey) return;
    const index = KEYS.indexOf(event.key);
    const visible = current.options.filter((o) => !hidden.includes(o.id));
    const option = visible[index];
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

  const fog = battle ? density(battle) : 1;
  const shown = feedback?.item ?? current;
  const phase = battle?.phase ?? 1;

  return (
    <section aria-labelledby="bruma-titulo" className="grid gap-6">
      <div className="grid items-end gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="relative">
          <BrumaCreature
            density={fog}
            phase={phase}
            pulse={pulse}
            still={still}
            className="mx-auto block aspect-[4/3] w-full max-w-xl"
          />
          <figure className="relative -mt-10 max-w-xl lg:-mt-14">
            <blockquote
              aria-live="polite"
              className="relative border-sea-300 bg-sea-900/90 px-5 py-4 text-lg leading-snug text-plate italic plate-rule"
            >
              «{line.text}»
            </blockquote>
            <figcaption className="mt-2 text-sm text-sea-100">
              — {content.bruma.name}
              {line.source === 'ia' && (
                <span className="ml-2 text-xs text-sea-300">· voz con IA</span>
              )}
            </figcaption>
          </figure>
        </div>

        <div className="grid gap-4">
          <div>
            <p className="toponym text-xs text-sea-100">
              Desafío de isla · Nivel {plan.level} de 5
            </p>
            <h1
              id="bruma-titulo"
              className="mt-2 display text-[clamp(2.25rem,1.5rem+2.5vw,3.75rem)] text-plate"
            >
              {station.title}
            </h1>
            <p className="mt-3 max-w-[55ch] text-sea-100">{content.bruma.nature}</p>
          </div>
          {battle && <BattleGauges battle={battle} timeLeft={timeLeft} untimed={untimed} />}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <article className="bg-plate p-6 text-ink [--focus:var(--route)] plate-rule lg:p-8">
          {retreat ? (
            <Retreat
              battle={retreat}
              content={content}
              islandId={island.id}
              stationId={station.id}
              onRetry={begin}
            />
          ) : !battle ? (
            <Briefing
              plan={plan}
              defeated={defeated}
              untimed={untimed}
              onUntimed={setUntimed}
              onBegin={begin}
            />
          ) : shown ? (
            <Embate
              key={`${String(battle.answers.length)}-${shown.id}`}
              battle={battle}
              item={shown}
              feedback={feedback}
              hidden={hidden}
              offerHint={offerHint}
              hints={hints}
              fragmentName={island.fragmentName}
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

function streakOf(state: BattleState | null): number {
  if (!state) return 0;
  let streak = 0;
  for (let i = state.answers.length - 1; i >= 0; i -= 1) {
    const correct = state.answers[i]?.correct;
    if (streak === 0) streak = correct ? 1 : -1;
    else if (correct === streak > 0) streak += streak > 0 ? 1 : -1;
    else break;
  }
  return streak;
}

function BattleGauges({
  battle,
  timeLeft,
  untimed,
}: {
  battle: BattleState;
  timeLeft: number;
  untimed: boolean;
}) {
  const fog = Math.round(density(battle) * 100);
  const { lights, hitsToWin, seconds } = battle.config;
  const urgent = !untimed && timeLeft <= 10;
  return (
    <div className="grid gap-3 border-sea-500 bg-sea-950/70 p-4 plate-rule">
      <div>
        <div className="flex items-baseline justify-between text-sm">
          <span id="bruma-densidad" className="font-semibold text-plate">
            Densidad de la Bruma
          </span>
          <span className="text-sea-100 tabular-nums">
            Fase {battle.phase} de 3 · {battle.hits}/{hitsToWin} aciertos
          </span>
        </div>
        <div
          role="meter"
          aria-labelledby="bruma-densidad"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={fog}
          aria-valuetext={`${String(fog)} %`}
          className="relative mt-2 h-3 bg-sea-800"
        >
          <div
            className="h-full bg-sea-100 transition-[width] duration-(--dur-slow) ease-out"
            style={{ width: `${String(fog)}%` }}
          />
          <span aria-hidden="true" className="absolute inset-y-0 left-1/3 w-0.5 bg-sea-950" />
          <span aria-hidden="true" className="absolute inset-y-0 left-2/3 w-0.5 bg-sea-950" />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm text-plate">
          <span className="font-semibold">Tu luz</span>
          <span aria-hidden="true" className="flex gap-1">
            {Array.from({ length: lights }, (_, i) => (
              <Lantern key={i} on={i < battle.lights} />
            ))}
          </span>
          <span className="sr-only">
            {battle.lights} de {lights}
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
          {untimed ? 'Sin límite de tiempo' : `${String(timeLeft)} s de ${String(seconds)}`}
        </p>
      </div>
      {!untimed && (
        <div aria-hidden="true" className="h-1 bg-sea-800">
          <div
            className={cx('h-full', urgent ? 'bg-land-sun' : 'bg-sea-300')}
            style={{ width: `${String((timeLeft / seconds) * 100)}%` }}
          />
        </div>
      )}
      <p className="sr-only" aria-live="polite">
        {urgent && timeLeft === 10 ? 'Quedan 10 segundos.' : ''}
      </p>
    </div>
  );
}

function Lantern({ on }: { on: boolean }) {
  return (
    <svg width="18" height="22" viewBox="0 0 18 22" aria-hidden="true">
      <path
        d="M6 1h6M4 4h10l-1 3H5z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        className="text-sea-100"
      />
      <rect
        x="4"
        y="8"
        width="10"
        height="10"
        stroke="currentColor"
        strokeWidth="1.5"
        className={on ? 'fill-land-sun text-sea-100' : 'fill-transparent text-sea-500'}
      />
      <path d="M4 20h10" stroke="currentColor" strokeWidth="1.5" className="text-sea-100" />
    </svg>
  );
}

function Briefing({
  plan,
  defeated,
  untimed,
  onUntimed,
  onBegin,
}: {
  plan: ReturnType<typeof bossConfig>;
  defeated: number;
  untimed: boolean;
  onUntimed: (value: boolean) => void;
  onBegin: () => void;
}) {
  const id = useId();
  return (
    <div>
      <h2 className="font-display text-2xl font-extrabold">Antes de enfrentarla</h2>
      <p className="mt-2 max-w-[60ch] text-ink-soft">
        {defeated === 0
          ? 'Es la primera Bruma que enfrentas: aún no conoce tus fuerzas.'
          : `Ya disipaste ${String(defeated)} ${defeated === 1 ? 'Bruma' : 'Brumas'}: esta se hizo más fuerte para recibirte.`}{' '}
        Su nivel también se ajusta a tu dominio de la competencia.
      </p>
      <dl className="mt-5 grid grid-cols-2 gap-4 border-y-[1.5px] border-ink py-4 sm:grid-cols-4">
        <Stat label="Nivel" value={`${String(plan.level)} de 5`} />
        <Stat label="Aciertos para disiparla" value={String(plan.hitsToWin)} />
        <Stat label="Tu luz" value={`${String(plan.lights)} errores`} />
        <Stat label="Por embate" value={`${String(plan.seconds)} s`} />
      </dl>
      <ul className="mt-4 max-w-[60ch] list-disc space-y-1 pl-5 text-sm">
        <li>
          Cada acierto la disipa; al pasar un tercio y dos tercios cambia de fase y sus señales se
          vuelven más sutiles.
        </li>
        <li>
          Cada error o tiempo agotado apaga una de tus luces. Sin luz, te retiras y puedes volver a
          intentarlo.
        </li>
        <li>
          Responde con clic o con las teclas 1 a 5. Si fallas seguido, Brújula te ofrecerá una
          pista.
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
        Enfrentar a la Bruma
      </Button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-ink-soft">{label}</dt>
      <dd className="font-display text-xl font-extrabold tabular-nums">{value}</dd>
    </div>
  );
}

function Embate({
  battle,
  item,
  feedback,
  hidden,
  offerHint,
  hints,
  fragmentName,
  onHint,
  onAnswer,
  onProceed,
}: {
  battle: BattleState;
  item: BossContent['items'][number];
  feedback: BattleEvent | null;
  hidden: string[];
  offerHint: boolean;
  hints: number;
  fragmentName: string;
  onHint: () => void;
  onAnswer: (optionId: string) => void;
  onProceed: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const proceed = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (feedback) proceed.current?.focus();
    else heading.current?.focus();
  }, [feedback]);

  const visible = item.options.filter((o) => !hidden.includes(o.id));
  const chosen = feedback ? item.options.find((o) => o.id === feedback.optionId) : undefined;
  const number = battle.answers.length + (feedback ? 0 : 1);

  return (
    <div>
      <p className="text-sm text-ink-soft tabular-nums">Embate {number}</p>
      <h2
        ref={heading}
        tabIndex={-1}
        className="mt-1 font-display text-xl font-extrabold outline-none lg:text-2xl"
      >
        {item.prompt}
      </h2>
      {item.context && (
        <blockquote className="mt-3 bg-plate-sunk px-4 py-3 font-display text-lg plate-rule">
          {item.context}
        </blockquote>
      )}

      <ul className="mt-4 grid gap-2">
        {visible.map((option, i) => {
          const isChosen = feedback?.optionId === option.id;
          return (
            <li key={option.id}>
              <button
                type="button"
                disabled={Boolean(feedback)}
                aria-keyshortcuts={KEYS[i]}
                onClick={() => {
                  onAnswer(option.id);
                }}
                className={cx(
                  'flex min-h-12 w-full items-center gap-3 border-[1.5px] px-4 py-2 text-left',
                  feedback && option.correct && 'border-isle-latidosocial bg-land-low/15',
                  feedback && isChosen && !option.correct && 'border-route bg-route/10',
                  !feedback && 'border-plate-edge hover:border-ink hover:bg-plate-sunk',
                  feedback && !option.correct && !isChosen && 'border-plate-edge opacity-70',
                )}
              >
                <kbd
                  aria-hidden="true"
                  className="inline-flex size-7 shrink-0 items-center justify-center border-[1.5px] border-ink font-display text-sm font-bold"
                >
                  {i + 1}
                </kbd>
                <span>{option.text}</span>
                {feedback && option.correct && (
                  <span className="ml-auto text-sm font-semibold">Correcta</span>
                )}
                {feedback && isChosen && !option.correct && (
                  <span className="ml-auto text-sm font-semibold">Tu elección</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <div role="status" aria-live="polite" className="mt-4 min-h-6">
        {feedback && (
          <p
            className={cx(
              'font-semibold',
              feedback.correct ? 'text-isle-latidosocial' : 'text-route',
            )}
          >
            {feedback.correct
              ? 'Tu linterna atraviesa la Bruma.'
              : feedback.optionId
                ? 'La Bruma se espesa y apaga una de tus luces.'
                : 'Se agotó el tiempo: la Bruma apaga una de tus luces.'}{' '}
            <span className="font-normal text-ink">{chosen?.feedback ?? item.explanation}</span>
          </p>
        )}
        {feedback?.phaseChanged && feedback.outcome === 'en-curso' && (
          <p className="mt-2 font-semibold">
            La Bruma cambia de forma: entra en la fase {feedback.phaseChanged}.
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {feedback ? (
          <Button ref={proceed} size="lg" onClick={onProceed}>
            {feedback.outcome === 'victoria'
              ? `Reclamar el ${fragmentName}`
              : feedback.outcome === 'retirada'
                ? 'Retirarse a recuperar la luz'
                : 'Siguiente embate'}
          </Button>
        ) : (
          offerHint && (
            <Button variant="secondary" onClick={onHint}>
              Pedir pista a Brújula ({hints})
            </Button>
          )
        )}
      </div>
    </div>
  );
}

function Retreat({
  battle,
  content,
  islandId,
  stationId,
  onRetry,
}: {
  battle: BattleState;
  content: BossContent;
  islandId: string;
  stationId: string;
  onRetry: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  const missed = battle.answers
    .filter((a) => !a.correct)
    .flatMap((a) => content.items.find((i) => i.id === a.itemId) ?? []);
  return (
    <div>
      <h2 ref={heading} tabIndex={-1} className="font-display text-2xl font-extrabold outline-none">
        La Bruma te obligó a retirarte
      </h2>
      <p className="mt-2 max-w-[60ch] text-ink-soft">
        Disipaste {Math.round((1 - density(battle)) * 100)} % de la Bruma. Brújula anotó lo que la
        hizo más fuerte para que vuelvas preparado:
      </p>
      <ul className="mt-4 grid gap-3">
        {missed.map((item) => (
          <li key={item.id} className="border-l-[3px] border-route bg-plate-sunk px-4 py-3">
            <p className="font-semibold">{item.prompt}</p>
            <p className="mt-1 text-sm">{item.explanation}</p>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button size="lg" onClick={onRetry}>
          Volver a enfrentarla
        </Button>
        <ButtonLink to={`/mundo/${islandId}?estacion=${stationId}`} size="lg" variant="secondary">
          Repasar en el sendero
        </ButtonLink>
      </div>
    </div>
  );
}
