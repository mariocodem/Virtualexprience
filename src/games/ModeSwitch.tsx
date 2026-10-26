import { usePreferences } from '@/a11y/preferences';
import { cx } from '@/ui/cx';

/**
 * Barra para elegir cómo jugar: en 3D o en la versión accesible equivalente
 * (lectura, teclado y lector de pantalla). La elección se recuerda.
 */
export function ModeSwitch({
  available,
  reason,
  onSea = false,
}: {
  available: boolean;
  reason?: string;
  /** Sobre el mar oscuro del escenario de la Bruma. */
  onSea?: boolean;
}) {
  const mode = usePreferences((s) => s.gameMode);
  const setMode = usePreferences((s) => s.setGameMode);
  const playing3d = available && mode === '3d';
  return (
    <p
      className={cx(
        'flex flex-wrap items-center gap-x-3 gap-y-1 text-sm',
        onSea ? 'text-sea-100' : 'text-ink-soft',
      )}
    >
      <span>
        {playing3d
          ? 'Estás jugando en 3D.'
          : available
            ? 'Estás jugando la versión accesible.'
            : (reason ?? 'Este juego se juega en su versión accesible.')}
      </span>
      {available && (
        <button
          type="button"
          onClick={() => {
            setMode(playing3d ? 'accesible' : '3d');
          }}
          className={cx(
            'min-h-11 font-semibold underline decoration-[1.5px] underline-offset-[0.22em]',
            onSea ? 'text-plate hover:decoration-land-sun' : 'text-ink hover:decoration-route',
          )}
        >
          {playing3d ? 'Cambiar a la versión accesible' : 'Jugar en 3D'}
        </button>
      )}
    </p>
  );
}
