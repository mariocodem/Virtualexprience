# NeuroMath · juegos 3D

Competencia: pensamiento lógico-matemático (fracciones, porcentajes, escalas, ecuaciones, proporciones). Dos juegos que comparten la misma idea —**tender un puente que mida justo**— con dinámicas distintas: uno de construir y probar, otro de construir mientras se esquiva.

## Reto 3D · Puentes de Fractal (`neuromath-puentes`)

Un cañón entre acantilados geométricos. Las piezas esperan en un estante rotuladas con su expresión («¾ de 8 m», «25 % de 24 m», «2x + 1 = 17»…); se encajan en las ranuras del puente, dibujadas a escala. La vagoneta lo prueba: si la suma no da el hueco, el puente queda corto (la vagoneta cae al agua) o se arquea y salta, con piezas que caen (`debris.ts`); si da, cruza y el puente se ilumina. Brújula da la pista del concepto igual que en la versión accesible.

**Mismo motor, mismas métricas.** Usa `src/minigames/puentes-de-fractal/engine.ts` (plan por nivel, selección, `testBridge`, `report`), `recordMinigame('puentes-de-fractal', …)`, `onComplete`/`onFail` y el informe `GameReport`. Las cargas de prueba, el puntaje y las pistas son idénticos.

| Mando                                | Acción                                               |
| ------------------------------------ | ---------------------------------------------------- |
| `1`–`9` o clic en la pieza           | Poner o quitar la pieza                              |
| `←` `→` / `A` `D` o clic en un tramo | Elegir la ranura                                     |
| `Retroceso` / `X`                    | Quitar el tramo de la ranura elegida                 |
| `T` o `Enter`                        | Probar con la vagoneta (o pasar al siguiente puente) |
| `Esc` / `P`                          | Pausa                                                |

Los botones del HUD hacen lo mismo (son los controles accesibles; el lienzo es `aria-hidden`). Con movimiento reducido la prueba salta al final sin animación.

## Arena 3D · Reconstruir el puente de luz

La Bruma flota sobre un abismo; el explorador está en un anillo de roca. La Bruma **proyecta un hueco** escrito de formas distintas según la fase (`gapExpr.ts`: metros, fracción, porcentaje, escala de plano, ecuación; con ritmo tranquilo se añade «(son 12 m)»). Alrededor esperan cinco losetas con valores. Se recogen, se colocan en el estribo (sur) y se prueban con la palanca:

- **Mide justo** → el puente se enciende (`chargeArena`). Subiendo al tablero se dispara y el haz sale del extremo norte del puente y alcanza a la Bruma. Sin puente iluminado no hay disparo ni se puede pisar el abismo.
- **No mide justo** → el puente cae con sus piezas y la Bruma se fortalece (`strengthenBruma`). Con ritmo tranquilo, el primer fallo de cada hueco se perdona (las losetas vuelven al anillo, sin castigo ni decisión registrada).

Cada prueba final es una `onDecision({correct, tier, itemId: <id del puente>})`. La sutileza (`tiers`) elige los puentes de `neuromath-puentes.json` de esa fase. No usa `content.items` (en el Gran Reto solo hay 3 embates), así que funciona con cualquier `goal` (1–3 o más) y con cualquier Bruma; sí usa `content.bruma.taunts` para los avisos de fase.

| Mando                              | Acción                                                                       |
| ---------------------------------- | ---------------------------------------------------------------------------- |
| `WASD` / flechas, `Mayús`          | Moverse y esquivar                                                           |
| `1`–`5` o `E` junto a la loseta    | Recoger                                                                      |
| `E` junto al estribo               | Colocar la loseta que llevas (o quitar el último tramo con las manos libres) |
| `E` junto a la palanca             | Probar el puente                                                             |
| `Espacio` / clic (sobre el puente) | Disparar el haz                                                              |

## Relación arena–reto

El reto enseña a calcular con calma (cargas de prueba, estimar con el dibujo a escala); la arena exige lo mismo bajo presión y con expresiones más sutiles. Ambos juzgan con la misma suma (`span`/`outcomeOf` del motor) y los mismos puentes del JSON.

## Decisiones

- **Lógica pura probada** (`tests/unit/games/neuromath/`): `canyon.ts` (guion de la prueba), `debris.ts` (caída), `workbench.ts` (banco de piezas), `buildFlow.ts` (máquina de la arena), `abyss.ts` (geografía y objetivos), `gapExpr.ts` (expresiones del hueco).
- **Rótulos de lienzo 2D** (`Label.tsx`, sprites) en vez de `<Html>` de drei, que falla con el doble montaje del modo estricto. Con pantallas angostas el rótulo se reduce al número.
- Sin luces por objeto: los brillos son materiales emisivos. Pocas llamadas de dibujo (por debajo de ~150).
- Al pulsar un botón del HUD el foco vuelve al escenario para que el teclado siga moviendo al explorador.
- Variantes locales: la arena no usa `ArenaRig` (necesita su propio bucle: colisión con el abismo, disparo condicionado al puente); usa `stepArena` y las piezas visuales compartidas.

## Cómo probar

1. `pnpm exec vitest run tests/unit/games/neuromath`.
2. Sembrar progreso (`virtux:progreso`) con `neuromath-patrones` y `neuromath-proporciones` completadas y abrir `/mundo/neuromath/neuromath-puentes` (reto); completar también `neuromath-puentes` y abrir `/mundo/neuromath/neuromath-cierre` (arena). Preferencia `gameMode: '3d'`.
3. Probar con y sin «Ritmo tranquilo» y con movimiento reducido.
