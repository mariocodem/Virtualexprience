import { useAiStatus } from '@/ai/aiStatus';
import { cx } from '@/ui/cx';

/** Indica si Brújula y la Bruma hablan con IA en línea o en modo sin conexión (CLAUDE.md §8). */
export function AiBadge() {
  const mode = useAiStatus((s) => s.mode);
  const online = mode === 'en-linea';
  return (
    <p className="inline-flex items-center gap-2 text-xs font-semibold text-sea-100">
      <span
        aria-hidden="true"
        className={cx('size-2 rounded-full', online ? 'bg-land-low' : 'bg-sea-300')}
      />
      {online ? 'IA en línea' : 'Modo sin conexión'}
    </p>
  );
}
