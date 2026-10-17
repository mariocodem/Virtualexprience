import { usePreferences } from '@/a11y/preferences';
import { cx } from '@/ui/cx';

/** Relieve 3D o carta 2D: misma información, misma navegación. */
export function ModeToggle({ webgl }: { webgl: boolean }) {
  const mapMode = usePreferences((s) => s.mapMode);
  const setMapMode = usePreferences((s) => s.setMapMode);
  const mode = webgl ? mapMode : '2d';

  return (
    <fieldset className="bg-plate plate-rule">
      <legend className="sr-only">Vista del mundo</legend>
      <div className="flex">
        {(
          [
            ['3d', 'Relieve 3D'],
            ['2d', 'Carta 2D'],
          ] as const
        ).map(([value, label]) => (
          <label
            key={value}
            className={cx(
              'relative flex min-h-11 cursor-pointer items-center px-4 font-display text-sm font-bold not-last:border-r-[1.5px] not-last:border-ink',
              'has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-[-6px] has-[:focus-visible]:outline-(--focus)',
              mode === value ? 'bg-ink text-land-sun' : 'hover:bg-plate-sunk',
              value === '3d' && !webgl && 'cursor-not-allowed opacity-45',
            )}
          >
            <input
              type="radio"
              name="vista-mundo"
              className="sr-only"
              checked={mode === value}
              disabled={value === '3d' && !webgl}
              onChange={() => {
                setMapMode(value);
              }}
            />
            {label}
          </label>
        ))}
      </div>
      {!webgl && (
        <p className="border-t-[1.5px] border-ink px-3 py-2 text-xs">
          Este navegador no muestra 3D: estás en la carta 2D equivalente.
        </p>
      )}
    </fieldset>
  );
}
