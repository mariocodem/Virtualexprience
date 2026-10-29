import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { Link, NavLink } from 'react-router';
import logo from '@/assets/brand/header/uniminuto-header.png';
import { A11yTrigger } from '@/a11y/A11yPanel';
import { cx } from '@/ui/cx';
import {
  IconArrowRight,
  IconChevronDown,
  IconClose,
  IconMenu,
  IconPhone,
  IconPin,
  IconUser,
} from '@/ui/icons';
import {
  CONTACTO,
  DONACION,
  INSCRIBETE,
  isMegaMenu,
  MAIN_MENUS,
  SEDES,
  SOY,
  type MegaMenu,
  type NavItem,
} from './headerData';

const NEW_TAB = '(se abre en otra pestaña)';

const APP_LINKS = [
  { to: '/mundo', label: 'El mundo' },
  { to: '/pasaporte', label: 'Pasaporte' },
  { to: '/accesibilidad', label: 'Accesibilidad' },
] as const;

type OpenState = { id: string; via: 'hover' | 'click' } | null;

function External({ item, className }: { item: NavItem; className?: string }) {
  return (
    <a href={item.href} target="_blank" rel="noopener noreferrer" className={className}>
      {item.label} <span className="sr-only">{NEW_TAB}</span>
    </a>
  );
}

/** Abre con el puntero (ratón) tras una pausa breve y cierra al salir: intención, no paso casual. */
function useHoverIntent(
  ref: RefObject<HTMLElement | null>,
  onEnter: () => void,
  onLeave: () => void,
) {
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    let timer = 0;
    const enter = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      window.clearTimeout(timer);
      timer = window.setTimeout(onEnter, 120);
    };
    const leave = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      window.clearTimeout(timer);
      timer = window.setTimeout(onLeave, 220);
    };
    node.addEventListener('pointerenter', enter);
    node.addEventListener('pointerleave', leave);
    return () => {
      window.clearTimeout(timer);
      node.removeEventListener('pointerenter', enter);
      node.removeEventListener('pointerleave', leave);
    };
  }, [ref, onEnter, onLeave]);
}

interface DisclosureProps {
  menu: MegaMenu;
  open: OpenState;
  setOpen: (state: OpenState) => void;
  trigger: ReactNode;
  triggerClassName: string;
  /** `popover`: lista bajo el disparador. `mega`: panel a todo el ancho de la barra. */
  kind: 'popover' | 'mega';
}

function Disclosure({ menu, open, setOpen, trigger, triggerClassName, kind }: DisclosureProps) {
  const item = useRef<HTMLLIElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const isOpen = open?.id === menu.id;

  const onEnter = useCallback(() => {
    setOpen({ id: menu.id, via: 'hover' });
  }, [menu.id, setOpen]);
  const onLeave = useCallback(() => {
    if (open?.id === menu.id && open.via === 'hover') setOpen(null);
  }, [menu.id, open, setOpen]);
  useHoverIntent(item, onEnter, onLeave);

  // Esc cierra y devuelve el foco al disparador.
  useEffect(() => {
    if (!isOpen) return;
    // En captura y marcado como usado: Esc cierra el menú y nada más (no saca del mundo).
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(null);
        button.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
    };
  }, [isOpen, setOpen]);

  return (
    <li ref={item} className={kind === 'popover' ? 'relative' : undefined}>
      <button
        ref={button}
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => {
          if (isOpen && open.via === 'hover') setOpen({ id: menu.id, via: 'click' });
          else setOpen(isOpen ? null : { id: menu.id, via: 'click' });
        }}
        className={triggerClassName}
      >
        {trigger}
      </button>
      <div
        id={panelId}
        hidden={!isOpen}
        className={cx(
          'z-30 text-ink',
          kind === 'popover'
            ? 'absolute top-full right-0 mt-2 min-w-60 border-t-4 border-land-sun bg-plate py-2'
            : 'absolute inset-x-0 top-full border-t-4 border-land-sun bg-plate',
        )}
      >
        {kind === 'popover' ? (
          <ul>
            {menu.groups
              .flatMap((group) => group.links)
              .map((entry) => (
                <li key={entry.label}>
                  <External
                    item={entry}
                    className="flex min-h-11 items-center px-5 text-sm text-ink no-underline hover:bg-plate-sunk hover:text-sea-700"
                  />
                </li>
              ))}
          </ul>
        ) : (
          <MegaPanel menu={menu} />
        )}
      </div>
    </li>
  );
}

