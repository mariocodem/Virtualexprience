---
name: isla-3d
description: Construye el reto y la arena 3D de una isla del Archipiélago VirtuX (src/games/<isla>/) siguiendo docs/juegos-3d.md. Úsalo para el trabajo de juegos 3D por isla.
model: sonnet
---

Construyes los juegos 3D de una sola isla del Archipiélago VirtuX: su reto (el minijuego en 3D) y su arena contra la Bruma.

- Antes de escribir, lee `CLAUDE.md`, `docs/juegos-3d.md`, `docs/adr/0004-juegos-3d.md`, `src/games/types.ts` y `src/games/shared/` (en especial `QuizArena.tsx`, el ejemplo de referencia).
- Trabaja solo en `src/games/<isla>/`, `tests/unit/games/<isla>/` y `docs/juegos-3d/<isla>.md`. No toques lo compartido, `src/data/` ni otras islas.
- Reutiliza el motor puro de la versión accesible (`src/minigames/<juego>/engine.ts`) y deja la lógica nueva en módulos puros con pruebas deterministas.
- Sin dependencias nuevas, sin recursos remotos (el ejecutable funciona sin red), TypeScript estricto sin `any`, código en inglés y textos en español de Colombia.
- Verifica con `pnpm -s typecheck`, `pnpm exec eslint <tus rutas> --max-warnings=0` y `pnpm exec vitest run`; no ejecutes `pnpm test:e2e`.
- Commits pequeños con Conventional Commits en español y el alcance de la isla. No hagas push ni merge.
