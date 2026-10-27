import { AdaptiveDpr, PerformanceMonitor } from '@react-three/drei';
import { Canvas, type CanvasProps } from '@react-three/fiber';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/ui/Button';
import { cx } from '@/ui/cx';
import type { Controls } from './controls';
import { STAGE_BUTTON, type ControlHelp } from './stage';
import { TouchPad } from './hud';

/**
 * Escenario de un juego 3D: el lienzo, la capa del HUD encima y la pausa.
 * Esc o P pausan (sin sacar de la estación); con la pausa el mundo se congela
 * y aparece el menú con los controles, la versión accesible y la salida.
 * El lienzo es decorativo para lectores de pantalla: lo importante se anuncia
 * en `announce` y se decide con botones del HUD.
 */
export function GameStage({
  label,
  controls,
  camera,
  paused,
  onPause,
  help,
  hud,
  announce,
  onAccessible,
  onRestart,
  onExit,
  touch = true,
  className,
  children,
}: {
  /** Nombre accesible del juego. */
  label: string;
  controls: Controls;
  camera?: CanvasProps['camera'];
  paused: boolean;
  onPause: (paused: boolean) => void;
  help: ControlHelp[];
  hud?: ReactNode;
  announce?: string;
  onAccessible?: () => void;
  onRestart?: () => void;
  onExit?: () => void;
  /** Botones táctiles de movimiento y acción en pantallas táctiles. */
  touch?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const id = useId();
  const host = useRef<HTMLDivElement>(null);
  const resume = useRef<HTMLButtonElement>(null);
  const [dpr, setDpr] = useState(1.5);
  const [full, setFull] = useState(false);

  useEffect(() => {
    const node = host.current;
    if (!node) return;
    node.focus();
    return controls.attach(node);
  }, [controls]);

  // Esc o P pausan y reanudan; Esc no debe llegar a la estación mientras se juega.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        !host.current?.contains(document.activeElement) &&
        document.activeElement !== document.body
      )
        return;
      if (event.key === 'Escape' || event.code === 'KeyP') {
        if (event.code === 'KeyP' && document.activeElement instanceof HTMLInputElement) return;
        event.preventDefault();
        onPause(!paused);
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
    };
  }, [paused, onPause]);

  useEffect(() => {
    const onHide = () => {
      if (document.hidden) onPause(true);
    };
    document.addEventListener('visibilitychange', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [onPause]);

  useEffect(() => {
    if (paused) {
      controls.clear();
      resume.current?.focus();
    } else {
      host.current?.focus();
    }
  }, [paused, controls]);

  useEffect(() => {
    const onChange = () => {
      setFull(document.fullscreenElement === host.current);
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
    };
  }, []);

  const toggleFull = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void host.current?.requestFullscreen().catch(() => undefined);
  };

  return (
    <div
      ref={host}
      // El escenario es una aplicación de teclado: necesita foco para recibir los mandos.
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
      role="application"
      aria-label={label}
      aria-describedby={`${id}-ayuda`}
      className={cx(
        'relative isolate overflow-hidden bg-sea-950 text-plate outline-none plate-rule',
        'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-land-sun',
        full ? 'h-svh' : 'h-[min(78svh,800px)] min-h-[440px]',
        className,
      )}
    >
      <Canvas
        shadows
        flat
        dpr={dpr}
        frameloop={paused ? 'never' : 'always'}
        camera={camera ?? { fov: 42, position: [0, 13, 12.5], near: 0.5, far: 200 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        aria-hidden="true"
        className="!absolute inset-0"
      >
        <PerformanceMonitor
          onDecline={() => {
            setDpr(1);
          }}
          onIncline={() => {
            setDpr(1.5);
          }}
        />
        <AdaptiveDpr />
        {children}
      </Canvas>

      <div
        className={cx(
          'pointer-events-none absolute inset-0',
          // Con la cruceta táctil a la vista, lo anclado abajo queda por encima de ella.
          touch && !paused && 'pointer-coarse:bottom-42',
        )}
      >
        {hud}
      </div>
      {touch && !paused && <TouchPad controls={controls} />}

      <div className="absolute top-3 right-3 flex gap-2">
        <button type="button" className={STAGE_BUTTON} onClick={toggleFull}>
          {full ? 'Salir de pantalla completa' : 'Pantalla completa'}
        </button>
        <button
          type="button"
          className={STAGE_BUTTON}
          onClick={() => {
            onPause(true);
          }}
        >
          Pausa <kbd className="text-xs text-sea-100">Esc</kbd>
        </button>
      </div>

      <p id={`${id}-ayuda`} className="sr-only">
        {help.map((h) => `${h.keys}: ${h.action}.`).join(' ')}
      </p>
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>

      {paused && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${id}-pausa`}
          className="absolute inset-0 grid place-items-center bg-sea-950/80 p-4"
        >
          <div className="w-full max-w-md bg-plate p-6 text-ink [--focus:var(--route)] plate-rule">
            <h2 id={`${id}-pausa`} className="font-display text-2xl font-extrabold">
              En pausa
            </h2>
            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              {help.map((h) => (
                <div key={h.keys} className="contents">
                  <dt className="font-semibold">{h.keys}</dt>
                  <dd>{h.action}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                ref={resume}
                onClick={() => {
                  onPause(false);
                }}
              >
                Seguir jugando
              </Button>
              {onRestart && (
                <Button variant="secondary" onClick={onRestart}>
                  Empezar de nuevo
                </Button>
              )}
              {onAccessible && (
                <Button variant="secondary" onClick={onAccessible}>
                  Versión accesible
                </Button>
              )}
              {onExit && (
                <Button variant="quiet" onClick={onExit}>
                  Salir
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
