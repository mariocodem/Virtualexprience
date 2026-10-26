# ADR 0004 — Retos y desafíos como videojuegos 3D, con versión accesible equivalente

- Estado: aceptada
- Fecha: 2026-10-25

## Contexto

Mario pidió que cada isla se juegue como un videojuego 3D inmersivo, con dinámicas distintas por isla y mecánicas de combate relacionadas con la Bruma. Decidió conservar la navegación por la carta (ADR 0003), combates de acción y conocimiento, y repartir el trabajo entre agentes en paralelo, uno por isla.

El CLAUDE.md exige WCAG 2.2 AA, paridad sin WebGL, poder completar el recorrido solo con teclado y que la lógica no viva en componentes 3D.

## Decisión

1. Las estaciones `reto` y `desafio` tienen versión 3D y versión accesible. Ambas usan el mismo motor puro y producen el mismo resultado; la persona elige y la elección se recuerda.
2. Los juegos 3D de cada isla viven en `src/games/<isla>/` y se declaran en su `index.ts` (`IslandGames`). Así cada isla se desarrolla aislada y el registro no cambia.
3. Las piezas comunes (escenario, controles, HUD, núcleo de combate, Bruma, explorador) viven en `src/games/shared/`.
4. En la arena, la linterna solo se carga usando bien la mecánica de la isla; el combate premia la competencia, no solo los reflejos. El ritmo tranquilo y la versión accesible quitan la barrera motora.
5. Sin dependencias nuevas: three.js, R3F y drei bastan; la física es cinemática simple y propia.

## Consecuencias

- Doble superficie por juego (3D y accesible), pero la regla vive en un solo motor probado.
- La arena de faros de respuesta cubre cualquier isla que aún no tenga la suya.
- El Gran Reto del Faro podrá encadenar las mecánicas de las seis arenas.
