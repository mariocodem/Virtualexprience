import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { cx } from '@/ui/cx';
import { Dialog } from '@/ui/Dialog';
import { IconAccessibility } from '@/ui/icons';
import { useA11yPanel } from './panelStore';
import { PreferencesForm } from './PreferencesForm';
import { canSpeak, readableText, useSpeech } from './speech';

const PAGE_ID = 'pagina';

/** El panel de accesibilidad (un solo diálogo para toda la app) y su atajo Alt+A. */
export function A11yPanel() {
  const open = useA11yPanel((s) => s.open);
  const setOpen = useA11yPanel((s) => s.setOpen);
  const reading = useSpeech((s) => s.speaking === PAGE_ID);
  const speak = useSpeech((s) => s.speak);
  const stop = useSpeech((s) => s.stop);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!event.altKey || event.ctrlKey || event.metaKey || event.code !== 'KeyA') return;
      event.preventDefault();
      setOpen(!useA11yPanel.getState().open);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
    };
  }, [setOpen]);

  const close = () => {
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Accesibilidad"
      description="Ajusta el archipiélago a tu manera. Se guarda en este equipo. Atajo: Alt + A."
    >
      {canSpeak() && (
        <div className="mb-6 border-b-[1.5px] border-ink pb-5">
          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-2 font-display font-bold underline decoration-[1.5px] underline-offset-[0.22em] hover:decoration-route"
            onClick={() => {
              if (reading) {
                stop();
                return;
              }
              const main = document.getElementById('contenido');
              if (main) speak(PAGE_ID, readableText(main));
              close();
            }}
          >
            {reading ? 'Detener la lectura de la página' : 'Leer la página en voz alta'}
          </button>
          <p className="text-sm text-ink-soft">
            También puedes escuchar cada panel del mundo con su botón «Escuchar».
          </p>
        </div>
      )}
      <PreferencesForm idPrefix="panel" />
      <p className="mt-6 border-t-[1.5px] border-ink pt-4 text-sm">
        <Link to="/accesibilidad" onClick={close}>
          Declaración de accesibilidad y atajos de teclado
        </Link>
      </p>
    </Dialog>
  );
}

/**
 * Botón fijo en la esquina: aparece cuando el de la cabecera (`data-a11y-anchor`)
 * sale de la vista, así el panel queda siempre a un clic sin tapar la página.
 */
export function FloatingA11yTrigger() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const anchor = document.querySelector('[data-a11y-anchor]');
    if (!anchor) return;
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(!entry?.isIntersecting);
    });
    observer.observe(anchor);
    return () => {
      observer.disconnect();
    };
  }, []);
  return visible ? <A11yTrigger floating /> : null;
}

/** Abre el panel de accesibilidad. `tone` según el fondo: lámina o mar. */
export function A11yTrigger({
  tone = 'plate',
  floating = false,
  anchor = false,
  className,
}: {
  tone?: 'plate' | 'sea';
  floating?: boolean;
  /** El disparador de la cabecera: el botón fijo aparece cuando este sale de la vista. */
  anchor?: boolean;
  className?: string;
}) {
  const setOpen = useA11yPanel((s) => s.setOpen);
  return (
    <button
      type="button"
      data-a11y-anchor={anchor || undefined}
      aria-keyshortcuts="Alt+A"
      onClick={() => {
        setOpen(true);
      }}
      className={cx(
        'inline-flex min-h-11 items-center gap-2 font-display text-sm font-bold',
        tone === 'plate' ? 'text-ink hover:text-route' : 'text-plate hover:text-land-sun',
        floating &&
          'fixed right-4 bottom-4 z-40 size-12 justify-center border-[1.5px] border-ink bg-plate hover:bg-plate-sunk print:hidden',
        className,
      )}
    >
      <IconAccessibility size={floating ? 26 : 20} />
      <span className={floating ? 'sr-only' : undefined}>
        Ajustes<span className="sr-only"> de accesibilidad</span>
      </span>
    </button>
  );
}
