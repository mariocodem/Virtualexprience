import logoWhite from '@/assets/brand/footer/uniminuto-blanco.png';
import seloIcontec from '@/assets/brand/footer/sello-icontec-iso-9001.png';
import seloIqnet from '@/assets/brand/footer/sello-iqnet.png';
import {
  AWARDS,
  CONTACT_LINES,
  EXPLORE_LINKS,
  LEGAL_LINES,
  LEGAL_LINKS,
  LEGAL_NOTICE,
  OMD_ENTITIES,
  POLICY_LINKS,
  SOCIAL_LINKS,
  type FooterLink,
} from './footerData';

const NEW_TAB = '(se abre en otra pestaña)';

function ExternalLink({ link, className }: { link: FooterLink; className?: string }) {
  return (
    <a href={link.href} target="_blank" rel="noopener noreferrer" className={className}>
      {link.label} <span className="sr-only">{NEW_TAB}</span>
    </a>
  );
}

function ColumnTitle({ children, id }: { children: string; id: string }) {
  return (
    <h2
      id={id}
      className="font-display text-[0.8125rem] font-bold tracking-[0.04em] text-land-sun uppercase"
    >
      {children}
    </h2>
  );
}

const linkClass =
  'inline-flex min-h-8 items-center text-sm text-plate no-underline decoration-land-sun decoration-[1.5px] underline-offset-4 hover:underline';

/**
 * Pie institucional, con el contenido y los enlaces del pie oficial de UNIMINUTO.
 * Va en todas las páginas, sobre el canvas compartido del relieve.
 */
export function SiteFooter() {
  return (
    <footer className="on-sea relative z-[1] bg-sea-950 text-plate">
      <div className="mx-auto max-w-[90rem] px-4 pt-14 pb-10 sm:px-8">
        <div className="grid gap-x-10 gap-y-12 md:grid-cols-2 xl:grid-cols-[1.15fr_1fr_1.15fr_1fr]">
          <section aria-labelledby="pie-notificaciones">
            <a
              href="https://www.uniminuto.edu/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block"
            >
              <img
                src={logoWhite}
                width={200}
                height={48}
                alt={`UNIMINUTO, Corporación Universitaria Minuto de Dios ${NEW_TAB}`}
                loading="lazy"
              />
            </a>
            <div className="mt-10">
              <ColumnTitle id="pie-notificaciones">{LEGAL_NOTICE.title}</ColumnTitle>
              <address className="mt-2 text-sm leading-relaxed not-italic">
                {LEGAL_NOTICE.lines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
                <span className="mt-1 block max-w-[46ch]">{LEGAL_NOTICE.emailIntro}</span>
                <a
                  href={`mailto:${LEGAL_NOTICE.email}`}
                  className="text-plate decoration-land-sun underline-offset-4 hover:underline"
                >
                  {LEGAL_NOTICE.email}
                </a>
              </address>
            </div>
          </section>

          <nav aria-labelledby="pie-legal">
            <ColumnTitle id="pie-legal">Información legal</ColumnTitle>
            <ul className="mt-4">
              {LEGAL_LINKS.map((link) => (
                <li key={link.label}>
                  <ExternalLink link={link} className={linkClass} />
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-labelledby="pie-explora">
            <ColumnTitle id="pie-explora">Explora</ColumnTitle>
            <ul className="mt-4">
              {EXPLORE_LINKS.map((link) => (
                <li key={link.label}>
                  <ExternalLink link={link} className={linkClass} />
                </li>
              ))}
            </ul>
          </nav>

          <section aria-labelledby="pie-redes">
            <ColumnTitle id="pie-redes">¡Conéctate con la institución!</ColumnTitle>
            <ul className="mt-4 flex flex-wrap gap-1">
              {SOCIAL_LINKS.map((social) => (
                <li key={social.label}>
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex size-11 items-center justify-center"
                  >
                    <img
                      src={social.icon}
                      width={30}
                      height={30}
                      alt={`${social.label} de UNIMINUTO ${NEW_TAB}`}
                      loading="lazy"
                    />
                  </a>
                </li>
              ))}
            </ul>
            <h3 className="mt-8 text-sm font-bold">Contáctanos</h3>
            <ul className="mt-2 text-sm">
              {CONTACT_LINES.map((line) => (
                <li key={line.href}>
                  {line.prefix}{' '}
                  <a
                    href={line.href}
                    className="inline-flex min-h-8 items-center text-plate tabular-nums decoration-land-sun underline-offset-4 hover:underline"
                  >
                    {line.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section aria-labelledby="pie-reconocimientos" className="mt-16 text-center">
          <ColumnTitle id="pie-reconocimientos">Reconocimientos y certificaciones</ColumnTitle>
          <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-12 gap-y-8">
            <li className="flex flex-col items-center gap-2">
              <img
                src={seloIcontec}
                width={66}
                height={96}
                alt="Certificación ICONTEC ISO 9001"
                loading="lazy"
              />
              <span className="text-sm tabular-nums">SC-CER367540</span>
            </li>
            <li>
              <img
                src={seloIqnet}
                width={101}
                height={96}
                alt="IQNet, certificación reconocida"
                loading="lazy"
              />
            </li>
            <li aria-hidden="true" className="hidden h-24 w-px bg-plate/50 lg:block" />
            {AWARDS.map((award) => (
              <li key={award.alt}>
                <img
                  src={award.src}
                  width={award.width}
                  height={award.height}
                  alt={award.alt}
                  loading="lazy"
                />
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="pie-omd" className="mt-16 text-center">
          <ColumnTitle id="pie-omd">Organización Minuto de Dios</ColumnTitle>
          <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-8">
            {OMD_ENTITIES.map((entity) => (
              <li key={entity.label}>
                <a
                  href={entity.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-11 items-center opacity-90 transition-opacity duration-(--dur-fast) hover:opacity-100"
                >
                  <img
                    src={entity.src}
                    width={entity.width}
                    height={entity.height}
                    style={{ height: entity.height, width: 'auto' }}
                    alt={`${entity.label} ${NEW_TAB}`}
                    loading="lazy"
                  />
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="border-t border-plate/20">
        <div className="mx-auto max-w-[90rem] px-4 py-6 text-center sm:px-8">
          <ul className="flex flex-wrap items-center justify-center gap-y-2">
            {POLICY_LINKS.map((link) => (
              <li
                key={link.label}
                className="px-4 not-last:border-r not-last:border-sea-500 max-sm:not-last:border-r-0"
              >
                <ExternalLink
                  link={link}
                  className="inline-flex min-h-8 items-center text-sm text-land-sun no-underline decoration-[1.5px] underline-offset-4 hover:underline"
                />
              </li>
            ))}
          </ul>
          <div className="mt-5 space-y-1 text-xs text-sea-100">
            {LEGAL_LINES.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
          <p className="mt-5 text-xs text-sea-100">
            Archipiélago VirtuX es una propuesta conceptual para el ecosistema VirtuXperience,
            desarrollada como prueba técnica por Mario Mendoza Huertas. No es un sitio oficial de
            UNIMINUTO.
          </p>
        </div>
      </div>
    </footer>
  );
}
