import omdCarismatico from '@/assets/brand/footer/omd-centro-carismatico.png';
import omdFuegoNuevo from '@/assets/brand/footer/omd-centro-fuego-nuevo.png';
import omdCooperativa from '@/assets/brand/footer/omd-cooperativa.png';
import omdEducativa from '@/assets/brand/footer/omd-corporacion-educativa.png';
import omdCorporacion from '@/assets/brand/footer/omd-corporacion-minuto-de-dios.png';
import omdEudistas from '@/assets/brand/footer/omd-eudistas.png';
import omdEudes from '@/assets/brand/footer/omd-fundacion-eudes.png';
import omdFundases from '@/assets/brand/footer/omd-fundases.png';
import omdIndustrial from '@/assets/brand/footer/omd-industrial.png';
import omdLumen from '@/assets/brand/footer/omd-lumen.png';
import omdTecmd from '@/assets/brand/footer/omd-tecmd.png';
import recFt from '@/assets/brand/footer/reconocimiento-financial-times.png';
import recG20 from '@/assets/brand/footer/reconocimiento-g20.png';
import recIfc from '@/assets/brand/footer/reconocimiento-ifc.png';
import facebook from '@/assets/brand/footer/red-facebook.png';
import instagram from '@/assets/brand/footer/red-instagram.png';
import linkedin from '@/assets/brand/footer/red-linkedin.png';
import tiktok from '@/assets/brand/footer/red-tiktok.png';
import x from '@/assets/brand/footer/red-x.png';
import youtube from '@/assets/brand/footer/red-youtube.png';

/**
 * Contenido del pie institucional, tomado del pie oficial de uniminuto.edu el
 * 2026-10-17 (textos y enlaces tal cual; imágenes en src/assets/brand/footer).
 */

export interface FooterLink {
  label: string;
  href: string;
}

export interface FooterImage {
  src: string;
  width: number;
  height: number;
}

export const LEGAL_NOTICE = {
  title: 'Notificaciones judiciales y/o extrajudiciales',
  lines: ['Carrera 73A No. 81B – 70.', 'Edificio Diego Jaramillo - Piso 7', 'Bogotá D.C.'],
  emailIntro:
    'El siguiente correo es de uso exclusivo para juzgados, tribunales y altas cortes o requerimientos de autoridades administrativas:',
  email: 'direccion.juridica@uniminuto.edu',
};

export const LEGAL_LINKS: FooterLink[] = [
  {
    label: 'Derechos Pecuniarios',
    href: 'https://www.uniminuto.edu/documentos-juridicos-uniminuto',
  },
  {
    label: 'Documentos institucionales y normatividad interna general',
    href: 'https://www.uniminuto.edu/documentos-juridicos-uniminuto',
  },
  {
    label: 'Reglamento estudiantil',
    href: 'https://www.uniminuto.edu/reglamento-estudiantil-uniminuto',
  },
  {
    label: 'Reglamento profesoral',
    href: 'https://portalweb-uniminuto.s3.us-east-1.amazonaws.com/activos_digitales/DocInstitucionales/Profesores/6-Acuerdo%20No%20309%20Reglamento%20Profesoral%20-2021.pdf',
  },
  {
    label: 'Política de bienestar universitario',
    href: 'https://portalweb-uniminuto.s3.amazonaws.com/activos_digitales/DocInstitucionales/Politicas/Poli%CC%81tica+de+Bienestar+-+Acuerdo+No.+387+del+2022.pdf',
  },
  {
    label: 'Política de protección de datos personales',
    href: 'https://portalweb-uniminuto.s3.us-east-1.amazonaws.com/activos_digitales/Acuerdo+No+397+Politica+Tratamiento+de+Informacio%CC%81n+(Habeas+Data)+2023.pdf',
  },
];

export const EXPLORE_LINKS: FooterLink[] = [
  { label: 'Uniminuto Radio', href: 'https://www.uniminutoradio.com.co/' },
  {
    label: 'Espacios para Eventos UNIMINUTO',
    href: 'https://www.uniminuto.edu/alquiler-de-espacios-uniminuto',
  },
  { label: 'Calidad y procesos', href: 'https://www.uniminuto.edu/calidad' },
  { label: 'Centro de Educación para el Desarrollo', href: 'https://www.uniminuto.edu/ced' },
  {
    label: 'Centro de Formación para la Nueva Evangelización',
    href: 'http://www.nuevaevangelizacion.com.co/',
  },
  {
    label: 'Centro Rafael García Herreros – Pensamiento Social de la Iglesia',
    href: 'https://sites.google.com/view/cprgh',
  },
  { label: 'Publicaciones', href: 'https://centroeditorial.uniminuto.edu/' },
  { label: 'Unicorporativa', href: 'https://unicorporativa.uniminuto.edu/' },
  {
    label: 'Trabaja con nosotros - UNIMINUTO',
    href: 'https://career19.sapsf.com/career?company=corporac04',
  },
  { label: 'Trabaja con nosotros - OMD', href: 'https://www.uniminuto.edu/ofertas-laborales-omd' },
];

