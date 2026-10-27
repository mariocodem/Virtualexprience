# Arquitectura

Una sola aplicación web (Vite + React 19 + TypeScript strict) que se despliega como sitio y se empaqueta como ejecutable con Electron. El contenido pedagógico es dato (JSON validado con Zod); las reglas son módulos puros probados; los componentes 3D solo leen el estado y emiten eventos (CLAUDE.md §14).

## Vista general

```mermaid
flowchart TB
  subgraph Datos["Contenido (src/data)"]
    J[islands · stations · badges · levels .json] --> Z{{Zod}}
    C[content/*.json<br/>una por estación] --> Z
  end

  subgraph Dominio["Reglas puras"]
    T[progress/transitions.ts<br/>XP, fragmentos, insignias, bitácora]
    A[ai/adaptiveEngine.ts<br/>dominio, niveles, pistas]
    G[minigames/*/engine.ts<br/>games/*/ núcleos 3D]
  end

  subgraph Estado["Estado (Zustand + persist)"]
    P[(useProgress<br/>virtux:progreso)]
    R[(usePreferences<br/>virtux:preferencias)]
  end

  subgraph UI["Interfaz"]
    L[landing/] --- W[world/<br/>carta 3D y 2D]
    W --> S[stations/StationStage]
    S --> MG[MinigameHost → GameHost<br/>reto 3D o accesible]
    S --> AH[ArenaHost<br/>Bruma 3D o accesible]
    W --> F[finale/<br/>Gran Reto]
    PA[passport/] --- X[a11y/ panel, voz]
  end

  Z --> T & A & UI
  UI -- acciones --> P
  T --> P
  A --> P
  P --> UI
  R --> UI
  B[ai/brujula.ts] -.-> K[llmClient] -.-> Proxy[(server/ · api/<br/>proxy LLM)]
```

## Módulos

| Carpeta           | Responsabilidad                                                                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/`        | Rutas (carga diferida por ruta), layout, encabezado y pie institucionales                                                                                           |
| `src/data/`       | Contenido tipado: islas, estaciones, insignias, niveles y el contenido de cada estación; `validateWorld` cruza referencias                                          |
| `src/landing/`    | Landing cinematográfica: hero 3D, manifiesto, islas, cómo funciona, Brújula, DUA, pasaporte, CTA                                                                    |
| `src/world/`      | La carta: escena 3D (océano, islas, faro, rutas, marcadores, cámara), carta 2D equivalente, paneles y minimapa                                                      |
| `src/stations/`   | Escenario de estación a pantalla completa y los cinco tipos: explorar, practicar, reto, reflexionar, desafío                                                        |
| `src/minigames/`  | Versión accesible de los seis minijuegos y sus motores puros                                                                                                        |
| `src/games/`      | Versión 3D de cada reto y cada arena por isla, la plaza 3D de las demás estaciones (`stations/`) y las piezas comunes (`shared/`); ver [juegos-3d.md](juegos-3d.md) |
| `src/finale/`     | Gran Reto Integrador en el Faro Minuto: encadena las seis arenas                                                                                                    |
| `src/progress/`   | Store persistente, transiciones, insignias, niveles, modo demo                                                                                                      |
| `src/passport/`   | Pasaporte: sellos, fragmentos, bitácora, exportación PNG/PDF                                                                                                        |
| `src/ai/`         | Motor adaptativo, Brújula, cliente del proxy y prompts versionados; ver [ia.md](ia.md)                                                                              |
| `src/a11y/`       | Preferencias, panel (Alt + A), lectura en voz alta; ver [accesibilidad.md](accesibilidad.md)                                                                        |
| `src/ui/`         | Sistema de diseño: Button, Panel, Dialog, Toast, iconos, símbolos de estación                                                                                       |
| `server/`, `api/` | Proxy de IA (desarrollo y Vercel); la API key solo vive aquí                                                                                                        |
| `electron/`       | Proceso principal y preload del ejecutable; ver [ADR 0005](adr/0005-ejecutable-electron.md)                                                                         |

## Rutas

| Ruta                     | Qué es                                                                                                                  |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `/`                      | Landing                                                                                                                 |
| `/mundo/:isla?`          | La carta y cada isla en la misma página: la cámara vuela sin desmontar el mundo; `?estacion=` y `?faro=1` abren paneles |
| `/mundo/:isla/:estacion` | Escenario de la estación, sin cromo institucional                                                                       |
| `/mundo/faro/gran-reto`  | Gran Reto Integrador                                                                                                    |
| `/pasaporte`             | Pasaporte del explorador                                                                                                |
| `/accesibilidad`         | Declaración de accesibilidad y ajustes                                                                                  |

Cualquier ruta acepta `?demo=1`, que precarga un recorrido de demostración (pregunta antes si ya hay progreso).

## Flujo de una estación

```mermaid
sequenceDiagram
  participant U as Estudiante
  participant W as Carta (world/)
  participant S as StationStage
  participant J as Juego (3D o accesible)
  participant P as useProgress
  participant A as adaptiveEngine
  U->>W: Enter sobre la estación
  W->>S: /mundo/comunicarte/comunicarte-sala-redaccion
  S->>P: startStation
  S->>A: minigameLevel(dominio)
  A-->>J: nivel 1–5
  U->>J: juega (teclado, ratón o táctil)
  J->>P: recordMinigame(precisión, criterios, pistas)
  J->>A: updateMastery
  J->>S: onComplete(puntaje)
  S->>P: completeStation → XP, fragmento, insignias
  P-->>U: avisos (insignia, nivel, fragmento)
```

## Decisiones

Las decisiones de arquitectura están en [`docs/adr/`](adr/):

1. [Stack y versiones](adr/0001-stack-y-versiones.md)
2. [Enrutado](adr/0002-enrutado.md)
3. [Mundo navegable](adr/0003-mundo-navegable.md)
4. [Juegos 3D con versión accesible](adr/0004-juegos-3d.md)
5. [Ejecutable con Electron y protocolo propio](adr/0005-ejecutable-electron.md)

## Calidad

- **Vitest** (`tests/unit/`): transiciones del progreso, insignias, motor adaptativo, motores de minijuegos, núcleos de los juegos 3D, contenido, rutas y componentes de UI.
- **Playwright + axe** (`tests/e2e/`): landing, carta, recorrido solo con teclado, pasaporte, modo demo, panel de accesibilidad y Gran Reto, en escritorio y en móvil.
- **Ejecutable** (`tests/electron/`): abre el paquete, verifica el aislamiento y el modo sin red.
- **CI** (`.github/workflows/ci.yml`): lint, tipos, formato, pruebas, build y e2e en cada push. `release.yml` compila y prueba los ejecutables por tag.
