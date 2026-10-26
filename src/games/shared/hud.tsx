import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import type { QuizItem } from '@/data/contentSchemas';
import { cx } from '@/ui/cx';
import type { Action, Controls } from './controls';
import { STAGE_BUTTON } from './stage';

/**
 * Piezas del HUD de los juegos 3D, sobre el lienzo. Todo lo que decide el
 * resultado es HTML real (botones, medidores con rol `meter`), así se juega
 * con teclado y se anuncia a lectores de pantalla.
 */

/** Cartela del HUD sobre el mar: fondo translúcido y borde claro. */
export function HudPanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx('pointer-events-auto bg-sea-950/80 p-3 text-plate plate-rule', className)}>
      {children}
    </div>
  );
}

/** Medidor del HUD (0 a 1): carga de la linterna, densidad de la Bruma, tiempo… */
export function HudMeter({
  label,
  value,
  text,
  tone = 'sun',
  className,
}: {
  label: string;
  value: number;
  text: string;
  tone?: 'sun' | 'fog' | 'route' | 'low';
  className?: string;
}) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="font-semibold text-plate">{label}</span>
        <span className="text-sea-100 tabular-nums">{text}</span>
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={text}
        className="mt-1 h-2.5 bg-sea-800"
      >
        <div
          className={cx(
            'h-full transition-[width] duration-200',
            tone === 'sun' && 'bg-land-sun',
            tone === 'fog' && 'bg-sea-100',
            tone === 'route' && 'bg-route',
            tone === 'low' && 'bg-land-low',
          )}
          style={{ width: `${String(percent)}%` }}
        />
      </div>
    </div>
  );
}

/** Luces del explorador: faroles encendidos y apagados. */
export function LightsHud({ lights, max }: { lights: number; max: number }) {
  return (
    <p className="flex items-center gap-2 text-xs text-plate">
      <span className="font-semibold">Tu luz</span>
      <span aria-hidden="true" className="flex gap-1">
        {Array.from({ length: max }, (_, i) => (
          <span
            key={i}
            className={cx(
              'inline-block h-4 w-3 border-[1.5px] border-sea-100',
              i < lights ? 'bg-land-sun' : 'bg-transparent',
            )}
          />
        ))}
      </span>
      <span className="sr-only">
        {lights} de {max}
      </span>
    </p>
  );
}

/** Indicación de tecla: «E · Inspeccionar». */
export function KeyHint({ keys, children }: { keys: string; children: ReactNode }) {
  return (
    <p className="inline-flex items-center gap-2 bg-sea-950/85 px-3 py-2 text-sm text-plate plate-rule">
      <kbd className="border-[1.5px] border-sea-100 px-1.5 font-display text-xs font-bold">
        {keys}
      </kbd>
      {children}
    </p>
  );
}

/** Cartel grande en el centro (cambio de fase, ¡a esquivar!…); se va solo. */
export function Banner({ text, at }: { text: string | null; at: number }) {
  // `at` distingue dos avisos iguales seguidos; el aviso se oculta solo.
  const [hidden, setHidden] = useState<number | null>(null);
  useEffect(() => {
    if (!text) return;
    const id = window.setTimeout(() => {
      setHidden(at);
    }, 2200);
    return () => {
      window.clearTimeout(id);
    };
  }, [text, at]);
  const shown = text && hidden !== at ? text : null;
  if (!shown) return null;
  return (
    <div className="absolute inset-x-0 top-1/4 flex justify-center px-4">
      <p className="bg-sea-950/85 px-5 py-3 text-center font-display text-xl font-extrabold text-land-sun plate-rule">
        {shown}
      </p>
    </div>
  );
}

export interface DecisionFeedback {
  correct: boolean;
  text: string;
}

/**
 * Decisión de conocimiento dentro del juego: una pregunta y sus opciones,
 * con clic o con las teclas 1 a 4. Tras responder muestra la retroalimentación
 * y espera a que se siga. Mientras está abierta, el juego debe ir lento o en pausa.
 */