function MegaPanel({ menu }: { menu: MegaMenu }) {
  return (
    <div className="mx-auto max-w-[90rem] px-10 py-8">
      {menu.overview && (
        <External
          item={menu.overview}
          className="mb-6 inline-flex min-h-11 items-center gap-2 font-display font-bold text-sea-700 no-underline hover:underline"
        />
      )}
      <div className="grid grid-cols-4 gap-x-10 gap-y-6">
        {menu.groups.map((group, index) => (
          <div key={group.title ?? index}>
            {group.title && (
              <p className="mb-2 font-display text-[0.8125rem] font-bold tracking-[0.04em] text-sea-700 uppercase">
                {group.title}
              </p>
            )}
            <ul>
              {group.links.map((entry) => (
                <li key={entry.label}>
                  <External
                    item={entry}
                    className="inline-flex min-h-8 items-center text-sm text-ink no-underline decoration-sea-700 decoration-[1.5px] underline-offset-4 hover:underline"
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

const mainTrigger =
  'inline-flex min-h-11 items-center gap-1 font-display text-[0.8125rem] font-bold tracking-[0.03em] text-plate uppercase hover:text-land-sun aria-expanded:text-land-sun';

/**
 * Encabezado institucional con la navegación del portal oficial de UNIMINUTO, y
 * debajo la franja propia de Archipiélago VirtuX con las rutas de la app.
 */
export function SiteHeader() {
  const [open, setOpen] = useState<OpenState>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const header = useRef<HTMLElement>(null);
  const mobileId = useId();

  // Publica la altura del encabezado para que el mundo ocupe exactamente el resto de la pantalla.
  useEffect(() => {
    const node = header.current;
    if (!node) return;
    const observer = new ResizeObserver(() => {
      document.documentElement.style.setProperty('--header-h', `${String(node.offsetHeight)}px`);
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, []);

  // Un clic fuera del encabezado cierra cualquier menú.
  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) setOpen(null);
    };
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  return (
    <header ref={header} className="on-sea relative z-20 bg-uni-navy text-plate print:hidden">
      <div className="mx-auto flex max-w-[120rem] items-center justify-between gap-6 px-4 py-2 lg:px-10">
        <Link to="/" className="inline-flex min-h-11 items-center">
          <img
            src={logo}
            width={263}
            height={71}
            alt="UNIMINUTO, Corporación Universitaria Minuto de Dios"
            className="h-10 w-auto lg:h-[3.25rem]"
          />
          <span className="sr-only">: inicio de Archipiélago VirtuX</span>
        </Link>

        <ul className="hidden items-center gap-7 lg:flex">
          <li>
            <a
              href={SEDES.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-plate no-underline hover:text-land-sun"
            >
              <IconPin size={18} className="text-land-sun" />
              {SEDES.label} <span className="sr-only">{NEW_TAB}</span>
            </a>
          </li>
          <Disclosure
            menu={SOY}
            open={open}
            setOpen={setOpen}
            kind="popover"
            triggerClassName="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-plate hover:text-land-sun aria-expanded:text-land-sun"
            trigger={
              <>
                <IconUser size={18} className="text-land-sun" />
                Soy
                <IconChevronDown size={14} />
              </>
            }
          />
          <li>
            <a
              href={CONTACTO.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-plate no-underline hover:text-land-sun"
            >
              <IconPhone size={18} className="text-land-sun" />
              {CONTACTO.label} <span className="sr-only">{NEW_TAB}</span>
            </a>
          </li>
          <Disclosure
            menu={INSCRIBETE}
            open={open}
            setOpen={setOpen}
            kind="popover"
            triggerClassName="inline-flex min-h-12 items-center gap-2 rounded-[6px] bg-land-sun px-8 font-display text-lg font-bold text-sea-700 hover:brightness-105"
            trigger={
              <>
                Inscríbete Gratis
                <IconArrowRight size={20} />
              </>
            }
          />
        </ul>

        <button
          type="button"
          aria-expanded={mobileOpen}
          aria-controls={mobileId}
          onClick={() => {
            setMobileOpen((v) => !v);
          }}
          className="inline-flex min-h-11 items-center gap-2 px-1 font-display font-semibold text-plate lg:hidden"
        >
          {mobileOpen ? <IconClose size={22} /> : <IconMenu size={22} />}
          Menú
        </button>
      </div>

      <nav aria-label="UNIMINUTO" className="relative hidden lg:block">
        <ul className="mx-auto flex max-w-[120rem] items-center justify-center gap-x-9 px-10 pb-2">
          {MAIN_MENUS.map((entry) =>
            isMegaMenu(entry) ? (
              <Disclosure
                key={entry.id}
                menu={entry}
                open={open}
                setOpen={setOpen}
                kind="mega"
                triggerClassName={mainTrigger}
                trigger={
                  <>
                    {entry.label}
                    <IconChevronDown size={14} />
                  </>
                }
              />
            ) : (
              <li key={entry.label}>
                <External item={entry} className={cx(mainTrigger, 'no-underline')} />
              </li>
            ),
          )}
          <li>
            <External
              item={DONACION}
              className="inline-flex min-h-10 items-center rounded-[6px] bg-uni-violet px-4 font-display text-[0.8125rem] font-bold tracking-[0.03em] text-plate uppercase no-underline hover:brightness-110"
            />
          </li>
        </ul>
      </nav>

      <MobileMenu id={mobileId} open={mobileOpen} />

      <div className="border-b-[1.5px] border-ink bg-plate text-ink">
        <div className="mx-auto flex max-w-[120rem] items-center justify-between gap-6 px-4 lg:px-10">
          <Link
            to="/"
            className="hidden min-h-10 items-center toponym text-[0.6875rem] font-extrabold text-ink no-underline sm:inline-flex"
          >
            Virtual Experience
          </Link>
          <div className="flex items-center gap-x-6">
            <nav aria-label="Archipiélago VirtuX">
              <ul className="flex flex-wrap items-center gap-x-6">
                {APP_LINKS.map((entry) => (
                  <li key={entry.to}>
                    <NavLink
                      to={entry.to}
                      className={({ isActive }) =>
                        cx(
                          'inline-flex min-h-10 items-center font-display text-sm font-semibold no-underline',
                          'decoration-[1.5px] underline-offset-[0.4em] hover:underline',
                          isActive && 'underline decoration-route',
                        )
                      }
                    >
                      {entry.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
            <A11yTrigger anchor className="min-h-10 border-l-[1.5px] border-ink pl-6" />
          </div>
        </div>
      </div>
    </header>
  );
}

/** En pantallas pequeñas, toda la navegación institucional en acordeones nativos. */
function MobileMenu({ id, open }: { id: string; open: boolean }) {
  const groupLinks = (menu: MegaMenu) => (
    <details key={menu.id} className="group border-t border-plate/15">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 font-display text-sm font-bold text-plate uppercase">
        {menu.label}
        <IconChevronDown size={16} className="transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-4 pb-3">
        {menu.overview && (
          <External
            item={menu.overview}
            className="flex min-h-10 items-center text-sm font-semibold text-land-sun"
          />
        )}
        {menu.groups.map((group, index) => (
          <div key={group.title ?? index} className="mt-1">
            {group.title && (
              <p className="pt-2 text-xs font-bold tracking-[0.04em] text-sea-100 uppercase">
                {group.title}
              </p>
            )}
            <ul>
              {group.links.map((entry) => (
                <li key={entry.label}>
                  <External
                    item={entry}
                    className="flex min-h-10 items-center text-sm text-plate no-underline"
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </details>
  );

  return (
    <nav
      id={id}
      aria-label="UNIMINUTO"
      hidden={!open}
      className="border-t border-plate/15 pb-4 lg:hidden"
    >
      <ul className="px-4 py-2">
        <li>
          <External
            item={SEDES}
            className="flex min-h-11 items-center text-sm font-semibold text-plate no-underline"
          />
        </li>
        <li>
          <External
            item={CONTACTO}
            className="flex min-h-11 items-center text-sm font-semibold text-plate no-underline"
          />
        </li>
      </ul>
      {groupLinks(SOY)}
      {groupLinks(INSCRIBETE)}
      {MAIN_MENUS.map((entry) =>
        isMegaMenu(entry) ? (
          groupLinks(entry)
        ) : (
          <div key={entry.label} className="border-t border-plate/15 px-4">
            <External
              item={entry}
              className="flex min-h-12 items-center font-display text-sm font-bold text-plate uppercase no-underline"
            />
          </div>
        ),
      )}
      <div className="border-t border-plate/15 px-4 pt-4">
        <External
          item={DONACION}
          className="inline-flex min-h-11 items-center rounded-[6px] bg-uni-violet px-4 font-display text-sm font-bold text-plate uppercase no-underline"
        />
      </div>
    </nav>
  );
}
