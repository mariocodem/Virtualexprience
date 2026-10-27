import { PreferencesForm } from '@/a11y/PreferencesForm';
import { Panel } from '@/ui/Panel';

const SHORTCUTS: [string, string][] = [
  ['Alt + A', 'Abrir o cerrar el panel de accesibilidad, en cualquier página'],
  ['Tab y Mayús + Tab', 'Pasar de un enlace o control al siguiente o al anterior'],
  ['Flechas', 'Recorrer las islas en la carta y las estaciones del sendero'],
  ['Enter', 'Abrir la isla o la estación elegida'],
  ['Esc', 'Cerrar el panel abierto, volver a la carta o salir de una estación'],
  ['WASD o flechas', 'Moverte en los juegos 3D'],
  ['Espacio', 'Disparar el haz de luz contra la Bruma'],
  ['Mayús', 'Esquivar'],
  ['E o Enter', 'Usar lo que tienes cerca en un juego 3D'],
  ['1 a 4', 'Elegir una opción en las decisiones de los juegos'],
  ['Esc o P', 'Pausar un juego 3D sin salir de la estación'],
];

const PRINCIPLES: [string, string[]][] = [
  [
    'Representación',
    [
      'Las estaciones de exploración llegan en texto, audio, video, infografía e interactivo: eliges cómo aprender.',
      'Cualquier panel del mundo se puede escuchar con el botón «Escuchar», y la página entera desde el panel de accesibilidad.',
      'Los audios narrados muestran su guion línea a línea, como subtítulos.',
    ],
  ],
  [
    'Acción y expresión',
    [
      'Todo se hace con teclado, ratón o pantalla táctil.',
      'La carta 2D es equivalente al relieve 3D: mismas islas, mismas estaciones, mismo progreso.',
      'Cada reto y cada Bruma tienen una versión accesible que llega al mismo resultado, y el ritmo tranquilo hace los juegos 3D más amables.',
    ],
  ],
  [
    'Implicación',
    [
      'Eliges la isla y el orden; Brújula sugiere la siguiente estación según cómo te va.',
      'Las metas están a la vista: estaciones por isla, fragmentos de luz, nivel e insignias por sellar.',
      'El pasaporte reconoce también probar otros formatos y volver al archipiélago.',
    ],
  ],
];

/** Declaración de accesibilidad: ajustes, atajos, principios DUA y cómo se verifica. */
export default function AccessibilityRoute() {
  return (
    <div className="mx-auto max-w-[90rem] px-4 py-12 sm:px-8 sm:py-16">
      <title>Accesibilidad · Archipiélago VirtuX</title>
      <header className="max-w-3xl">
        <p className="toponym text-ink-soft">Declaración de accesibilidad</p>
        <h1 className="mt-4 display text-[clamp(2.5rem,1.6rem+3.6vw,5rem)]">Diseñado para todos</h1>
        <p className="mt-6 max-w-[60ch] text-lg text-ink-soft">
          El archipiélago sigue el Diseño Universal para el Aprendizaje (DUA) y busca cumplir las
          pautas WCAG 2.2 en el nivel AA. Ajusta la experiencia aquí o, desde cualquier página, con{' '}
          <kbd className="border border-ink px-1.5 font-semibold">Alt + A</kbd>.
        </p>
      </header>

      <div className="mt-14 grid gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16">
        <Panel as="section" tone="sunk" aria-labelledby="ajustes" className="self-start">
          <h2 id="ajustes" className="font-display text-2xl font-extrabold">
            Tus ajustes
          </h2>
          <p className="mt-2 mb-6 text-sm text-ink-soft">
            Se aplican al instante y se guardan en este equipo.
          </p>
          <PreferencesForm idPrefix="pagina" />
        </Panel>

        <div className="grid gap-14">
          <section aria-labelledby="atajos">
            <h2 id="atajos" className="font-display text-3xl font-extrabold">
              Atajos de teclado
            </h2>
            <table className="mt-5 w-full border-t-[1.5px] border-ink text-left">
              <caption className="sr-only">Teclas y lo que hacen</caption>
              <thead className="sr-only">
                <tr>
                  <th scope="col">Teclas</th>
                  <th scope="col">Acción</th>
                </tr>
              </thead>
              <tbody>
                {SHORTCUTS.map(([keys, action]) => (
                  <tr key={keys} className="border-b-[1.5px] border-ink">
                    <th scope="row" className="py-3 pr-6 align-top font-display font-bold">
                      {keys}
                    </th>
                    <td className="py-3">{action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section aria-labelledby="dua">
            <h2 id="dua" className="font-display text-3xl font-extrabold">
              Los tres principios del DUA
            </h2>
            <dl className="mt-5 border-t-[1.5px] border-ink">
              {PRINCIPLES.map(([term, items]) => (
                <div
                  key={term}
                  className="grid gap-2 border-b-[1.5px] border-ink py-5 sm:grid-cols-[12rem_1fr] sm:gap-8"
                >
                  <dt className="font-display text-xl font-extrabold">{term}</dt>
                  <dd>
                    <ul className="list-[square] space-y-2 pl-5">
                      {items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="verificacion">
            <h2 id="verificacion" className="font-display text-3xl font-extrabold">
              Cómo lo verificamos
            </h2>
            <ul className="mt-5 max-w-[65ch] list-[square] space-y-2 pl-5">
              <li>
                Pruebas automáticas con axe-core en cada página principal, en escritorio y en móvil:
                sin violaciones graves ni críticas.
              </li>
              <li>
                Una prueba recorre el archipiélago solo con teclado: de la carta a una isla, a una
                estación y de vuelta.
              </li>
              <li>
                Movimiento reducido del sistema respetado: sin parallax, sin cámara que orbita y con
                los textos ya revelados.
              </li>
              <li>
                Sin WebGL, el mundo se muestra en la carta 2D y los juegos en su versión accesible.
              </li>
            </ul>
          </section>

          <section aria-labelledby="limitaciones">
            <h2 id="limitaciones" className="font-display text-3xl font-extrabold">
              Limitaciones conocidas
            </h2>
            <ul className="mt-5 max-w-[65ch] list-[square] space-y-2 pl-5">
              <li>
                La escena 3D es decorativa para los lectores de pantalla; la información y las
                decisiones están en los paneles, los anuncios y la carta 2D.
              </li>
              <li>
                Los juegos 3D piden moverse y reaccionar; para jugar sin esa exigencia están la
                versión accesible y el ritmo tranquilo.
              </li>
              <li>
                La lectura en voz alta usa las voces instaladas en tu equipo: su calidad y su acento
                dependen del sistema.
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
