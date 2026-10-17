# ADR 0003 · Mundo navegable: una ruta, lista equivalente y carta 2D

- **Estado:** aceptada
- **Fecha:** 2026-10-17

## Contexto

El mundo (`/mundo`) es un mapa 3D con islas y paradas. Debe permitir volar de la carta a cada isla
(GSAP, 1,2 s, `power3.inOut`), funcionar solo con teclado y con lector de pantalla, y tener un modo
2D equivalente sin WebGL (CLAUDE.md §6 y §10).

## Decisiones

1. **Una sola ruta, `mundo/:isla?`.** La carta y cada isla son la misma página: el canvas no se
   desmonta al navegar y la cámara vuela entre poses. La estación o el faro abiertos viven en la URL
   (`?estacion=`, `?faro=1`), así que se pueden enlazar y el botón Atrás los cierra.
2. **La lista es la interfaz accesible; el mapa, su vista.** La cartela lista las islas o el sendero
   de estaciones con enlaces reales (flechas, Inicio/Fin, Tab, Enter; Esc cierra el panel y luego
   vuelve a la carta). Los rótulos del mapa se pueden pulsar con el puntero pero están ocultos a la
   accesibilidad para no duplicar la lista. Foco y puntero comparten el resaltado (`worldStore`).
3. **Una geografía, dos dibujos.** `geography.ts` y `layout.ts` son funciones puras y deterministas:
   el relieve 3D y la carta 2D (`MapFallback2D`) colocan islas, paradas y sendero en las mismas
   coordenadas. El 2D se usa si no hay WebGL 2 o si el estudiante lo elige (preferencia persistente).
4. **La escena 3D no decide nada.** Los componentes 3D emiten eventos (`onSelect`, `onHover`); la
   página navega y el store de progreso aplica las reglas.

## Consecuencias

- Las pruebas e2e recorren el mundo solo con teclado y en modo 2D, y auditan cada estado con axe.
- Toda nueva isla o estación aparece en el 3D, el 2D y la lista sin tocar componentes: basta el JSON.
