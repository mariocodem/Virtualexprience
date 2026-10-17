import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  EXPLORE_LINKS,
  LEGAL_LINKS,
  OMD_ENTITIES,
  POLICY_LINKS,
  SOCIAL_LINKS,
} from '@/app/footerData';
import { SiteFooter } from '@/app/SiteFooter';

describe('pie institucional', () => {
  it('tiene las secciones del pie oficial', () => {
    render(<SiteFooter />);
    for (const name of [
      'Notificaciones judiciales y/o extrajudiciales',
      'Información legal',
      'Explora',
      '¡Conéctate con la institución!',
      'Reconocimientos y certificaciones',
      'Organización Minuto de Dios',
    ]) {
      expect(screen.getByRole('heading', { name })).toBeInTheDocument();
    }
  });

  it('lista todos los enlaces legales y de exploración con su destino oficial', () => {
    render(<SiteFooter />);
    const legal = screen.getByRole('navigation', { name: 'Información legal' });
    expect(within(legal).getAllByRole('link')).toHaveLength(LEGAL_LINKS.length);
    const explora = screen.getByRole('navigation', { name: 'Explora' });
    expect(within(explora).getByRole('link', { name: /Uniminuto Radio/ })).toHaveAttribute(
      'href',
      'https://www.uniminutoradio.com.co/',
    );
    expect(within(explora).getAllByRole('link')).toHaveLength(EXPLORE_LINKS.length);
  });

  it('los enlaces externos abren en otra pestaña, lo anuncian y no filtran la página', () => {
    render(<SiteFooter />);
    for (const link of [...LEGAL_LINKS, ...POLICY_LINKS]) {
      for (const anchor of screen.getAllByRole('link', {
        name: `${link.label} (se abre en otra pestaña)`,
      })) {
        expect(anchor).toHaveAttribute('target', '_blank');
        expect(anchor).toHaveAttribute('rel', 'noopener noreferrer');
      }
    }
  });

  it('redes y entidades de la Organización Minuto de Dios tienen nombre accesible', () => {
    render(<SiteFooter />);
    for (const social of SOCIAL_LINKS) {
      expect(
        screen.getByRole('link', {
          name: `${social.label} de UNIMINUTO (se abre en otra pestaña)`,
        }),
      ).toHaveAttribute('href', social.href);
    }
    for (const entity of OMD_ENTITIES) {
      expect(
        screen.getByRole('img', { name: `${entity.label} (se abre en otra pestaña)` }),
      ).toBeInTheDocument();
    }
  });

  it('aclara que el sitio es una propuesta conceptual, no un sitio oficial', () => {
    render(<SiteFooter />);
    expect(screen.getByText(/No es un sitio oficial de UNIMINUTO/)).toBeInTheDocument();
  });
});
