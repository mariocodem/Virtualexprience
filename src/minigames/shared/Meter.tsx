import { useId } from 'react';
import { cx } from '@/ui/cx';

/**
 * Indicador de 0 a 100 con su rótulo y su cifra. `onSea` para cartelas sobre
 * mar profundo. Las marcas opcionales señalan umbrales (p. ej. la confianza
 * necesaria para respaldar un acuerdo).
 */
export function Meter({
  label,
  value,
  max = 100,
  valueText,
  mark,
  onSea = false,
  tone = 'ink',
  className,
}: {
  label: string;
  value: number;
  max?: number;
  valueText?: string;
  mark?: number;
  onSea?: boolean;
  tone?: 'ink' | 'sun' | 'low' | 'high';
  className?: string;
}) {
  const id = useId();
  const clamped = Math.min(max, Math.max(0, value));
  const percent = (clamped / max) * 100;
  const text = valueText ?? `${String(Math.round(clamped))} de ${String(max)}`;
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span id={id} className={cx('font-semibold', onSea ? 'text-plate' : 'text-ink')}>
          {label}
        </span>
        <span className={cx('tabular-nums', onSea ? 'text-sea-100' : 'text-ink-soft')}>{text}</span>
      </div>
      <div
        role="meter"
        aria-labelledby={id}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.round(clamped)}
        aria-valuetext={text}
        className={cx(
          'relative mt-1.5 h-2.5',
          onSea ? 'bg-sea-800' : 'border-[1px] border-ink bg-plate-sunk',
        )}
      >
        <div
          className={cx(
            'h-full transition-[width] duration-(--dur-slow) ease-out',
            tone === 'sun' && 'bg-land-sun',
            tone === 'low' && 'bg-land-low',
            tone === 'high' && 'bg-land-high',
            tone === 'ink' && (onSea ? 'bg-sea-100' : 'bg-ink'),
          )}
          style={{ width: `${String(percent)}%` }}
        />
        {mark !== undefined && (
          <span
            aria-hidden="true"
            className={cx('absolute -inset-y-1 w-0.5', onSea ? 'bg-land-sun' : 'bg-ink')}
            style={{ left: `${String((mark / max) * 100)}%` }}
          />
        )}
      </div>
    </div>
  );
}
