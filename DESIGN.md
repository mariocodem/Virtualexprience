---
name: Archipiélago VirtuX
description: Una plancha viva del atlas escolar en relieve; la página es la lámina, el mapa es la interfaz.
colors:
  plate: '#f3f6f8'
  plate-sunk: '#e6ecf0'
  plate-edge: '#cdd6de'
  ink: '#0f2e5c'
  ink-soft: '#2a4f80'
  sea-950: '#0b2347'
  sea-900: '#0f2e5c'
  sea-800: '#173f75'
  sea-700: '#22548f'
  sea-500: '#3f7fb8'
  sea-300: '#6fa8d3'
  sea-100: '#9ccbe4'
  land-low: '#5e9e4b'
  land-mid: '#a9b94a'
  land-sun: '#f5c400'
  land-high: '#c7782e'
  land-peak: '#f3f6f8'
  route: '#d7262e'
  isle-ecos: '#a8375e'
  isle-fractal: '#0d6c66'
  isle-agora: '#97500a'
  isle-timon: '#4a5bb8'
  isle-chispa: '#7a5c00'
  isle-raiz: '#286f45'
  reveal-from: '#6a84a8'
  veil: 'rgb(11 35 71 / 0.62)'
typography:
  display:
    fontFamily: 'Archivo Variable, Archivo, ui-sans-serif, system-ui, sans-serif'
    fontSize: 'clamp(2.5rem, min(1.4rem + 4.4vw, 1rem + 7svh), 5.75rem)'
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: '-0.02em'
    fontVariation: "'wdth' 87.5"
  headline:
    fontFamily: 'Archivo Variable, Archivo, ui-sans-serif, system-ui, sans-serif'
    fontSize: 'clamp(2.25rem, 1.4rem + 2.8vw, 4rem)'
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: '-0.02em'
    fontVariation: "'wdth' 87.5"
  title:
    fontFamily: 'Archivo Variable, Archivo, ui-sans-serif, system-ui, sans-serif'
    fontSize: '1.5rem'
    fontWeight: 800
    lineHeight: 1.2
    fontVariation: "'wdth' 87.5"
  body:
    fontFamily: 'Inter Variable, Inter, ui-sans-serif, system-ui, sans-serif'
    fontSize: '1rem'
    fontWeight: 400
    lineHeight: 1.55
    fontFeature: "'cv11', 'ss03'"
  toponym:
    fontFamily: 'Archivo Variable, Archivo, ui-sans-serif, system-ui, sans-serif'
    fontSize: '0.6875rem'
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: '0.22em'
    fontVariation: "'wdth' 125"
  toponym-sm:
    fontFamily: 'Archivo Variable, Archivo, ui-sans-serif, system-ui, sans-serif'
    fontSize: '0.625rem'
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: '0.22em'
    fontVariation: "'wdth' 125"
  hydronym:
    fontFamily: 'Archivo Variable, Archivo, ui-sans-serif, system-ui, sans-serif'
    fontSize: '0.8125rem'
    fontWeight: 500
    letterSpacing: '0.04em'
    fontVariation: "'wdth' 100"
rounded:
  none: '0px'
spacing:
  panel: '24px'
  panel-wide: '32px'
  gutter: '16px'
  gutter-wide: '32px'
  section: '96px'
  section-wide: '128px'
components:
  button-primary:
    backgroundColor: '{colors.sea-900}'
    textColor: '{colors.land-sun}'
    rounded: '{rounded.none}'
    padding: '0 20px'
    height: '44px'
  button-primary-hover:
    backgroundColor: '{colors.sea-800}'
    textColor: '{colors.land-sun}'
  button-primary-lg:
    backgroundColor: '{colors.sea-900}'
    textColor: '{colors.land-sun}'
    rounded: '{rounded.none}'
    padding: '0 28px'
    height: '56px'
  button-secondary:
    backgroundColor: '{colors.plate}'
    textColor: '{colors.ink}'
    rounded: '{rounded.none}'
    padding: '0 20px'
    height: '44px'
  button-secondary-hover:
    backgroundColor: '{colors.plate-sunk}'
    textColor: '{colors.ink}'
  button-sun:
    backgroundColor: '{colors.land-sun}'
    textColor: '{colors.sea-950}'
    rounded: '{rounded.none}'
    padding: '0 20px'
    height: '44px'
  button-sun-hover:
    backgroundColor: '{colors.plate}'
    textColor: '{colors.sea-950}'
  button-quiet:
    textColor: '{colors.ink}'
    height: '44px'
  panel:
    backgroundColor: '{colors.plate}'
    textColor: '{colors.ink}'
    rounded: '{rounded.none}'
    padding: '{spacing.panel}'
  panel-sunk:
    backgroundColor: '{colors.plate-sunk}'
    textColor: '{colors.ink}'
    rounded: '{rounded.none}'
    padding: '{spacing.panel}'
  dialog:
    backgroundColor: '{colors.plate}'
    textColor: '{colors.ink}'
    rounded: '{rounded.none}'
    width: 'min(92vw, 36rem)'
  toast:
    backgroundColor: '{colors.plate}'
    textColor: '{colors.ink}'
    rounded: '{rounded.none}'
    padding: '12px 8px 12px 16px'
    width: 'min(92vw, 24rem)'
  skip-link:
    backgroundColor: '{colors.sea-900}'
    textColor: '{colors.land-sun}'
    padding: '12px 20px'
