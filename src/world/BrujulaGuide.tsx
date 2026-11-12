import { ButtonLink } from '@/ui/ButtonLink';
import { buttonClasses } from '@/ui/buttonStyles';
import { IconClose, IconCompass } from '@/ui/icons';
import type { GuideMessage } from './guide';
import { useGuide } from './guideStore';

/**
 * Cartela de Brújula: dice en una frase hacia dónde sigue el sendero y lleva
 * allá con un botón. En el mapa la acompañan la brújula que flota sobre la
 * escala y el tramo del sendero que se ilumina. Se puede ocultar (se recuerda).
 */
export function BrujulaGuide({ message }: { message: GuideMessage }) {
  const open = useGuide((s) => s.open);
  const setOpen = useGuide((s) => s.setOpen);

  if (!open) {
    return (
      <button
        type="button"
        aria-expanded={false}
        onClick={() => {
          setOpen(true);
        }}
        className={buttonClasses({ variant: 'secondary', className: 'mt-4 self-start' })}
      >
        <IconCompass size={20} />
        Brújula: ¿hacia dónde sigo?
      </button>
    );
  }

  return (
    <section
      id="guia-brujula"
      aria-labelledby="guia-titulo"
      className="relative mt-4 border-[1.5px] border-ink bg-plate-sunk p-4 pr-12"
    >
      <div className="flex items-start gap-3">
        <IconCompass size={30} className="mt-0.5 shrink-0 text-sea-700" />
        <div className="min-w-0">
          <h2 id="guia-titulo" className="toponym text-ink-soft">
            Brújula
          </h2>
          <p className="mt-1.5">{message.text}</p>
          {message.action && (
            <ButtonLink to={message.action.to} className="mt-3">
              {message.action.label}
            </ButtonLink>
          )}
        </div>
      </div>
      <button
        type="button"
        aria-expanded={true}
        onClick={() => {
          setOpen(false);
        }}
        className="absolute top-2 right-2 inline-flex size-11 items-center justify-center hover:bg-plate-sunk"
        aria-label="Ocultar la guía de Brújula"
      >
        <IconClose size={20} />
      </button>
    </section>
  );
}
