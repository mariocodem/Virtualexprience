---
version: 1
slug: "src-landing-landingpage-tsx"
primary_target: "src/landing/LandingPage.tsx"
related_targets: ["src/landing"]
---

# Landing (`/`)

Modo: **Persuade**. Contexto de producto en PRODUCT.md; especificación de secciones en CLAUDE.md §5.

- **Quién llega:** primero quien evalúa la prueba (pocos minutos); después estudiantes de todo el rango, en móvil o laptop modesta.
- **Acción:** «Entrar al mundo». Secundarias: «Ver cómo funciona» y un enlace discreto «Recorrido rápido con progreso precargado» (`/mundo?demo=1`).
- **Prueba:** el mapa es la interfaz (convenciones = estados de estación, rosa de los vientos = Brújula, mapa de ubicación = minimapa). Solo cifras del producto, nunca institucionales.
- **Visitante que vuelve:** si hay progreso guardado, la plancha muestra sus islas encendidas y la acción principal dice «Continuar expedición».
- **Anti-metas:** portal institucional rígido; plantilla SaaS (hero centrado sobre filas de tarjetas, degradados, iconos en cajitas); pergamino, mapa del tesoro, lo pirata; coordenadas reales.
- **Abierto:** valores exactos del amarillo y el azul y archivos del logo (manual de Mario, pendiente); hasta entonces los colores de marca son provisionales.

## Direction contract

THESIS: El archipiélago es una plancha viva del atlas escolar en relieve; la página es la lámina, no una web con un mapa dentro. Rechaza el hero 3D a sangre con titular centrado y filas de tarjetas debajo.

OWN-WORLD: Lámina blanca fría con filete de plancha y retícula; mar en franjas batimétricas azules (el azul UNIMINUTO es el fondo y la tinta); tierra en terrazas hipsométricas verde, oliva, amarillo UNIMINUTO, ocre y cumbre clara; un rojo de ruta reservado solo para lo que está en curso. Toponimia en Archivo: versalitas expandidas y espaciadas para islas, itálica para el agua, condensada y pesada para titulares; cuerpo en Inter. Esquinas rectas, filetes de 1.5px, recuadros de leyenda; nada redondeado ni con sombras blandas.

STORY: Entiende que aprender aquí es explorar seis islas para devolverle la luz al faro; cree que el mundo funciona porque el propio mapa ya muestra estados, rutas y guía; entra al mundo (o al recorrido rápido) desde la primera pantalla.

FIRST VIEWPORT: Plancha a sangre dentro de su filete: archipiélago 3D low-poly en relieve al amanecer ocupando la derecha y el centro, faro apagado parpadeando en el centro. Arriba a la izquierda, la cartela del título (sin etiqueta encima): «Aprende explorando. / Enciende el Faro.» revelado por palabras, una línea de apoyo y, en la cartela, «Entrar al mundo» (relleno azul, texto amarillo) + «Ver cómo funciona»; debajo, el enlace del recorrido rápido. Arriba a la derecha, mapa de ubicación; abajo a la derecha, cuadro de convenciones con rosa de los vientos. Abajo a la izquierda, «Desliza para zarpar».

FORM: Atlas en relieve, candidato 7 de 7 de la lista propia (asignado por la tirada, elegido por Mario). seed:bdf3ddc603de69f6. Interacción firma: la ruta roja punteada se dibuja con el scroll y une las secciones como escalas; foco u hover en una isla levanta su rótulo con línea guía. Gramática de movimiento: un solo reloj de marea compartido; el texto que se lee nunca se mueve; el grosor de ruta escribe el dominio; completar una isla quita su niebla y le da color.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