export function DecisionCard({
  title,
  item,
  feedback,
  onChoose,
  onContinue,
  continueLabel = 'Seguir',
  className,
}: {
  /** Encabezado corto: «Rumor interceptado», «Habla el gremio de pescadores»… */
  title: string;
  item: Pick<QuizItem, 'prompt' | 'context' | 'options'>;
  feedback: DecisionFeedback | null;
  onChoose: (optionId: string) => void;
  onContinue: () => void;
  continueLabel?: string;
  className?: string;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const proceed = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (feedback) proceed.current?.focus();
    else heading.current?.focus();
  }, [feedback]);

  const onKey = useEffectEvent((event: KeyboardEvent) => {
    if (feedback || event.altKey || event.ctrlKey || event.metaKey) return;
    const index = ['1', '2', '3', '4'].indexOf(event.key);
    const option = item.options[index];
    if (option) {
      event.preventDefault();
      onChoose(option.id);
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

  return (
    <section
      aria-labelledby="decision-titulo"
      className={cx(
        'pointer-events-auto w-full max-w-xl bg-plate p-5 text-ink [--focus:var(--route)] plate-rule',
        className,
      )}
    >
      <p className="toponym text-[0.625rem] text-ink-soft">{title}</p>
      <h2
        id="decision-titulo"
        ref={heading}
        tabIndex={-1}
        className="mt-1 font-display text-lg font-extrabold outline-none"
      >
        {item.prompt}
      </h2>
      {item.context && (
        <blockquote className="mt-2 bg-plate-sunk px-3 py-2 text-sm plate-rule">
          {item.context}
        </blockquote>
      )}
      <ul className="mt-3 grid gap-2">
        {item.options.map((option, i) => (
          <li key={option.id}>
            <button
              type="button"
              disabled={Boolean(feedback)}
              aria-keyshortcuts={String(i + 1)}
              onClick={() => {
                onChoose(option.id);
              }}
              className="flex min-h-11 w-full items-center gap-3 border-[1.5px] border-plate-edge px-3 py-2 text-left text-sm hover:border-ink disabled:opacity-70"
            >
              <kbd
                aria-hidden="true"
                className="inline-flex size-6 shrink-0 items-center justify-center border-[1.5px] border-ink font-display text-xs font-bold"
              >
                {i + 1}
              </kbd>
              {option.text}
            </button>
          </li>
        ))}
      </ul>
      <div role="status" aria-live="polite" className="mt-3 min-h-5 text-sm">
        {feedback && (
          <p>
            <span
              className={cx(
                'font-semibold',
                feedback.correct ? 'text-isle-latidosocial' : 'text-route',
              )}
            >
              {feedback.correct ? 'Bien visto. ' : 'No era así. '}
            </span>
            {feedback.text}
          </p>
        )}
      </div>
      {feedback && (
        <button
          ref={proceed}
          type="button"
          onClick={onContinue}
          className="mt-3 inline-flex min-h-11 items-center border-[1.5px] border-sea-900 bg-sea-900 px-5 font-display font-bold text-land-sun"
        >
          {continueLabel}
        </button>
      )}
    </section>
  );
}

/** Botones táctiles: cruceta de movimiento y acciones. Solo en pantallas táctiles. */
const COARSE = '(pointer: coarse)';
const subscribeCoarse = (notify: () => void) => {
  const query = window.matchMedia(COARSE);
  query.addEventListener('change', notify);
  return () => {
    query.removeEventListener('change', notify);
  };
};

export function TouchPad({ controls }: { controls: Controls }) {
  const coarse = useSyncExternalStore(
    subscribeCoarse,
    () => window.matchMedia(COARSE).matches,
    () => false,
  );
  if (!coarse) return null;

  const hold = (x: number, z: number) => ({
    onPointerDown: () => {
      controls.touch = { x, z };
    },
    onPointerUp: () => {
      controls.touch = { x: 0, z: 0 };
    },
    onPointerLeave: () => {
      controls.touch = { x: 0, z: 0 };
    },
  });
  const tap = (action: Action) => ({
    onPointerDown: () => {
      controls.press(action);
    },
  });
  const pad = 'size-12 touch-none select-none ' + STAGE_BUTTON;

  return (
    <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-end justify-between">
      <div aria-hidden="true" className="pointer-events-auto grid grid-cols-3 gap-1">
        <span />
        <button type="button" tabIndex={-1} className={pad} {...hold(0, -1)}>
          ▲
        </button>
        <span />
        <button type="button" tabIndex={-1} className={pad} {...hold(-1, 0)}>
          ◀
        </button>
        <span />
        <button type="button" tabIndex={-1} className={pad} {...hold(1, 0)}>
          ▶
        </button>
        <span />
        <button type="button" tabIndex={-1} className={pad} {...hold(0, 1)}>
          ▼
        </button>
        <span />
      </div>
      <div aria-hidden="true" className="pointer-events-auto grid gap-1">
        <button
          type="button"
          tabIndex={-1}
          className={STAGE_BUTTON + ' touch-none'}
          {...tap('interact')}
        >
          Usar
        </button>
        <button
          type="button"
          tabIndex={-1}
          className={STAGE_BUTTON + ' touch-none'}
          {...tap('dash')}
        >
          Esquivar
        </button>
        <button
          type="button"
          tabIndex={-1}
          className={STAGE_BUTTON + ' touch-none'}
          {...tap('fire')}
        >
          Luz
        </button>
      </div>
    </div>
  );
}