export const SOCIAL_LINKS: (FooterLink & { icon: string })[] = [
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/profile.php?id=61561333796607&locale=es_ES',
    icon: facebook,
  },
  {
    label: 'YouTube',
    href: 'https://www.youtube.com/channel/UCYripsaQMUFIufEMKisPTsw',
    icon: youtube,
  },
  { label: 'X (Twitter)', href: 'https://twitter.com/uniminutocol', icon: x },
  { label: 'LinkedIn', href: 'https://es.linkedin.com/school/uniminutocol/', icon: linkedin },
  { label: 'Instagram', href: 'https://www.instagram.com/uniminutocol/', icon: instagram },
  { label: 'TikTok', href: 'https://www.tiktok.com/@uniminutocolombia', icon: tiktok },
];

export const CONTACT_LINES: (FooterLink & { prefix: string })[] = [
  { prefix: 'En Bogotá:', label: '+57 6015933004', href: 'tel:+576015933004' },
  { prefix: 'Línea nacional gratuita:', label: '01 8000 11 93 90', href: 'tel:018000119390' },
];

/** Galardones: el texto alternativo transcribe el texto de cada imagen. */
export const AWARDS: (FooterImage & { alt: string })[] = [
  {
    src: recG20,
    width: 123,
    height: 60,
    alt: 'Reconocimiento en la Cumbre de líderes del G20 por «Innovación en negocios incluyentes».',
  },
  {
    src: recIfc,
    width: 213,
    height: 60,
    alt: '«Líder mundial en negocios incluyentes» por la Corporación Financiera Internacional del Banco Mundial.',
  },
  {
    src: recFt,
    width: 213,
    height: 60,
    alt: 'Galardón «Finanzas Sostenibles», diario Financial Times de Londres.',
  },
];

export const OMD_ENTITIES: (FooterLink & FooterImage)[] = [
  {
    label: 'Lumen Televisión',
    href: 'http://www.lumencolombia.com/',
    src: omdLumen,
    width: 101,
    height: 30,
  },
  { label: 'TecMD', href: 'https://tecmd.edu.co/', src: omdTecmd, width: 102, height: 60 },
  {
    label: 'Corporación Educativa Minuto de Dios',
    href: 'http://www.colegiosminutodedios.edu.co/cemid/index.php',
    src: omdEducativa,
    width: 101,
    height: 44,
  },
  {
    label: 'Corporación Centro Fuego Nuevo',
    href: 'http://www.nuevaevangelizacion.com.co/',
    src: omdFuegoNuevo,
    width: 93,
    height: 53,
  },
  {
    label: 'Corporación Minuto de Dios',
    href: 'https://www.minutodedios.org/',
    src: omdCorporacion,
    width: 101,
    height: 43,
  },
  {
    label: 'Corporación Centro Carismático Minuto de Dios',
    href: 'http://minutodedios.fm/en-vivo/',
    src: omdCarismatico,
    width: 197,
    height: 44,
  },
  {
    label: 'Minuto de Dios Industrial',
    href: 'http://www.mdc.org.co/',
    src: omdIndustrial,
    width: 97,
    height: 60,
  },
  {
    label: 'Fundación Eudes',
    href: 'http://www.cjm.org/index.php/es/',
    src: omdEudes,
    width: 47,
    height: 67,
  },
  { label: 'Fundases', href: 'https://www.fundases.net/', src: omdFundases, width: 51, height: 54 },
  {
    label: 'Eudistas',
    href: 'http://www.cjm.org/index.php/es/',
    src: omdEudistas,
    width: 63,
    height: 67,
  },
  {
    label: 'Cooperativa Minuto de Dios',
    href: 'https://coopminutodedios.com/',
    src: omdCooperativa,
    width: 149,
    height: 57,
  },
];

export const POLICY_LINKS: FooterLink[] = [
  {
    label: 'Política de protección de datos',
    href: 'https://portalweb-uniminuto.s3.us-east-1.amazonaws.com/activos_digitales/DocInstitucionales/Politicas/Apoyo/1.POLITICA_DE_PROTECCION_DE_DATOS.pdf',
  },
  {
    label: 'Política de seguridad de la información',
    href: 'https://portalweb-uniminuto.s3.amazonaws.com/activos_digitales/DocInstitucionales/Politicas/Apoyo/Politica_de_Seguridad_Informacion.pdf',
  },
  {
    label: 'Política de tratamiento de la información',
    href: 'https://portalweb-uniminuto.s3.amazonaws.com/activos_digitales/Acuerdo+No+397+Actualiza+y+Aprueba+Politica+de+Tratamiento+de+Informaci%C3%B3n.pdf',
  },
];

export const LEGAL_LINES = [
  'Todos los derechos Reservados. UNIMINUTO 2020©',
  'Institución de Educación Superior sujeta a inspección y vigilancia por el Ministerio de Educación Nacional',
  'Personería jurídica: Resolución 10345 del 1 de agosto de 1990 MEN',
  'CORPORACIÓN UNIVERSITARIA MINUTO DE DIOS',
];
