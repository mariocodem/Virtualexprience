import { CompassRose } from '@/ui/CompassRose';
import { cx } from '@/ui/cx';

export interface BrujulaMessage {
  text: string;
  source: 'ia' | 'local';
}

/** Brújula habla: retroalimentación y pistas, anunciadas a lectores de pantalla. */
export function BrujulaBubble({
  message,
  className,
}: {
  message: BrujulaMessage | null;
  className?: string;
}) {
  return (
    <aside aria-label="Brújula" className={cx('flex items-start gap-3', className)}>
      <CompassRose size={52} className="shrink-0 text-plate" />
      <div role="status" aria-live="polite" className="min-h-12 flex-1">
        {message && (
          <p className="bg-plate px-4 py-3 text-sm text-ink plate-rule">
            <span className="font-display font-bold">Brújula: </span>
            {message.text}
            {message.source === 'ia' && (
              <span className="ml-2 align-middle text-xs text-ink-soft">· IA</span>
            )}
          </p>
        )}
      </div>
    </aside>
  );
}
