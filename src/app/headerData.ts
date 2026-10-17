/**
 * Navegación institucional, tomada del encabezado oficial de uniminuto.edu el
 * 2026-10-17 (textos y destinos tal cual). Las noticias de los menús se omiten:
 * cambian a diario y aquí quedarían desactualizadas.
 */

const SITE = 'https://www.uniminuto.edu';
const abs = (href: string) => (href.startsWith('/') ? `${SITE}${href}` : href);

export interface NavItem {
  label: string;
  href: string;
}

export interface NavGroup {
  title?: string;
  links: NavItem[];
}

export interface MegaMenu {
  id: string;
  label: string;
  /** Enlace de entrada al tema, si el oficial lo tiene. */
  overview?: NavItem;
  groups: NavGroup[];
}

const link = (label: string, href: string): NavItem => ({ label, href: abs(href) });

export const SEDES = link('Nuestras sedes', 'https://www.uniminuto.edu/encuentra-tu-sede');
export const CONTACTO = link('Contáctanos', '/contactanos');

export const SOY: MegaMenu = {
  id: 'soy',
  label: 'Soy',
  groups: [
    {
      links: [
        link('Aspirante', 'https://www.uniminuto.edu/estudia-en-uniminuto'),
        link('Aliado y benefactor', 'https://www.uniminuto.edu/donaciones'),
        link('Colaborador', 'http://talentosinnovadores.uniminuto.edu'),
        link('Estudiante', 'https://www.uniminuto.edu/soy-estudiante'),
        link('Egresado', 'https://www.clubviveuniminuto.org/'),
        link(
          'Proveedor',
          'https://proveedores.uniminuto.edu/portalproveedores/Account/Login?ReturnUrl=%2Fportalproveedores',
        ),
        link('Profesor', '/profesor-uniminuto'),
      ],
    },
  ],
};

export const INSCRIBETE: MegaMenu = {
  id: 'inscribete',
  label: 'Inscríbete Gratis',
  groups: [
    {
      links: [
        link('Ir a inscribirme', '/aspirantes'),
        link('Conocer toda la oferta', '/oferta-academica'),
        link(
          'Estudia Virtual',
          'https://server8.datacrm.la/datacrm/uniminuto/landingv2/public/campaigns/landing-dirreccion-mercadeo#contact',
        ),
      ],
    },
  ],
};

