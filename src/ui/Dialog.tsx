import { useEffect, useId, useRef, type ReactNode } from 'react';
import { IconClose } from './icons';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
}

/**
 * Diálogo modal sobre `<dialog>` nativo: atrapa el foco, cierra con Esc y
 * devuelve el foco a quien lo abrió.
 */
export function Dialog({ open, onClose, title, description, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    } else if (!open && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClose={onClose}
      className="m-auto w-[min(92vw,36rem)] bg-plate p-0 text-ink plate-rule backdrop:bg-veil"
    >
      <div className="flex items-start justify-between gap-6 border-b-[1.5px] border-ink px-6 py-5">
        <div>
          <h2 id={titleId} className="display text-3xl">
            {title}
          </h2>
          {description && (
            <p id={descriptionId} className="mt-2 text-ink-soft">
              {description}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="-mr-2 inline-flex size-11 shrink-0 items-center justify-center text-ink hover:bg-plate-sunk"
          aria-label="Cerrar"
        >
          <IconClose size={22} />
        </button>
      </div>
      {children && <div className="px-6 py-5">{children}</div>}
    </dialog>
  );
}
