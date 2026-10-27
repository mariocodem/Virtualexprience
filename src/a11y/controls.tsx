import { useId, type ReactNode } from 'react';
import { cx } from '@/ui/cx';

/** Interruptor de lámina: pista recta con filete; encendido en tinta con perilla de sol. */
export function Switch({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const hintId = useId();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-describedby={hint ? hintId : undefined}
      onClick={() => {
        onChange(!checked);
      }}
      className="flex min-h-11 w-full items-center justify-between gap-4 text-left font-semibold"
    >
      <span>
        {label}
        {hint && (
          <span id={hintId} className="block text-sm font-normal text-ink-soft">
            {hint}
          </span>
        )}
      </span>
      <span
        aria-hidden="true"
        className={cx(
          'relative h-7 w-12 shrink-0 border-[1.5px] border-ink transition-colors duration-(--dur-fast)',
          checked ? 'bg-ink' : 'bg-plate',
        )}
      >
        <span
          className={cx(
            'absolute top-1/2 size-4 -translate-y-1/2 transition-[left,background-color] duration-(--dur-fast) ease-out',
            checked ? 'left-[calc(100%-1.25rem)] bg-land-sun' : 'left-1 bg-ink',
          )}
        />
      </span>
    </button>
  );
}

/** Selector segmentado: celdas rectas divididas por filetes; la elegida en tinta. */
export function Segmented<T extends string | number>({
  legend,
  name,
  value,
  options,
  onChange,
  className,
}: {
  legend: string;
  name: string;
  value: T;
  options: readonly { value: T; label: ReactNode; disabled?: boolean }[];
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <fieldset className={className}>
      <legend className="text-sm font-semibold">{legend}</legend>
      <div
        className="mt-2 grid border-[1.5px] border-ink"
        style={{ gridTemplateColumns: `repeat(${String(options.length)}, minmax(0, 1fr))` }}
      >
        {options.map((option) => (
          <label
            key={String(option.value)}
            className={cx(
              'relative flex min-h-12 cursor-pointer items-center justify-center px-2 text-center font-display text-sm font-bold not-last:border-r-[1.5px] not-last:border-ink',
              'has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-[-6px] has-[:focus-visible]:outline-(--focus)',
              value === option.value ? 'bg-ink text-land-sun' : 'hover:bg-plate-sunk',
              option.disabled && 'cursor-not-allowed opacity-45',
            )}
          >
            <input
              type="radio"
              name={name}
              className="sr-only"
              checked={value === option.value}
              disabled={option.disabled}
              onChange={() => {
                onChange(option.value);
              }}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Opciones del tamaño de texto: una «A» que crece, con el porcentaje para lectores de pantalla. */
export function TextSizeLabel({ scale, step }: { scale: number; step: number }) {
  return (
    <>
      <span aria-hidden="true" style={{ fontSize: `${String(0.85 + step * 0.22)}rem` }}>
        A
      </span>
      <span className="sr-only">{`${String(Math.round(scale * 100))} %`}</span>
    </>
  );
}
