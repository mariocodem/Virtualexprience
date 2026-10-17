# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

La versión de escritorio es un contenedor Electron del mismo build web. No tiene lenguaje de diseño nativo propio.

## Stack

Decidido en CLAUDE.md §3: Vite + React 19 + TypeScript strict; three.js + @react-three/fiber 9 + drei 10 + postprocessing 3; Tailwind + design tokens en CSS; Framer Motion + GSAP ScrollTrigger + Lenis; Zustand con `persist`; React Router; Howler.js; Web Speech API; Electron + electron-builder; Vitest + Testing Library + Playwright. Node 24 LTS.

Mario confirmó React 19 (en lugar de 18) y Node 24 (en lugar de 20) el 2026-10-16.

Decisiones abiertas (registrar como ADR cuando se tomen):
- Modo de rutas compatible con `file://` en Electron y con el hosting web (HashRouter o protocolo propio).
- Herramienta de build de `electron/main.ts`.
- Versión de Tailwind.

## Users

**Principal: estudiantes de UNIMINUTO de todo el rango.** Va desde quienes cursan los primeros semestres de pregrado hasta adultos que trabajan y estudian en programas virtuales o a distancia. Eso implica:
- equipos que van desde móviles hasta laptops modestas;
- sesiones de duración variable que se retoman después;
- distintos grados de familiaridad con interfaces tipo juego.

Llegan como *Explorador/a* para desarrollar competencias de las seis líneas de VirtuXperience.

**Secundaria: las personas que evalúan la prueba técnica de selección.** Necesitan comprobar en pocos minutos los 8 requerimientos: el mundo explorable, las rutas, el reto, la IA, el progreso y la accesibilidad. Revisan la demo web, el ejecutable y el repositorio. El modo demo (`?demo=1`) existe para ellas.

## Product Purpose