export const MAIN_MENUS: (MegaMenu | NavItem)[] = [
  {
    id: 'sistema',
    label: 'Sistema Uniminuto',
    groups: [
      {
        title: 'Acerca de UNIMINUTO',
        links: [
          link('Historia', '/historia-uniminuto'),
          link('Misión y Megas', '/mision'),
          link('Gobierno Institucional', 'https://www.uniminuto.edu/gobierno-institucional'),
          link('Principios', 'https://www.uniminuto.edu/principios'),
          link('Alianzas y redes', 'https://www.uniminuto.edu/alianzas-y-redes'),
          link(
            'Comunicación y convivencia',
            'https://www.uniminuto.edu/comunicacion-y-convivencia',
          ),
        ],
      },
      {
        title: 'Informes de sostenibilidad',
        links: [
          link(
            'UNIMINUTO Informe de sostenibilidad 2021',
            'https://portalweb-uniminuto.s3.amazonaws.com/activos_digitales/DocInstitucionales/InfSostenibilidad/INFORME_DE_SOSTENIBILIDAD_2021.pdf',
          ),
          link(
            'UNIMINUTO Informe de sostenibilidad 2019 - 2020',
            'https://portalweb-uniminuto.s3.us-east-1.amazonaws.com/activos_digitales/DocInstitucionales/InfSostenibilidad/InfSost2019-2020.pdf',
          ),
          link(
            'UNIMINUTO Informe de sostenibilidad por sedes 2019 - 2020',
            'https://portalweb-uniminuto.s3.us-east-1.amazonaws.com/activos_digitales/DocInstitucionales/InfSostenibilidad/Informe_sostenibilidad_Sedes-2019-2020.pdf',
          ),
          link(
            'UNIMINUTO Informe de sostenibilidad 2017 - 2018',
            'https://portalweb-uniminuto.s3.us-east-1.amazonaws.com/activos_digitales/DocInstitucionales/InfSosten2017-2018.pdf',
          ),
          link(
            'Informes de gestión y rendición de cuentas',
            'https://www.uniminuto.edu/informes-gestion-y-rendicion-de-cuentas',
          ),
        ],
      },
      {
        title: 'Noticias y eventos',
        links: [
          link('Eventos', 'https://www.uniminuto.edu/eventos'),
          link('Noticias', 'https://www.uniminuto.edu/noticias'),
          link('UNIMINUTO RADIO', 'https://www.uniminutoradio.com.co/'),
        ],
      },
      {
        title: 'Normatividad y gestión universitaria',
        links: [
          link(
            'Documentos institucionales y normatividad',
            'https://www.uniminuto.edu/documentos-juridicos-uniminuto',
          ),
          link(
            'Régimen Tributario Especial - RTE',
            'https://www.uniminuto.edu/regimen-tributario-especial-rte',
          ),
          link(
            'Ley de transparencia y acceso a la información pública',
            'https://www.uniminuto.edu/transparencia-y-acceso-la-informacion-publica',
          ),
          link(
            'Reconocimientos y distinciones',
            'https://www.uniminuto.edu/reconocimientos-y-distinciones-uniminuto',
          ),
          link(
            'Transferencia del modelo UNIMINUTO',
            'https://www.uniminuto.edu/transferencia-del-modelo-uniminuto',
          ),
        ],
      },
    ],
  },
  {
    id: 'oferta',
    label: 'Conoce nuestra oferta académica',
    overview: link('Conoce toda la oferta académica', '/oferta-academica'),
    groups: [
      {
        title: 'Pregrado',
        links: [
          link('Técnico Profesional', '/oferta-academica?nivel_formacion=264'),
          link('Tecnológico', '/oferta-academica?nivel_formacion=21'),
          link('Universitario', '/oferta-academica?nivel_formacion=22'),
        ],
      },
      {
        title: 'Posgrado',
        links: [
          link('Especializaciones', '/oferta-academica?nivel_formacion=239'),
          link('Maestría', '/oferta-academica?nivel_formacion=240'),
        ],
      },
      {
        title: 'Educación para el Trabajo y el Desarrollo Humano (ETDH)',
        links: [
          link(
            'Educación para el trabajo Bogotá',
            'https://www.uniminuto.edu/educacion-para-el-trabajo-bogota-0',
          ),
          link(
            'Educación para el trabajo Antioquia-Chocó',
            'https://www.uniminuto.edu/formacion-para-el-trabajo',
          ),
          link(
            'Educación para el trabajo Cundinamarca - Boyacá',
            'https://www.uniminuto.edu/cundinamarca-boyaca-educacion-para-el-trabajo-y-desarrollo-humano',
          ),
          link(
            'Educación para el trabajo Tolima - Huila',
            'https://www.uniminuto.edu/formacion-para-el-trabajo-tolima-huila',
          ),
        ],
      },
      {
        links: [
          link('Cursos y Diplomados', 'https://cursosydiplomados.uniminuto.edu/'),
          link('Convenio SENA – UNIMINUTO', 'https://www.uniminuto.edu/convenio-sena-uniminuto'),
          link('Formas de pago', 'https://www.uniminuto.edu/formas-de-pago'),
        ],
      },
    ],
  },
  {
    id: 'vida',
    label: 'Vida universitaria',
    groups: [
      {
        links: [
          link('Uniminuto Radio', 'https://www.uniminutoradio.com.co/'),
          link('Calidad académica', 'https://www.uniminuto.edu/calidad-academica-uniminuto'),
          link('Distancia 4.0', 'https://www.uniminuto.edu/a-distancia-4.0'),
          link('Dirección de Asuntos Estudiantiles', '/direccion-de-asuntos-estudiantiles'),
          link(
            'Credenciales Alternativas Digitales',
            'https://www.uniminuto.edu/credenciales-alternativas-digitales-uniminuto',
          ),
          link('CRAII - Biblioteca', 'https://www.uniminuto.edu/biblioteca'),
        ],
      },
      {
        links: [
          link('Cursos Nacionales', 'https://www.uniminuto.edu/cursos-nacionales'),
          link(
            'Oficina de Asuntos Globales',
            'https://www.uniminuto.edu/oficina-de-asuntos-globales',
          ),
          link('Pastoral', '/pastoral'),
          link(
            'Práctica en Responsabilidad Social',
            'https://www.uniminuto.edu/practica-en-responsabilidad-social-uniminuto',
          ),
          link('Pruebas SABER', 'https://www.uniminuto.edu/pruebas-saber'),
          link('Voluntariado', 'https://www.uniminuto.edu/voluntariado-uniminuto'),
        ],
      },
      {
        title: 'Arte y Cultura',
        links: [
          link('Agroparque Sabio Mutis', 'https://www.uniminuto.edu/agroparque-sabio-mutis'),
          link(
            'Museo Arqueológico de Pasca',
            'https://www.uniminuto.edu/museo-de-arqueologia-e-historia-natural-de-pasca',
          ),
          link('Museo de Arte Contemporáneo de Bogotá - MAC', 'http://www.mac.org.co/'),
          link('Museo Rafael García Herreros', 'http://uvd.uniminuto.edu/boletin/museo/'),
          link(
            'Programa de Inmersiones Sociales',
            'https://www.uniminuto.edu/inmersiones-sociales-uniminuto',
          ),
        ],
      },
    ],
  },
  link('Portal I+D+I+C', '/portal-i-d-i-c'),
  {
    id: 'proyeccion',
    label: 'Proyección social',
    groups: [
      {
        links: [
          link('Centro progresa MD', 'https://www.uniminuto.edu/centro-progresa'),
          link('Egresados', 'https://bit.ly/ClubViveU'),
          link(
            'Galardón Padre Diego Jaramillo Cuartas',
            'https://www.uniminuto.edu/Galardon-Padre-Diego-Jaramillo-Cuartas',
          ),
          link('Proyección Social Uniminuto', 'https://www.uniminuto.edu/proyeccion-social'),
          link(
            'Práctica en Responsabilidad Social',
            'https://www.uniminuto.edu/practica-en-responsabilidad-social-uniminuto',
          ),
          link('Voluntariado', 'https://www.uniminuto.edu/voluntariado-uniminuto'),
        ],
      },
    ],
  },
];

export const DONACION = link('Haz tu donación', '/donaciones-uniminuto');

export function isMegaMenu(item: MegaMenu | NavItem): item is MegaMenu {
  return 'groups' in item;
}
