# Juegos 3D del Archipiélago

Cada isla se juega como un videojuego 3D con su propia dinámica: un **reto** (el minijuego de la isla) y una **arena** contra su Bruma, de acción y conocimiento. La carta del mundo sigue igual (ADR 0003); lo que cambia es cómo se juegan las estaciones de tipo `reto` y `desafio`.

La versión accesible de siempre (formularios, lectura, lector de pantalla) **no se elimina**: es la alternativa equivalente que exige WCAG 2.2 y el modo sin WebGL. Ambas versiones llegan al mismo resultado con el mismo motor.

## Cómo encaja

```
StationStage
├─ reto     → MinigameHost → GameHost ─┬─ 3D: GAMES[isla].Minigame   (src/games/<isla>/)
│                                     └─ accesible: src/minigames/<juego>/
└─ desafio  → ArenaHost ───────────────┬─ 3D: GAMES[isla].arena      (src/games/<isla>/)
                                       │      (si falta: QuizArena, faros de respuesta)
                                       └─ accesible: BossBattle
```

- La preferencia `gameMode` (`'3d' | 'accesible'`) se recuerda; `ModeSwitch` permite cambiarla en todo momento. Sin WebGL 2 se juega la accesible.
- `calmPace` (ritmo tranquilo) hace los ataques más lentos y espaciados y ayuda a apuntar.
- Cada isla declara sus juegos en `src/games/<isla>/index.ts` (`IslandGames`): mientras uno sea `null`, se juega su versión accesible.

## Contratos (`src/games/types.ts`)

**Reto 3D**: recibe exactamente `MinigameProps<Contenido>`, las mismas props que su versión accesible. Usa el **mismo motor puro** (`src/minigames/<juego>/engine.ts`) para reglas, puntaje e informe, y avisa igual: `onBrujula`, `onEvents(recordMinigame(...))`, `onComplete(score)`, `onFail(score)`. El informe final puede ser el `GameReport` compartido.

**Arena 3D**: recibe `ArenaProps`:

| Prop                               | Uso                                                                                                                          |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `content`                          | La Bruma de la isla (nombre, carácter, frases) y sus embates (`items`)                                                       |
| `level`, `goal`, `lights`, `tiers` | Del motor adaptativo (`bossConfig`): nivel, golpes de luz para ganar, luces del explorador, sutileza de los embates por fase |
| `calm`, `still`                    | Ritmo tranquilo y movimiento reducido: hay que respetarlos                                                                   |
| `onDecision`                       | Cada decisión de conocimiento, al tomarla (alimenta el dominio)                                                              |
| `onEnd`                            | Una sola vez: `{ outcome, accuracy, decisions }`                                                                             |
| `onAccessible`                     | Desde la pausa, pasar a la versión accesible                                                                                 |

La regla de oro de las arenas: **la linterna solo se carga usando bien la mecánica de la isla** (la misma competencia que entrena su reto). Acertar carga disparos de luz; equivocarse fortalece a la Bruma.

## Piezas compartidas (`src/games/shared/`)