---

# Design System: Archipiélago VirtuX

## Overview

**Creative North Star: "Atlas en relieve"**

La interfaz es una plancha de atlas escolar, no una web con un mapa dentro. La página entera es la lámina: blanco frío con filete de plancha y retícula de coordenadas en el margen, mar en franjas batimétricas azules, tierra en terrazas hipsométricas (verde, oliva, amarillo, ocre, cumbre clara) y una sola tinta roja reservada para lo que está en curso. Todo recuadro de texto es una cartela con filete; toda leyenda es un cuadro de convenciones; los rótulos siguen la toponimia de los atlas: versalitas expandidas para lugares, itálica para el agua, grotesca semicondensada y pesada para los titulares.

La densidad es la de una lámina impresa: pocas superficies, filetes en lugar de sombras, mucho mar o lámina abierta alrededor de cartelas compactas. El archipiélago 3D low-poly (three.js) y su equivalente SVG 2D comparten geografía y paleta; la plancha SVG pinta al instante y cede el sitio al relieve cuando la escena está lista. El movimiento obedece a un único reloj de marea: lo que respira (olas, glifos de isla, señal de scroll, escena 3D) late con él; el texto que se lee no se mueve una vez revelado.

Azul (`sea-900` / `ink`) y amarillo (`land-sun`) representan la marca UNIMINUTO y son **provisionales** hasta incorporar el manual de marca. La marca se escribe con el wordmark de texto «UNIMINUTO · VirtuX» en toponimia; no hay logo dibujado.

**Key Characteristics:**

- Lámina blanca fría (`plate`) con filete de 1.5px en tinta azul como borde de todo recuadro.
- Esquinas rectas en todo rectángulo; el círculo existe solo como signo cartográfico.
- Sin sombras de interfaz: la profundidad es del relieve 3D y de la batimetría, no de las tarjetas.
- Rojo de ruta exclusivo para «en curso / tu posición / foco».
- Un acento propio por isla, usado en rótulos, convenciones y marcadores, nunca como fondo.
- Un solo reloj de marea (14s) para todo lo que se mueve en bucle.
- Alto contraste y escala de texto de 4 pasos son modos del propio sistema, no capas añadidas.

## Colors

Una lámina fría impresa a dos tintas de marca (azul profundo y amarillo sol) sobre una gama cartográfica de mar y tierra, con una tinta roja de excepción.

### Primary

- **Azul Abismo de Tinta** (`ink` / `sea-900`): la tinta de todo texto, filete y trazo, y el fondo del mar profundo y de las secciones «sobre mar» (CTA final). Relleno del botón principal. Azul UNIMINUTO provisional.
- **Amarillo Sol de Cota** (`land-sun`): la terraza media de la hipsometría y el texto del botón principal sobre azul; relleno del botón `sun` sobre mar; color de selección de texto; foco sobre mar. Amarillo UNIMINUTO provisional. Nunca como texto sobre lámina blanca.

### Secondary

- **Rojo de Ruta** (`route`): la única tinta de estado. Ruta recorrida que se dibuja con el scroll, punto de posición en el mapa de ubicación, estación «en curso» (◐), índice de isla activo, línea guía del rótulo activo, aviso de progreso, cursor de texto y anillo de foco por defecto (`--focus`).

### Tertiary

- **Acentos de isla**: Ecos magenta vino (`isle-ecos`), Fractal verde azulado profundo (`isle-fractal`), Ágora siena (`isle-agora`), Timón añil (`isle-timon`), Chispa ocre oscuro (`isle-chispa`), Raíz verde bosque (`isle-raiz`). Se usan en el nombre de la línea VirtuXperience, convenciones, glifos y marcadores de su isla. Todos están oscurecidos para leerse como texto sobre `plate`; tienen variante aún más oscura en alto contraste.

