import { Link } from 'react-router';
import { Wordmark } from '@/ui/Wordmark';

/** Colofón de la plancha: quién la hizo, con qué y bajo qué licencias. */
export function LandingFooter() {
  return (
    <footer className="relative z-[1] border-t-[1.5px] border-plate/30 bg-sea-950 px-4 py-14 text-sea-100 sm:px-8">
      <div className="grid gap-10 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <Wordmark className="text-plate" />
          <p className="mt-4 max-w-[48ch] text-sm">
            Archipiélago VirtuX es una propuesta conceptual para el ecosistema VirtuXperience de
            UNIMINUTO, desarrollada como prueba técnica por Mario Mendoza Huertas.
          </p>
        </div>
        <nav aria-label="Pie de página">
          <p className="toponym text-[0.625rem] text-plate">Recorrer</p>
          <ul className="mt-3 space-y-1 text-sm">
            <li>
              <Link
                to="/mundo"
                className="inline-flex min-h-8 items-center text-sea-100 hover:text-plate"
              >
                El mundo
              </Link>
            </li>
            <li>
              <Link
                to="/pasaporte"
                className="inline-flex min-h-8 items-center text-sea-100 hover:text-plate"
              >
                Pasaporte
              </Link>
            </li>
            <li>
              <Link
                to="/accesibilidad"
                className="inline-flex min-h-8 items-center text-sea-100 hover:text-plate"
              >
                Accesibilidad
              </Link>
            </li>
            <li>
              <a
                href="https://www.uniminuto.edu/virtuxperience-home"
                className="inline-flex min-h-8 items-center text-sea-100 hover:text-plate"
                rel="noopener noreferrer"
                target="_blank"
              >
                VirtuXperience (sitio actual)
                <span className="sr-only"> (se abre en otra pestaña)</span>
              </a>
            </li>
          </ul>
        </nav>
        <div className="text-sm">
          <p className="toponym text-[0.625rem] text-plate">Colofón</p>
          <p className="mt-3">
            Relieve generado con three.js a partir de primitivas. Tipografías Archivo (Omnibus-Type)
            e Inter (Rasmus Andersson), con licencia SIL OFL.
          </p>
        </div>
      </div>
    </footer>
  );
}
