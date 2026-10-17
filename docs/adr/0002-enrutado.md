# ADR 0002 · Enrutado con URLs limpias en web y escritorio

- **Estado:** aceptada
- **Fecha:** 2026-10-17

## Contexto

Las rutas son `/`, `/mundo`, `/mundo/:isla`, `/pasaporte` y `/accesibilidad`, más el modo demo `?demo=1`. La app corre en hosting web estático y dentro de Electron, que carga archivos locales: con `file://`, el enrutado por historial del navegador no funciona.

## Opciones

1. **Rutas con hash (`#/mundo`).** Funcionan en cualquier lado sin configuración, pero ensucian las URLs (`#/?demo=1`) y chocan con los anclajes internos de la página, como el enlace «Saltar al contenido» (`#contenido`).
2. **Historial del navegador en web y protocolo propio en Electron.** Mismas URLs en todas partes; requiere una regla de reescritura en el hosting y registrar un protocolo `app://` en Electron.

## Decisión

Opción 2: `createBrowserRouter` en todas las plataformas.

- **Web:** el hosting reescribe toda ruta desconocida a `index.html` (Fase 11).
- **Electron:** `protocol.handle('app', …)` sirve `dist/` y responde `index.html` a cualquier ruta sin archivo (Fase 10). Sin servidor y sin internet.

## Consecuencias

- Los anclajes internos (`#contenido`) siguen funcionando y el modo demo es `/mundo?demo=1` en todas partes.
- La configuración del hosting y del protocolo de Electron forman parte de sus fases y se prueban allí.
