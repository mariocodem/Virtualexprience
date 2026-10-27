import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { cx } from './cx';
import { IconClose } from './icons';
import { ToastContext, type ToastApi, type ToastInput, type ToastTone } from './toastContext';

interface Toast extends ToastInput {
  id: number;
}

const LIFETIME_MS = 6000;

const toneMark: Record<ToastTone, string> = {
  info: 'bg-sea-500',
  success: 'bg-land-low',
  progress: 'bg-route',
};

/** Avisos breves anunciados por una región viva educada (`role="status"`). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback((toast: ToastInput) => {
    nextId.current += 1;
    const id = nextId.current;
    setToasts((current) => [...current.slice(-2), { ...toast, id }]);
  }, []);

  const api = useMemo<ToastApi>(() => ({ notify }), [notify]);

  return (
    <ToastContext value={api}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 left-4 z-50 flex w-[min(92vw,24rem)] flex-col gap-2 print:hidden"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const [paused, setPaused] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Pausa el temporizador mientras el puntero o el foco están sobre el aviso (WCAG 2.2.1).
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const pause = () => {
      setPaused(true);
    };
    const resume = () => {
      setPaused(false);
    };
    node.addEventListener('pointerenter', pause);
    node.addEventListener('pointerleave', resume);
    node.addEventListener('focusin', pause);
    node.addEventListener('focusout', resume);
    return () => {
      node.removeEventListener('pointerenter', pause);
      node.removeEventListener('pointerleave', resume);
      node.removeEventListener('focusin', pause);
      node.removeEventListener('focusout', resume);
    };
  }, []);

  useEffect(() => {
    if (paused) return;
    const timer = window.setTimeout(() => {
      onDismiss(toast.id);
    }, LIFETIME_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [paused, toast.id, onDismiss]);

  return (
    <div
      ref={ref}
      className="pointer-events-auto flex items-start gap-3 bg-plate py-3 pr-2 pl-4 plate-rule"
    >
      <span
        aria-hidden="true"
        className={cx('mt-1.5 size-2.5 shrink-0', toneMark[toast.tone ?? 'info'])}
      />
      <div className="min-w-0 flex-1">
        <p className="font-display font-bold">{toast.title}</p>
        {toast.description && <p className="text-sm text-ink-soft">{toast.description}</p>}
      </div>
      <button
        type="button"
        onClick={() => {
          onDismiss(toast.id);
        }}
        className="inline-flex size-9 shrink-0 items-center justify-center hover:bg-plate-sunk"
        aria-label="Descartar aviso"
      >
        <IconClose size={18} />
      </button>
    </div>
  );
}