| Pieza                                              | Para qué                                                                                                                                                                              |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GameStage`                                        | Lienzo + capa de HUD, pausa (Esc o P, sin salir de la estación), ayuda de controles, pantalla completa, pausa al cambiar de pestaña, región `aria-live`                               |
| `Controls`                                         | Teclado (WASD/flechas, Espacio, Mayús, E/Enter), ratón (`PointerAim`) y botones táctiles. Solo escucha con el foco dentro del juego                                                   |
| `hud.tsx`                                          | `HudPanel`, `HudMeter` (rol `meter`), `LightsHud`, `KeyHint`, `Banner`, `DecisionCard` (opciones con 1–4), `TouchPad`                                                                 |
| `arena/core.ts`                                    | Núcleo puro y probado del combate: moverse, esquivar, ataques de la Bruma (ráfaga, acecho, espiral, golpe con aviso), carga (`chargeArena`), castigo (`strengthenBruma`), haz y fases |
| `scene/ArenaRig`                                   | Avanza el núcleo en cada cuadro y dibuja explorador, Bruma, ataques, haz y cámara                                                                                                     |
| `scene/Explorer`, `scene/Bruma3D`, `scene/Hazards` | Personaje, Bruma (tinte `brumaTint(isla)`), orbes, zonas, haz                                                                                                                         |
| `scene/ArenaScenery`                               | `ArenaLights`, `ArenaPlatform`, `ArenaCamera`, `PointerAim`                                                                                                                           |
| `QuizArena`                                        | Arena de respaldo y **ejemplo de referencia** de cómo se cablea `ArenaProps`                                                                                                          |

Una arena puede usar el núcleo tal cual, extenderlo con sus propias entidades o tener su propio bucle (un barco, una defensa), siempre con las piezas comunes de HUD, pausa y Bruma.

## Reglas

- **Accesibilidad**: toda decisión se puede tomar con teclado (números, E/Enter) y se anuncia; el lienzo es `aria-hidden`; nada destella más de 3 veces por segundo; `still` quita sacudidas, partículas y cámara que sigue; `calm` debe hacer el juego claramente más amable.
- **Rendimiento**: menos de ~150 llamadas de dibujo por escena; mallas instanciadas o fundidas para lo repetido; 60 fps en un portátil medio.
- **Sin red**: el ejecutable funciona sin internet. Nada de fuentes, texturas ni modelos remotos (no usar `<Text>` de drei, que descarga su fuente): los rótulos van en el HUD o con `<Html>`.
- **Sin dependencias nuevas** y sin tocar el contenido compartido (`src/data/`). Si una isla necesita datos propios (rumores, losetas, guiones), van en su carpeta como JSON validado con Zod.
- **Lógica fuera de los componentes 3D** (CLAUDE.md §14): las reglas de cada juego viven en módulos puros con pruebas en `tests/unit/games/<isla>/`.
- Código en inglés, textos en español de Colombia, comentarios breves.

## Dirección de cada isla

Cada isla tiene una dinámica distinta; la arena retoma la competencia de su reto.

| Isla         | Reto 3D                                                                                                                                                                                                                                                   | Arena contra la Bruma                                                                                                                                                                                                           |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ComunicArte  | **Sala de Redacción**: escritorio de la radio de noche; las noticias llegan del tubo neumático; se investigan con objetos (lupa, calendario, archivador, mesa de luz) mientras corre el reloj del cierre; se sella y la nota sale al aire o a la papelera | **Verificar los rumores**: rumores con titular vuelan hacia la torre de radio; se interceptan, se verifican y se desmienten o se dejan pasar. Dejar pasar un rumor falso fortalece a la Bruma                                   |
| NeuroMath    | **Puentes de Fractal**: un cañón entre acantilados geométricos; piezas rotuladas en un estante que encajan en las ranuras del puente; la vagoneta lo pone a prueba y, si la cuenta no da, el puente se derrumba                                           | **Reconstruir el puente de luz**: la Bruma está tras un abismo; se recogen losetas con valores (fracciones, porcentajes, escalas) para tender un puente que mida justo; solo desde el puente alcanza el haz                     |
| Voxcivitas   | **Sesión de cabildo**: la plaza con los representantes alrededor de la mesa; quien habla se ilumina; se modera con una rueda de intervenciones; la confianza se ve en las auras; el acta se escribe; votación final con faroles                           | **Moderar la plaza**: la indiferencia apaga a los vecinos; cuando alguien alza la voz se le responde con una intervención deliberativa; quien se siente escuchado enciende su farol y su luz carga la linterna                  |
| Gerencia+    | **Día de mercado**: el puesto del puerto con la pizarra de datos; se cargan las cajas del pedido; los clientes hacen fila y compran; sobrantes y faltantes se ven; el dilema llega por el equipo; amanece y anochece cada jornada                         | **Llevar el timón**: combate en barco alrededor de la Bruma; se gobierna el timón y las velas leyendo la brújula y el viento, y se reparte la tripulación entre velas, bomba y linterna; las decisiones con datos cargan el haz |
| ActivaTuIdea | **Banco de pruebas**: el taller con el prototipo en un banco giratorio; quienes lo prueban dejan sus comentarios como burbujas que se clasifican; las mejoras se eligen del estante con los materiales; la prueba con agua muestra el resultado           | **Prototipar el cañón de luz**: burbujas de comentarios flotan por el taller; se recogen las que se repiten y se llevan al banco para mejorar el cañón; las ocurrencias lo atascan. Cada iteración con evidencia es un disparo  |
| LatidoSocial | **La huerta comunitaria**: las eras en 3D; los cuatro grupos se llevan a las tareas o a descansar bajo la ceiba; su energía flota sobre sus cabezas; las plantas crecen cada luna; los dilemas, en asamblea                                               | **Defender el bosque juntos**: oleadas de niebla avanzan hacia el bosque; se asignan los grupos a los faroles según su saber y se rotan antes de que se agoten; los faroles bien atendidos cargan la ceiba, que dispara el haz  |

## Verificar en el navegador

Cada juego se prueba con Playwright y WebGL por software (`--use-angle=swiftshader`). Para abrir una estación sin recorrer el sendero se siembra el progreso en `localStorage` (`virtux:progreso`) con las estaciones previas completadas; ver `docs/juegos-3d/` de cada isla.
