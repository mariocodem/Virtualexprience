import { useId, useState } from 'react';
import { Link, NavLink } from 'react-router';
import { cx } from '@/ui/cx';
import { IconPlus } from '@/ui/icons';
import { Wordmark } from '@/ui/Wordmark';

const links = [
  { to: '/mundo', label: 'El mundo' },
  { to: '/pasaporte', label: 'Pasaporte' },
  { to: '/accesibilidad', label: 'Accesibilidad' },
] as const;

/** Margen superior de la plancha: wordmark y navegación. En móvil, una sola fila con menú. */
export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const menuId = useId();

  return (
    <header className="relative z-10 border-b-[1.5px] border-ink bg-plate">
      <div className="mx-auto flex max-w-[90rem] flex-wrap items-center justify-between gap-x-8 px-4 py-2 sm:px-8 sm:py-3">
        <Link to="/" className="inline-flex min-h-11 items-center text-ink no-underline">
          <Wordmark />
        </Link>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => {
            setOpen((v) => !v);
          }}
          className="inline-flex min-h-11 items-center gap-2 px-1 font-display font-semibold sm:hidden"
        >
          Menú
          <IconPlus
            size={18}
            className={cx('transition-transform duration-(--dur-fast)', open && 'rotate-45')}
          />
        </button>
        <nav
          id={menuId}
          aria-label="Principal"
          className={cx('w-full sm:block sm:w-auto', open ? 'block' : 'hidden')}
        >
          <ul className="flex flex-col pb-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:pb-0">
            {links.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  onClick={() => {
                    setOpen(false);
                  }}
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