### Neutral

- **Lámina Fría** (`plate`): fondo de página, cartelas, diálogos, avisos; también la cumbre (`land-peak`) y el halo de los rótulos sobre el mapa.
- **Lámina Hundida** (`plate-sunk`): sección alterna (Brújula), panel `sunk`, hover de botones secundarios y de cerrar.
- **Canto de Lámina** (`plate-edge`): borde tenue y pista de desplazamiento.
- **Tinta Suave** (`ink-soft`): texto de apoyo, términos `dt`, coordenadas del margen.
- **Batimetría** (`sea-950` → `sea-100`): seis franjas del abismo a los bajos; `sea-950` es el pie de página, `sea-700` la segunda línea del titular y los hidrónimos, `sea-100` el texto sobre mar profundo.
- **Hipsometría** (`land-low`, `land-mid`, `land-sun`, `land-high`, `land-peak`): las terrazas del relieve, de llanura a cumbre. `land-low` marca también los avisos de éxito.
- **Azul de Revelado** (`reveal-from`): punto de partida del texto grande que se revela con el scroll; ya legible (≥ 3:1) antes de llegar a su tinta.
- **Velo** (`veil`): fondo tras los diálogos modales.

### Named Rules

**The One Red Rule.** `route` significa «en curso»: posición, estación activa, ruta recorrida, foco. Nunca decora, nunca marca error, nunca rellena un botón.

**The Sea-Focus Rule.** Toda región sobre mar profundo lleva la clase `on-sea`, que cambia `--focus` a `land-sun`; el rojo no se pone sobre azul oscuro.

