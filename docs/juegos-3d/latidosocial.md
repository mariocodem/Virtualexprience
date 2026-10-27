# LatidoSocial en 3D

Bosque comunitario y huerta. Competencia: proyección social y bienestar (reconocer los saberes de cada grupo, repartir el trabajo sin agotar a nadie, decidir con la comunidad). Código en `src/games/latidosocial/`.

## Reto: La huerta comunitaria (`huerta/Huerta3D.tsx`)

Las eras, la ceiba, el bosque y el fuego de la asamblea, de noche. Cada luna trae su cielo (la luna crece con la temporada).

- Cuatro grupos de tres figuras, cada uno de su color, con faroles de energía sobre la cabeza. Un grupo agotado se ve encorvado y descansa bajo la ceiba.
- Se elige un grupo y se lleva a una era (tarea) o a descansar. Las plantas crecen con las familias alimentadas y la salud del suelo, y reaccionan al trabajo recibido.
- El dilema se resuelve en **asamblea**: todos se reúnen junto al fuego y se decide con la tarjeta de decisión compartida.
- Mismo motor (`src/minigames/huerta-comunitaria/engine.ts`), mismas métricas (`recordMinigame`) y mismo informe (`GameReport`) que la versión accesible.

**Controles**: `1`–`4` elige el grupo; luego `1`–`3` la tarea (o `0`/`R` descansar, `Retroceso` suelta); `Enter`/`E` reparte y pasa de luna. También con clic (grupo, luego era o ceiba) y con los botones del panel.

Lógica pura en `huerta/flow.ts` (teclado del reparto, puestos de los grupos, crecimiento, luna).

## Arena: Defender el bosque juntos (`arena/DefenderBosque.tsx`)

La Bruma del sálvese quien pueda manda oleadas de niebla por cuatro senderos. Cada farol pide un saber (`arena/bosque.json`, validado con Zod en `arena/data.ts`).

- **Asignar**: `E` junto a un farol o `1`–`4` abre su llamado; luego `1`–`4` elige el grupo (`5` o Retroceso: dejar libre/cancelar). Si el grupo tiene el saber, la niebla se disipa y la ceiba se carga; si no, solo la frena y la Bruma se fortalece.
- **Cuidar**: cada grupo gasta energía en un farol (más resistencia con ritmo tranquilo). Hay que rotarlo antes de que se agote; si se agota, deja el farol, descansa y baja la participación, que multiplica lo que rinden los faroles.
- **Decidir entre todos**: al llenarse la luz de la ceiba, esta pide una decisión de conocimiento (`content.items`, sutileza por fase). Acertar carga el haz; fallar fortalece a la Bruma.
- **Disparar**: `Espacio` (o el botón) lanza el haz de la ceiba, que siempre acierta; la dificultad está en cargarlo. La niebla que llega a la ceiba cuesta una luz.
- `calm`: niebla más lenta, oleadas más espaciadas y grupos que aguantan más. `still`: sin balanceos, partículas ni cámara que sigue.
- Funciona con metas cortas (1–3 golpes) y pocos embates, como en el Gran Reto.

Lógica pura en `arena/defense.ts`. Decisiones: cada asignación y cada decisión de la ceiba llama a `onDecision`; `onEnd` se emite una sola vez.

## Relación arena–reto

Los mismos cuatro grupos, saberes y energía: en el reto se reparte el trabajo por lunas; en la arena, bajo presión, se asigna y rota en tiempo real.

## Decisiones

- Arena con bucle propio (estrategia, no puntería) reutilizando `GameStage`, HUD, `Bruma3D`, `Explorer` y `LightBeam`.
- `Folk.tsx` (figuras) y la ceiba/bosque (`arena/BosqueScene.tsx`) se comparten entre reto y arena. Sin dependencias nuevas ni red (rótulos con `<Html>`).

## Cómo probar

`pnpm exec vitest run tests/unit/games/latidosocial`. En el navegador, sembrar `virtux:progreso` con las estaciones previas completadas y abrir `/mundo/latidosocial/latidosocial-huerta` (reto) o `/mundo/latidosocial/latidosocial-cierre` (arena).
