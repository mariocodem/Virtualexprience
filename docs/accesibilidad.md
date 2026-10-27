# Accesibilidad y DUA

Objetivo: **WCAG 2.2 nivel AA** y los tres principios del **Diseño Universal para el Aprendizaje**. La declaración pública está en la ruta `/accesibilidad`; este documento es la lista de verificación técnica.

## Panel de accesibilidad

Siempre a un clic: botón «Ajustes» en la cabecera de todas las páginas, en la cabecera de cada estación y del Gran Reto, y fijo en la esquina cuando la cabecera sale de la vista. Atajo **Alt + A** en cualquier página (`aria-keyshortcuts`).

| Ajuste             | Efecto                                                                                  | Implementación                             |
| ------------------ | --------------------------------------------------------------------------------------- | ------------------------------------------ |
| Tamaño del texto   | 100 %, 112,5 %, 125 % o 150 % (escala `rem`)                                            | `--text-scale` en `<html>`                 |
| Tipo de letra      | Atlas (Inter), Atkinson Hyperlegible u OpenDyslexic para el texto de lectura            | `data-font`; fuentes locales de fontsource |
| Alto contraste     | Tinta más oscura, fondo blanco, filetes más gruesos y acentos oscurecidos               | `data-contrast="high"` redefine los tokens |
| Espaciado amplio   | Interlineado 1,8, espaciado entre letras 0,06 em y entre palabras 0,16 em (WCAG 1.4.12) | `data-spacing="wide"`                      |
| Reducir movimiento | Sin parallax, cámara que orbita ni texto que se revela; también respeta el sistema      | `data-motion` + `prefers-reduced-motion`   |
| Vista del mundo    | Relieve 3D o carta 2D equivalente                                                       | `mapMode`                                  |
| Retos y Brumas     | Juego 3D o versión accesible equivalente                                                | `gameMode`                                 |
| Ritmo tranquilo    | Ataques más lentos y puntería asistida en los juegos 3D                                 | `calmPace`                                 |
| Leer en voz alta   | Lee la página o cualquier panel del mundo (botón «Escuchar»)                            | Web Speech API, voz en español del sistema |

Los ajustes se guardan en el equipo (`virtux:preferencias`) y se aplican en todo el archipiélago.

## Lista de verificación WCAG 2.2 AA

| Criterio                               | Cómo se cumple                                                                                                    |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 1.1.1 Contenido no textual             | Lienzos 3D con `aria-hidden` y equivalente textual en paneles y carta 2D; sellos con `role="img"` y nombre        |
| 1.2 Medios                             | Audios narrados con guion línea a línea; cada estación ofrece el mismo contenido en texto                         |
| 1.3.1 Información y relaciones         | Encabezados jerárquicos, listas, `dl`, tablas con encabezados de fila, `fieldset` y `legend` en los controles     |
| 1.4.3 / 1.4.11 Contraste               | Paleta cerrada con pares verificados; modo de alto contraste; axe sin violaciones de contraste                    |
| 1.4.4 / 1.4.10 Redimensionar y reflujo | Escala de texto hasta 150 %; diseño adaptable probado en escritorio y en móvil (412 px)                           |
| 1.4.12 Espaciado del texto             | Modo de espaciado amplio; los contenedores no recortan texto                                                      |
| 2.1.1 Teclado                          | Todo se hace con teclado; recorrido carta → isla → estación → reto probado en e2e                                 |
| 2.2.2 Pausar                           | Los juegos se pausan con Esc o P y al cambiar de pestaña                                                          |
| 2.3.1 Destellos                        | Nada destella más de 3 veces por segundo                                                                          |
| 2.4.1 Saltar bloques                   | Enlace «Saltar al contenido»                                                                                      |
| 2.4.3 / 2.4.7 Orden y foco visible     | Orden lógico; foco de 3 px en `--focus` (rojo sobre lámina, amarillo sobre mar); el foco vuelve al cerrar paneles |
| 2.5.3 Etiqueta en el nombre            | El nombre accesible empieza por el texto visible («Ajustes de accesibilidad»)                                     |
| 2.5.7 Movimientos de arrastre          | Ninguna acción exige arrastrar: todo se hace con clic, toque o teclado                                            |
| 2.5.8 Tamaño del objetivo              | Objetivos de 44 px en botones y controles; filas de 32 px en listas de enlaces                                    |
| 4.1.2 / 4.1.3 Nombre, función y estado | Diálogos nativos (`<dialog>`), interruptores `role="switch"`, medidores `role="meter"`, regiones `aria-live`      |

## DUA

| Principio          | En el archipiélago                                                                                                           |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Representación     | Cinco formatos por estación de exploración; lectura en voz alta; guion de los audios; carta 2D equivalente al relieve        |
| Acción y expresión | Teclado, ratón y táctil; versión accesible de cada juego; ritmo tranquilo; varias formas de responder en los retos           |
| Implicación        | Elección de isla y orden; metas visibles (estaciones, fragmentos, nivel); insignias por constancia y por probar otro formato |

## Cómo se verifica

- `pnpm test:e2e` ejecuta axe-core (WCAG 2.0, 2.1 y 2.2 A y AA) en `/`, `/mundo`, `/pasaporte` y `/accesibilidad`, con el pasaporte lleno y con el panel abierto, en escritorio (1440 × 900) y en móvil (Pixel 7). Exige 0 violaciones graves o críticas.
- La prueba «solo con teclado» recorre la carta, entra a una isla, abre una estación en 3D y vuelve al sendero desde la pausa. Otra juega Explorar en 3D de punta a punta con el teclado: camina, abre un formato, enciende el farol, responde y completa la estación.
- Las preferencias se prueban de punta a punta: se aplican al instante y sobreviven a una recarga.

## Limitaciones conocidas

- La escena 3D es decorativa para los lectores de pantalla; la información está en los paneles, los anuncios y la carta 2D.
- Los juegos 3D piden moverse y reaccionar; la versión accesible y el ritmo tranquilo quitan esa barrera.
- La calidad de la voz depende de las voces instaladas en el sistema.
- Falta una auditoría manual con lectores de pantalla (NVDA, VoiceOver) y con personas usuarias.
