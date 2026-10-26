import { Suspense, useState, type ReactNode } from 'react';
import { usePreferences } from '@/a11y/preferences';
import { hasWebGL2 } from '@/landing/webgl';
import { ModeSwitch } from './ModeSwitch';

/**
 * Anfitriona de un reto: lo juega en 3D si la isla tiene su versión 3D, hay
 * WebGL y la persona no eligió la versión accesible. Ambas usan el mismo motor
 * y llegan al mismo resultado.
 */
export function GameHost({
  accessible,
  immersive,
}: {
  accessible: ReactNode;
  immersive: ReactNode | null;
}) {
  const mode = usePreferences((s) => s.gameMode);
  const [webgl] = useState(hasWebGL2);
  if (immersive === null) return <>{accessible}</>;
  const play3d = webgl && mode === '3d';
  return (
    <div className="grid gap-4">
      <ModeSwitch
        available={webgl}
        reason="Este navegador no puede mostrar 3D: se juega la versión accesible."
      />
      {play3d ? (
        <Suspense
          fallback={
            <p role="status" className="py-16 text-center toponym text-sm text-ink-soft">
              Armando el escenario…
            </p>
          }
        >
          {immersive}
        </Suspense>
      ) : (
        accessible
      )}
    </div>
  );
}