Evolucionar el ecosistema actual de VirtuXperience (https://www.uniminuto.edu/virtuxperience-home), hoy un sitio de tarjetas, hacia un mundo virtual explorable. Cada línea de formación es una isla con estaciones, retos, un minijuego, retroalimentación adaptativa y progreso visible.

Hay éxito cuando:
- El estudiante desarrolla y evidencia competencias en lugar de solo consumir contenido.
- Se puede ir del landing al mundo, completar ComunicArte con su minijuego y ver el pasaporte actualizado, solo con teclado.
- El ejecutable funciona sin internet.

## Positioning

En otros productos las rutas de aprendizaje son listas. Aquí son lugares:
- **Narrativa:** el Faro Minuto perdió su luz y cada isla guarda un fragmento.
- **Evaluación por criterio:** la "Sala de Redacción" mide qué criterios de verificación aplicó el estudiante, no solo si acertó.
- **Adaptación sin red:** el motor adaptativo es local y funciona offline; la IA generativa solo se suma cuando está disponible.
- **Paridad accesible:** el modo 2D equivalente tiene las mismas funciones que el mundo 3D.

## Operating Context

- **Dónde se usa:** navegador de escritorio y móvil (demo desplegada), y ejecutable de Windows/Linux sin conexión.
- **Progreso:** se guarda localmente, sin cuentas; se puede reiniciar o precargar con el modo demo.
- **Público:** colombiano. Contenido y UI en español; código en inglés.
- **Evaluación:** se revisan el README, `docs/`, las evidencias generadas con Playwright, los resultados de Lighthouse y axe, el historial de commits y los binarios del Release.

## Capabilities and Constraints

El alcance completo está en CLAUDE.md §6–§12. Lo que no se negocia:
- **ComunicArte 100 % jugable.** Las demás islas son navegables, con estaciones de muestra y marcadas "Expedición en preparación", sin pantallas vacías. NeuroMath tendrá un segundo minijuego solo si alcanza el tiempo.
- **Funciona 100 % offline.** El LLM es opcional y pasa por un proxy; la API key nunca va en el frontend ni en el ejecutable.
- **El contenido pedagógico vive en `src/data/*.json` validado con Zod**, nunca en componentes.
- **La UI habla el idioma del mundo:** fragmentos, bitácora, pasaporte, mareas. Nada de jerga web como "Página 2".
- **Los assets son propios** (primitivas de three.js) **o CC0 acreditados.** Nada con derechos de terceros.
- **Hay que preguntar a Mario** antes de cambiar el stack, añadir dependencias de más de 200 KB gz o tocar la narrativa.

## Brand Commitments

- **Marca que encabeza:** UNIMINUTO, ecosistema VirtuXperience. El mundo se llama "Archipiélago VirtuX" y la guía con IA se llama "Brújula".
- **Logo oficial de UNIMINUTO:** suministrado por Mario el 2026-10-17, en `src/assets/brand/uniminuto-logo.png`. Se usa tal cual, sin redibujarlo ni alterarlo.
- **Colores institucionales:** amarillo `#FED300` y azul `#004B93`, medidos en el logo oficial; falta confirmarlos con el manual de marca. Cada isla tiene además un acento propio.
- **Nombres de las islas:** son las líneas oficiales de VirtuXperience con su grafía exacta (ComunicArte, NeuroMath, Voxcivitas, Gerencia+, ActivaTuIdea, LatidoSocial) y su lema oficial.
- **Ejecutable:** producto "Virtual Experience Engineering SAS", appId `co.virtualexperience.archipielago`, con icono propio que no es el logo institucional.
- **Estilo fijado por el brief (CLAUDE.md §5):** 3D low-poly estilizado, iluminación cálida y niebla atmosférica, sin assets "de plantilla".

## Evidence on Hand

- `CLAUDE.md`: brief completo del producto, la narrativa, el alcance y el plan por fases.
- Logo oficial de UNIMINUTO en el repo (`src/assets/brand/`). El manual de marca todavía no está: los colores salen del logo.
- Lo que **no** está disponible y no se debe inventar:
  - el enunciado original de la prueba (los 8 requerimientos de CLAUDE.md §18 son una paráfrasis; no citarlos como texto oficial);
  - cifras o datos institucionales de UNIMINUTO, nombres de personas, testimonios y datos de uso reales;
  - resultados de Lighthouse o axe, que se generarán durante el proyecto.

## Product Principles

1. **Un mundo, no una página.** Se aprende en lugares, y cada texto de la interfaz habla el idioma del archipiélago.
2. **Profundidad antes que amplitud.** Una isla impecable vale más que seis a medias; lo que existe funciona perfecto.
3. **Paridad para todo el rango.** Cada capacidad funciona en 3D y en 2D, con teclado, lector de pantalla, movimiento reducido y equipos modestos. La accesibilidad no es un modo aparte.
4. **Offline primero.** La experiencia completa no depende de la red; la IA generativa suma, nunca condiciona.
5. **Evaluar el criterio, no solo el acierto.** La retroalimentación explica el porqué y adapta el camino.

## Accessibility & Inclusion

- **Estándar:** WCAG 2.2 AA, verificado con axe-core en Playwright (0 violaciones serias), y los tres principios del DUA: representación, acción y expresión, implicación.
- **Panel de accesibilidad** siempre a un clic, también con `Alt+A`:
  - tamaño de texto en 4 pasos, alto contraste, fuente para dislexia y espaciado de líneas;
  - reducir movimiento, que también respeta `prefers-reduced-motion`;
  - lectura en voz alta (TTS) y subtítulos.
- **Modo 2D sin WebGL** con paridad funcional.
- **Teclado y lectores de pantalla:** navegación completa por teclado, foco visible, skip links, ARIA correcto y live regions para la retroalimentación.
- **Representación:** cada estación ofrece varios formatos (texto, audio, video, infografía, interactivo).
- **Acción y expresión:** varias formas de responder (clic, teclado, arrastrar con alternativa).
- **Rendimiento para equipos modestos:** dpr adaptativo y carga diferida del mundo 3D.
