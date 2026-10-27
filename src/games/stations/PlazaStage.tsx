import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router';
import { usePreferences } from '@/a11y/preferences';
import { useReducedMotion } from '@/a11y/useReducedMotion';
import type { Island } from '@/types/domain';
import { Controls } from '../shared/controls';
import { GameStage } from '../shared/GameStage';
import { HudPanel, KeyHint } from '../shared/hud';
import { createWalker, PLAZA_HELP, type Spot } from './plaza';
import { FocusRing, StationSet, Walk } from './StationSet';

/**
 * Escenario común de las estaciones en 3D: el lugar de la isla, el explorador
 * que camina por la plaza y un panel (formato, pregunta, bitácora) que congela
 * la caminata mientras está abierto. Esc cierra el panel antes de pausar.
 */
export function PlazaStage({
  island,
  label,
  spots,
  near,
  onNear,
  onUse,
  props,
  goal,
  side,
  overlay,
  onCloseOverlay,
  hint,
  announce,
}: {
  island: Island;
  label: string;
  spots: readonly Spot[];
  near: Spot | undefined;
  onNear: (spot: Spot | undefined) => void;
  onUse: (spot: Spot) => void;
  /** Los objetos de la plaza (dentro del lienzo). */
  props: ReactNode;
  /** Qué hay que hacer ahora, arriba a la izquierda. */
  goal: ReactNode;
  /** Un panel que acompaña sin detener la caminata (la pregunta en curso), a la derecha. */
  side?: ReactNode;
  /** Panel abierto sobre la escena, o `null`. */
  overlay: ReactNode | null;
  onCloseOverlay: () => void;
  /** Qué se hace con el punto a mano: «Abrir el audio», «Responder 2»… */
  hint: (spot: Spot) => string;
  announce?: string;
}) {
  const still = useReducedMotion();
  const setMode = usePreferences((s) => s.setGameMode);
  const [controls] = useState(() => new Controls());
  const [walker] = useState(createWalker);
  const [paused, setPaused] = useState(false);
  const navigate = useNavigate();
  const { isla, estacion } = useParams();
  const box = useRef<HTMLDivElement>(null);
  const open = overlay !== null;
  const blocked = useRef(false);
  useEffect(() => {
    blocked.current = open || paused;
  }, [open, paused]);

  // Al cerrar un panel, el foco vuelve al escenario para seguir caminando.
  const wasOpen = useRef(open);
  useEffect(() => {
    if (wasOpen.current && !open) {
      box.current?.querySelector<HTMLElement>('[role="application"]')?.focus();
    }
    if (open) controls.clear();
    wasOpen.current = open;
  }, [open, controls]);

  return (
    <div ref={box}>
      <GameStage
        label={label}
        controls={controls}
        paused={paused}
        onPause={(next) => {
          if (next && open) onCloseOverlay();
          else setPaused(next);
        }}
        help={PLAZA_HELP}
        announce={announce}
        onAccessible={() => {
          setMode('accesible');
        }}
        onExit={() => {
          void navigate(`/mundo/${isla ?? ''}?estacion=${estacion ?? ''}`);
        }}
        hud={
          <>
            <div className="absolute top-3 left-3 grid w-72 max-w-[calc(100%-1.5rem)] gap-2 max-sm:top-14">
              <HudPanel>{goal}</HudPanel>
            </div>
            {side && !open && (
              <div className="absolute top-16 right-3 max-h-[calc(100%-8rem)] w-[min(20rem,calc(100%-1.5rem))] overflow-auto max-sm:top-auto max-sm:bottom-16 max-sm:max-h-[55%]">
                {side}
              </div>
            )}
            {!open && near && (
              <div className="absolute inset-x-3 bottom-4 flex justify-center">
                <button
                  type="button"
                  className="pointer-events-auto"
                  onClick={() => {
                    onUse(near);
                  }}
                >
                  <KeyHint keys="E">{hint(near)}</KeyHint>
                </button>
              </div>
            )}
            {overlay && (
              <div className="absolute inset-0 grid place-items-center bg-sea-950/45 p-3 sm:p-6">
                {overlay}
              </div>
            )}
          </>
        }
      >
        <StationSet island={island} still={still} />
        {props}
        <FocusRing spot={open ? undefined : near} still={still} />
        <Walk
          walker={walker}
          controls={controls}
          spots={spots}
          paused={() => blocked.current}
          still={still}
          onNear={onNear}
          onUse={onUse}
        />
      </GameStage>
    </div>
  );
}
