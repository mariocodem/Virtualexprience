# ADR 0001 · Stack y versiones

- **Estado:** aceptada
- **Fecha:** 2026-10-17

## Contexto

CLAUDE.md §3 fija el stack (Vite, React, three.js con React Three Fiber, Tailwind, Zustand, React Router, Electron, Vitest y Playwright). Al iniciar el proyecto varias dependencias tienen versiones mayores nuevas y algunas combinaciones no son compatibles entre sí.

## Decisión

| Pieza                 | Versión                            | Motivo                                                                                                                                                      |
| --------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node                  | 24 LTS (`engines: >=24`, `.nvmrc`) | Node 20 dejó de tener soporte el 30 de abril de 2026.                                                                                                       |
| pnpm                  | 9.15.9 (`packageManager`)          | La que fija CLAUDE.md; un solo lockfile.                                                                                                                    |
| React                 | 19.3                               | Aprobado por Mario el 2026-10-16. @react-three/fiber 9, drei 10 y postprocessing 3 exigen React 19.                                                         |
| TypeScript            | 6.0                                | typescript-eslint 8 admite `typescript <6.1`; TypeScript 7 (compilador nativo) rompería el lint con tipos.                                                  |
| ESLint                | 9                                  | eslint-plugin-jsx-a11y todavía no declara soporte para ESLint 10.                                                                                           |
| Vite / Vitest         | 8 / 5                              | Versiones actuales y compatibles entre sí.                                                                                                                  |
| Tailwind CSS          | 4                                  | Configuración en CSS (`@theme`), integrada con los tokens de `src/styles/tokens.css`. Se elimina la paleta por defecto: solo existen los colores del mundo. |
| React Router          | 8, modo de datos                   | Rutas con carga diferida (`lazy`) para que la landing no espere al mundo 3D.                                                                                |
| Playwright + axe-core | 1.64 / 4.14                        | E2E en escritorio (1440×900) y móvil (Pixel 7) con auditoría WCAG 2.2 AA.                                                                                   |

## Consecuencias

- Al subir TypeScript a 7 o ESLint a 10 hay que revisar primero la compatibilidad de typescript-eslint y jsx-a11y.
- Las dependencias pesadas de cada fase (three.js, GSAP, Howler, Electron) se añaden en su fase, no por adelantado.