**The Two Sources Rule.** La escena 3D lee sus colores de `src/world/palette.ts` (`ATLAS`), que replica `tokens.css`. Cambiar un token de mar, tierra, lámina, tinta o ruta exige cambiarlo en ambos archivos. `haze` (#dfe7ea, bruma de islas sin fragmento) y `dawn` (#ffd9a8, luz de amanecer) existen solo en 3D.

**The High-Contrast Rule.** `:root[data-contrast='high']` redefine `plate` a blanco puro, oscurece `ink`, `ink-soft`, `sea-700`, `route` y los seis acentos, endurece `plate-edge` y engruesa los filetes (`--rule` 2px, `--rule-strong` 3px). Todo color nuevo debe tener su par en ese bloque si se usa como texto.

**The Closed Palette Rule.** `@theme { --color-*: initial; }` borra la paleta de Tailwind: solo existen los colores del mundo.

## Typography

**Display Font:** Archivo Variable (eje de anchura `wdth`, con fallback ui-sans-serif, system-ui)
**Body Font:** Inter Variable (con fallback ui-sans-serif, system-ui)

**Character:** Una sola familia de rotulación, Archivo, hace los tres oficios del cartógrafo variando la anchura: semicondensada y pesada para titulares de plancha, expandida y espaciada para toponimia, itálica para hidronimia. Inter lleva la lectura sin competir.

### Hierarchy

- **Display** (800, `wdth` 87.5%, clamp hasta 5.75rem, 0.95): titular del hero y del CTA final, en dos líneas tonales (`ink` y `sea-700`); revelado por palabras con desenfoque de 6px a 0.
- **Headline** (800, `wdth` 87.5%, clamp(2.25rem … 4rem), 0.95): título de cada sección-escala; lleva `data-escala` para que la ruta lo una. Ancho limitado a 14–16ch.
- **Title** (800, `wdth` 87.5%, 1.5rem): pasos, principios DUA, títulos de diálogo (en `display` a 1.875rem); las cifras de datos usan el mismo corte a 3rem con `tabular-nums`.
- **Body** (400, 1rem, 1.55, `cv11` + `ss03`): texto corrido en 32–56ch; el párrafo de entrada sube a 1.125–1.25rem.
- **Toponym** (700, `wdth` 125%, 0.6875rem / 0.625rem, +0.22em, versalitas): rótulos de isla sobre el mapa, cabeceras de cartela («Convenciones», «Bitácora · Sala de Redacción»), índice de islas, coordenadas del margen, wordmark (0.8125rem), encabezados de columna del pie.
- **Hydronym** (500 itálica, `wdth` 100%, +0.04em): nombres de agua sobre el mapa (con `halo`), la metáfora de cada isla, el pie de la rosa de los vientos.

### Named Rules

**The One Family Rule.** Toda rotulación es Archivo; cambia la anchura (87.5 / 100 / 125), no la familia. Inter solo para lectura.

**The Halo Rule.** Todo rótulo puesto sobre el mapa lleva `halo`: contorno de 3px en `plate` pintado bajo el trazo, para leerse sobre cualquier franja.

**The Still Text Rule.** El texto que se lee no se mueve en bucle ni con parallax; solo se revela una vez (por palabras en el hero, de `reveal-from` a su tinta en el manifiesto) y queda quieto.

## Layout

La página es una sucesión de planchas a ancho completo, sin contenedor centrado. El hero es una plancha con margen de 12–24px, retícula de coordenadas A–H / 1–5 en el margen (escritorio) y la carta dentro de su filete ocupando al menos `100svh − 7.5rem`; sobre ella flotan cartelas posicionadas como en una lámina: título arriba a la izquierda, mapa de ubicación y rosa arriba a la derecha, convenciones abajo a la derecha. En móvil la cartela va primero y la carta asoma debajo (70svh); las convenciones se pliegan en un `<details>`.

Las secciones de contenido usan `px` 16px → 32px (sm) y `py` 96px → 128px (sm), alternando `plate` y `plate-sunk`; el cierre pasa a mar (`sea-900`) y el pie a abismo (`sea-950`). Las rejillas son asimétricas en fracciones (`5fr/6fr`, `3fr/2fr`, `2fr/1fr/1fr`), con huecos de 48–64px. Las listas de datos se separan por filetes horizontales (`border-t` 1.5px en tinta), no por tarjetas.

Una ruta punteada recorre el margen izquierdo (x ≈ 52px, oscilando ±9px) y une los titulares `data-escala` como escalas; el tramo recorrido se dibuja en `route` con el scroll. Cambio principal de diseño en `lg` (64rem); `sm` (40rem) y `md` (48rem) ajustan márgenes y columnas.

Objetivos táctiles: 44px mínimo (`min-h-11`) en botones, índice, interruptores y cerrar; 56px en el botón grande.

## Elevation & Depth

El sistema de interfaz es plano: ninguna superficie lleva `box-shadow`. La jerarquía se construye con filetes de tinta (`hairline` 1px, `rule` 1.5px, `rule-strong` 2px), cambio tonal `plate` / `plate-sunk` y el paso a mar profundo. La profundidad real pertenece al mundo: relieve en terrazas, batimetría en franjas, niebla de amanecer y sombras de la luz direccional en la escena 3D. Los diálogos se separan del fondo con el velo (`veil`), no con sombra.

### Named Rules

**The Rule-Not-Shadow Rule.** Una superficie se separa con filete, tono o mar, nunca con sombra blanda ni desplazada.

## Shapes

Esquinas rectas: `@theme { --radius-*: initial; }` elimina los radios y ningún rectángulo se redondea (botones, cartelas, diálogos, avisos, interruptores, el selector de tamaño). Los iconos SVG terminan en `square` y unen en `miter` con trazo de 1.5px. El círculo aparece solo como signo cartográfico: estaciones (○ ◐ ●, ◌ en preparación, ▢ bloqueada), numerales de paso dentro de un aro de 2px, punto de posición en rojo con borde de lámina, puntos del índice de islas, y el sello doble del pasaporte con texto en arco y tinta granulada. Las líneas punteadas son rutas; las discontinuas a 40% de tinta, conexiones entre pasos.

## Components

### Buttons

Rótulos de lámina: Archivo 700, filete de 1.5px, sin radio, con un hundimiento de 1px al pulsar.

- **Shape:** rectángulo recto; 44px de alto (`md`, 1rem) o 56px (`lg`, 1.25rem).
- **Primary:** relleno y filete `sea-900`, texto `land-sun`; hover a `sea-800`. Es la acción de entrar al mundo.
- **Secondary:** transparente con filete `ink`, texto `ink`; hover `plate-sunk`.
- **Sun:** relleno `land-sun`, texto `sea-950`; hover a `plate`. Solo sobre mar profundo.
- **Quiet:** enlace subrayado de 1.5px con offset 0.22em; el subrayado pasa a `route` en hover (a `land-sun` sobre mar).
- **Hover / Focus:** transición de color en 160ms con `ease-out`; foco con contorno de 3px en `--focus` y separación de 3px. Deshabilitado al 45% de opacidad. `loading` muestra la aguja de carga.

### Cards / Containers (Cartela)

- **Corner Style:** recta.
- **Background:** `plate`, o `plate-sunk` en el tono hundido.
- **Shadow Strategy:** ninguna (ver Elevation & Depth).
- **Border:** `plate-rule`, 1.5px en `ink` (2px en alto contraste).
- **Internal Padding:** 24px, 32px desde `sm`. Las cartelas con cabecera la separan con un filete inferior y un toponym.

### Inputs / Fields

- **Interruptor:** pista recta de 48×28px con filete `ink`; apagado `plate` con perilla `ink`, encendido `ink` con perilla `land-sun`.
- **Selector segmentado (tamaño de texto):** cuatro celdas rectas divididas por filetes; la elegida en `ink` con texto `land-sun`; foco interior con contorno `--focus` desplazado −6px.
- **Cursor:** `route`.

### Dialog

`<dialog>` nativo de hasta 36rem, `plate` con filete, cabecera separada por filete con título en `display` a 1.875rem, cierre de 44px; fondo `veil`. Atrapa foco, cierra con Esc.

### Toast (Aviso)

Cartela de hasta 24rem abajo a la izquierda, con un cuadrito de 10px que codifica el tono: `sea-500` información, `land-low` logro, `route` progreso. Región `status` cortés; vive 6s y se pausa con puntero o foco. Máximo tres a la vez.

### Navigation

- **Índice de islas:** botones toponym de 44px con punto circular; la isla activa en `route` con `aria-current="step"`, las recorridas con punto relleno rojo.
- **Pie:** fondo `sea-950`, texto `sea-100`, encabezados toponym en `plate`, enlaces a `plate` en hover.
- **Skip link:** bloque `sea-900` con texto `land-sun`, visible al recibir foco.

### Map Labels (Rótulo de isla)

Signature. El nombre de isla en toponym con `halo`, sostenido por una línea guía vertical de 1px × 16px (en `route` si es la isla activa, en `ink` si no); el agua en hydronym `sea-700` con halo. Se proyectan desde la escena 3D y aparecen con 320ms de opacidad.

### Station Symbol (Convención de estación)

Signature. Los cinco estados de una estación como signos de leyenda de 18px: ▢ bloqueada, ○ disponible, ◐ en curso (rojo), ● completada, ◌ en preparación (discontinuo). Siempre acompañados por su etiqueta de texto.

### Stamp (Sello de pasaporte)

Signature. Sello de aduana de doble aro (3px y 1px) con el nombre de la insignia en arco superior y la categoría en el inferior, estrella central y textura de tinta prensada (turbulencia + desplazamiento).

### Compass Rose and Wordmark

La rosa de los vientos acompaña al mapa de ubicación y a las convenciones con el pie «Brújula» en hydronym. El wordmark «UNIMINUTO · VirtuX» es texto toponym a 0.8125rem, sustituto del logo oficial.

## Do's and Don'ts

### Do:

- **Do** encerrar todo recuadro de contenido en una cartela: `plate` o `plate-sunk`, filete de 1.5px en `ink`, esquinas rectas.
- **Do** reservar `route` para lo que está en curso: posición, estación activa, tramo recorrido, foco.
- **Do** añadir `on-sea` a toda región sobre mar profundo para que el foco pase a `land-sun`.
- **Do** derivar todo bucle de `--tide` (14s) o de sus fracciones, y en 3D de `TIDE_PERIOD` en `src/world/scene/tide.ts`; ambos deben valer lo mismo.
- **Do** actualizar `src/world/palette.ts` en el mismo cambio que `tokens.css`.
- **Do** dar a cada color de texto nuevo su valor en `:root[data-contrast='high']`, y dimensionar el texto en `rem` para que `--text-scale` (1, 1.125, 1.25, 1.5) lo escale.
- **Do** rotular lugares en toponym, agua en hydronym y titulares en display; con `halo` cuando van sobre el mapa.
- **Do** mostrar estados finales y detener bucles con `prefers-reduced-motion` o `data-motion='reduced'`.
- **Do** tratar azul y amarillo como provisionales y cambiarlos solo desde los tokens cuando llegue el manual de marca.

### Don't:

- **Don't** redondear rectángulos ni usar sombras blandas o desplazadas; el círculo queda para signos cartográficos.
- **Don't** usar `route` como relleno de botón, decoración ni color de error.
- **Don't** poner `land-sun` como texto sobre `plate`; el amarillo va sobre azul o como relleno con texto `sea-950`.
- **Don't** reintroducir la paleta ni los radios por defecto de Tailwind.
- **Don't** animar en bucle ni desplazar con parallax el texto que se lee.
- **Don't** dibujar, redibujar ni imitar el logo de UNIMINUTO; usar el wordmark de texto hasta tener el archivo oficial.
- **Don't** poner un rótulo pequeño encima de un titular como etiqueta de sección; el toponym rotula lugares, cartelas y columnas, no titulares.
- **Don't** bajar el toponym de 0.625rem.
