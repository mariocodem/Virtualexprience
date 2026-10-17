import { Link, NavLink } from 'react-router';
import { cx } from '@/ui/cx';
import { Wordmark } from '@/ui/Wordmark';

const links = [
  { to: '/mundo', label: 'El mundo' },
  { to: '/pasaporte', label: 'Pasaporte' },
  { to: '/accesibilidad', label: 'Accesibilidad' },
] as const;

export function SiteHeader() {
  return (
    <header className="border-b-[1.5px] border-ink bg-plate">
      <div className="mx-auto flex max-w-[90rem] flex-wrap items-center justify-between gap-x-8 gap-y-2 px-4 py-3 sm:px-8">
        <Link to="/" className="inline-flex min-h-11 items-center text-ink no-underline">
          <Wordmark />
        </Link>
        <nav aria-label="Principal">
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-1">
            {links.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  className={({ isActive }) =>
                    cx(
                      'inline-flex min-h-11 items-center font-display font-semibold [font-stretch:100%] no-underline',
                      'decoration-[1.5px] underline-offset-[0.4em] hover:underline',
                      isActive && 'underline decoration-route',
                    )
                  }
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
