import { ButtonLink } from '@/ui/ButtonLink';
import { IconArrowRight } from '@/ui/icons';

/**
 * Landing provisional de la Fase 1: la cartela del título sobre la plancha.
 * La plancha completa (hero 3D, secciones y ruta de scroll) llega en la Fase 3.
 */
export default function LandingPage() {
  return (
    <div className="mx-auto max-w-[90rem] px-4 py-12 sm:px-8 sm:py-20">
      <title>Archipiélago VirtuX · Aprende explorando</title>
      <section aria-labelledby="hero-titulo" className="max-w-2xl bg-plate p-8 plate-rule sm:p-10">
        <h1 id="hero-titulo" className="display text-[clamp(3rem,7vw,5.5rem)]">
          Aprende explorando. <span className="text-sea-700">Enciende el Faro.</span>
        </h1>
        <p className="mt-6 max-w-[46ch] text-lg text-ink-soft">
          Seis islas, seis rutas de aprendizaje y un faro que espera tu luz. Explora, practica y
          recupera los fragmentos.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <ButtonLink to="/mundo" size="lg">
            Entrar al mundo
          </ButtonLink>
          <ButtonLink to="/mundo" size="lg" variant="secondary">
            Ver cómo funciona
          </ButtonLink>
        </div>
        <ButtonLink to="/mundo?demo=1" variant="quiet" className="mt-5 gap-2">
          Recorrido rápido con progreso precargado
          <IconArrowRight size={18} />
        </ButtonLink>
      </section>
    </div>
  );
}
