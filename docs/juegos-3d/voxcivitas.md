# Voxcivitas en 3D

Competencia: ciudadanía, ética y deliberación (escuchar, pedir evidencia, integrar posturas, evitar falacias e imposiciones). Código en `src/games/voxcivitas/`, pruebas en `tests/unit/games/voxcivitas/`.

## Sesión de cabildo (reto, estación `voxcivitas-cabildo`)

La plaza con el cabildo al fondo; los cuatro grupos se sientan alrededor de la mesa redonda y quien modera (el explorador) ocupa el frente.

- **Quien habla se ilumina**: su túnica brilla, gesticula y una luz cálida lo sigue. Su intervención aparece como el globo de la rueda.
- **Rueda de intervenciones**: las opciones de la ronda (teclas 1 a 6, clic o Tab + Enter). Tras elegir se ve cómo cayó (movimiento deliberativo, calidad, cambio de confianza y acuerdo del acta); Brújula explica el porqué.
- **Aura de confianza** en el suelo de cada grupo: crece o se apaga con cada intervención; la marca fina es el umbral para respaldar. Un rótulo flotante muestra el cambio (`+12`, `−15`).
- **Acta**: un pergamino sobre la mesa que se alarga con cada acuerdo (y el listado en el HUD).
- **Votación con faroles**: grupo por grupo, quien alcanza el umbral alza su farol; el público de la plaza alza el suyo según el veredicto (`crowdSupport`).
- Informe: el mismo `GameReport` y los mismos criterios (`debrief`) que la versión accesible.

Mismo motor que la versión accesible (`src/minigames/sesion-de-cabildo/engine.ts`: plan por nivel, rondas, confianza, `report`, `recordMinigame`, dominio con `record`), por lo que ambas dan el mismo puntaje.

## Moderar la plaza (arena, estación `voxcivitas-cierre`)

La Bruma de la indiferencia orbita el centro y dispara niebla; la niebla que toca a un vecino lo va apagando (gris, encogido).

1. Cada cierto tiempo alguien **alza la voz**: una gota de luz sobre su cabeza, su nombre y un aro dorado en el suelo; el HUD dice dónde está y cuánta paciencia le queda.
2. Hay que **llegar al aro y pulsar E** (o el botón «Escuchar»): pausa táctica (el combate va a cámara lenta) y aparece la rueda con su intervención y sus respuestas posibles.
3. **Intervención sólida** (calidad 1): enciende su farol, su luz anima a los vecinos cercanos, una estela viaja a la linterna y se carga un disparo (`chargeArena`). **A medias**: no pasa nada. **Falacia o imposición** (calidad 0): se apaga del todo, enfría a los de al lado y la Bruma se fortalece (`strengthenBruma`).
4. Si nadie llega a tiempo, quien esperaba se rinde y se apaga (en ritmo normal también fortalece a la Bruma).
5. Con carga: apuntar con el ratón y disparar con Espacio o clic. `goal` golpes disipan la Bruma; `lights` luces son los impactos que se aguantan.

Material: las rondas de `voxcivitas-cabildo.json` (hablan los grupos del cabildo) y los embates de `content.items` (preguntas de vecinos), elegidos por la sutileza de la fase (`tiers`), alternando fuentes y sin repetir. Con pocos embates (Gran Reto) siguen disponibles las rondas del cabildo. Solo la intervención sólida cuenta como acierto en `onDecision`.

### Relación arena–reto

Las mismas jugadas deliberativas (escuchar, pedir evidencia, integrar, conceder frente a falacia e imposición) se entrenan en el reto con calma y se aplican en la arena bajo presión y en movimiento.

## Controles

| Juego | Controles                                                                                                                                 |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Reto  | 1 a 6 o clic para elegir; Tab/Enter para seguir; Esc o P pausa                                                                            |
| Arena | WASD o flechas; E o Enter escuchar; 1 a 3 elegir; ratón apuntar; Espacio o clic disparar; Mayús esquivar; Esc o P pausa; botones táctiles |

## Accesibilidad

- Lienzo `aria-hidden`; todo lo que decide es HTML (rueda, medidores con rol `meter`, votación); cada paso se anuncia en la región `aria-live` de `GameStage`.
- `still`: sin balanceo, sin deriva de cámara, sin flotación de marcadores y votación revelada de una vez. `calm`: más paciencia (26 s), niebla que enfría menos, ataques más lentos y mayor alcance para escuchar (`reachFor`), sin castigo por rendirse.
- Nada parpadea: los marcadores solo pulsan despacio. Versión accesible desde el menú de pausa.

## Decisiones

- **Multitud instanciada** (`scene/Crowd.tsx`): cinco mallas (cuerpos, cabezas, faroles, manos, halos) para todas las personas; el color de cada una mezcla gris y la tinta de su grupo según su calor.
- **Marco de la plaza** (`scene/Backdrop.tsx`): cabildo, campanario, casonas y árboles del kit del mundo (`KIT`) fundidos en una sola malla.
- **Sin luces de punto por farol** (rinden mal en WebGL por software): solo halos aditivos.
- Rótulos con `<Html>` de drei, montados un instante después (`useLater`) para no chocar con el doble montaje del modo estricto.
- Datos propios en `plaza.json` (validado con Zod en `plazaData.ts`): cómo se nombra a cada grupo y las frases cuando nadie responde.
- Lógica pura en `arena/plaza.ts`, `arena/voices.ts`, `cabildo/session.ts`, `scene/layout.ts`, probada con Vitest.

## Cómo probar

```bash
pnpm exec vitest run tests/unit/games/voxcivitas
pnpm dev   # con progreso sembrado (virtux:progreso) abrir /mundo/voxcivitas/voxcivitas-cabildo y /mundo/voxcivitas/voxcivitas-cierre
```

Con `?demo=1` el modo demo precarga progreso parcial. En WebGL por software (swiftshader) el juego corre a pocos cuadros por segundo: es normal.
