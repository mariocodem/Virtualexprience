# Gerencia+ · juegos 3D

Competencia: gestión, decisiones con datos y liderazgo (priorizar, leer datos atípicos y promedios engañosos, cuidar al equipo). Las dos piezas comparten la misma materia: las **jornadas del mercado** alimentan los partes del contramaestre en la arena.

## Día de mercado (reto, `gerencia-mercado`)

El puesto de empanadas del muelle, con toldo a rayas, mostrador, horno, grúa y casco a medio armar al fondo.

1. **Pizarra** (arriba a la izquierda, HTML real): los datos de la jornada. Durante la jornada muestra vendidas, sobrantes y sin atender en vivo.
2. **Pedido**: se elige la cantidad con `1`–`4`, las flechas o el clic; las **cajas se apilan en el muelle** (una por 20 empanadas; la última va a medias). `Enter` o «Encargar a la cocina» confirma. Las opciones que la caja no alcanza están deshabilitadas.
3. **Dilema**: el ayudante sale al frente con un globo; se decide con `1`–`3` y se ve la consecuencia (caja, reputación, ánimo) antes de «Abrir el puesto».
4. **Jornada**: los clientes hacen fila, compran y se van con su bolsa; quienes no se atienden se van sin comprar. Lo que sobra queda en el mostrador. «Pasar al cierre» salta la animación (con movimiento reducido corre cuatro veces más rápido). El sol avanza con las ventas y anochece al cierre; cada jornada nueva amanece.
5. **Cierre y libro de cuentas** (desplegable), y al final el `GameReport` compartido.

Mismo motor (`src/minigames/dia-de-mercado/engine.ts`) y mismas métricas que la versión accesible: `recordMinigame('dia-de-mercado', …)`, `onFail` si el puntaje es menor a 0,6, `onComplete(score)` desde el informe. La escena solo pone en escena lo que el motor ya decidió (`market3d.ts` reparte las ventas en clientes y se prueba que suman exactamente lo vendido, sobrante y no atendido del motor).

## Llevar el timón (arena, `gerencia-cierre`)

Combate en barco en un mar circular alrededor del islote de la Bruma de la deriva.

| Control                                       | Acción                                                          |
| --------------------------------------------- | --------------------------------------------------------------- |
| `A` `D` / `←` `→`                             | Timón (babor / estribor), con inercia                           |
| `W` `S` / `↑` `↓`                             | Abrir y recoger las velas                                       |
| `V` `B` `L` (o los botones de la Tripulación) | Mandar un marinero a velas, bomba o linterna                    |
| `Espacio` / `J` / botón                       | Disparar el haz **por la proa** (hay que gobernar para apuntar) |
| `1`–`4`                                       | Responder el parte del contramaestre                            |
| `Esc` / `P`                                   | Pausa                                                           |

- **Tripulación** (tres marineros): sin nadie en las velas no hay velocidad (dos rinden más); sin nadie en la bomba entra agua y el barco se hace lento (los golpes abren una vía que solo se achica con más gente); sin nadie en la linterna no se puede disparar (dos dan más margen de puntería).
- **Viento**: el rumbo en popa rinde más que de proa; la brújula del HUD muestra la proa arriba, la Bruma y el viento.
- **Peligros**: rocas (sombra de aviso y caída), remolinos (jalan y golpean en el ojo) y olas en arco. Fase 1: rocas y remolinos; fase 2 suma olas; fase 3 las combina.
- **Decisiones con datos**: el contramaestre alterna los embates de la Bruma (`content.items`) con decisiones sacadas de las jornadas del mercado (cuántas encargar, y el dilema del equipo cuando tiene una única salida sólida), con la sutileza de cada fase (`tiers`). Acertar carga la linterna; equivocarse devuelve medio golpe a la Bruma y la hace atacar enseguida.
- **Ritmo tranquilo (`calm`)**: peligros 1,8 veces más espaciados, más aviso, rocas y olas más pequeñas, remolinos más débiles, menos agua, barco más lento y dócil, puntería mucho más ancha. **Movimiento reducido (`still`)**: cámara fija que encuadra todo el mar y sin vaivén del barco.
- **Gran Reto**: funciona con `goal` de 1 a 3, `lights` de 4–5 y solo tres embates propios: las decisiones del mercado completan el repertorio sin repetir.

## Archivos

- `src/games/gerencia/index.ts`: registro del reto y la arena.
- `mercado/`: `market3d.ts` (cajas, fila, luz del día), `report.ts`, `format.ts`, `Mercado3D.tsx`, `MercadoScene.tsx`, `MercadoHud.tsx`, `TextSprite.tsx`.
- `timon/`: `ship.ts` (física, tripulación, peligros), `decisions.ts`, `TimonArena.tsx`, `TimonScene.tsx`.
- `data/`: `gerencia3d.json` (equipo, estaciones del barco, avisos) validado con Zod en `schema.ts`.
- Pruebas: `tests/unit/games/gerencia/`.

## Decisiones

- Los rótulos de la escena son sprites de lienzo 2D, sin `<Html>` ni fuentes remotas. Una sola luz de punto (las lámparas del puesto de noche).
- Los datos del mercado se importan del JSON de la estación y se validan con el esquema compartido; no se toca `src/data/`.
- La cámara del barco se coloca detrás del barco respecto al islote y mira un punto intermedio, así la Bruma siempre queda a la vista.

## Cómo probar

`pnpm dev`; con `localStorage` sembrado (completar `gerencia-recursos` y `gerencia-decisiones`) abrir `/mundo/gerencia/gerencia-mercado`; con `gerencia-mercado` completa, `/mundo/gerencia/gerencia-cierre`. Pruebas: `pnpm exec vitest run tests/unit/games/gerencia`. Verificado en Chromium (WebGL por software) jugando de punta a punta: reto ganado y perdido (también con ritmo tranquilo), arena con victoria real y con retirada, en 1440×900 y 412×915.
