# ComunicArte: juegos 3D

Competencia: comunicación y **verificación de información**. Los dos juegos entrenan lo mismo: revisar la fuente, la fecha, la cita y la imagen antes de difundir.

## Reto: Sala de Redacción en 3D

`src/games/comunicarte/sala/` · registrado como `Minigame` en `src/games/comunicarte/index.ts`.

**Cómo se juega.** El escritorio de Radio Puerto de noche. Cada nota baja por el tubo neumático. Se investiga con los objetos de la mesa (lupa → fuente, calendario → fecha, archivador → cita, mesa de luz → imagen); cada pista cuesta 15 minutos del reloj de cierre, que marca la pared. Se toma un sello (Publicar, Descartar o Pedir corrección), se justifica con la señal que decide el caso y la nota vuela al «Al aire» (se enciende el letrero), a la papelera o a la bandeja de corrección. Al cerrar la edición se muestra el informe compartido (`GameReport`) con la lectura de Brújula.

**Controles.** Clic en los objetos, o teclado: `1`–`4` investigan; `A` / `D` / `C` toman el sello; con el sello en la mano `1`–`4` eligen el criterio y `X` lo suelta; `Esc` o `P` pausan. Todo tiene también botón en el panel de la nota.

**Mismo motor y mismas métricas.** Usa `src/minigames/sala-de-redaccion/engine.ts` (plan por nivel, reloj, puntaje, informe) y `recordMinigame('sala-de-redaccion', { accuracy, criteria, toolsUsed })` igual que la versión accesible. `sala/desk.ts` solo traduce teclas y repite los comentarios de Brújula sobre el proceso.

## Arena: Verificar los rumores

`src/games/comunicarte/arena/` · registrada como `arena` (verbo «Verificar los rumores»).

**Cómo se juega.** La Bruma de los rumores lanza **rumores** (orbes de papel con titular) hacia la **torre de radio** del borde norte. El explorador se acerca a uno y pulsa `E` para **interceptarlo**: el combate se vuelve lento (muy lento en ritmo tranquilo), puede revisar una o dos señales (`1`, `2`) y decide **Desmentir** (`3`) o **Dejar pasar** (`4`).

| Decisión                                                                   | Resultado                                                                      |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Desmentir un rumor falso                                                   | Carga un disparo de la linterna                                                |
| Dejar pasar una noticia verdadera                                          | Acierto; carga medio disparo                                                   |
| Desmentir una noticia verdadera                                            | Error: fortalece a la Bruma                                                    |
| Dejar pasar un rumor falso, o que un falso llegue a la torre sin detenerlo | Error: fortalece a la Bruma y la radio lo «transmite» (la torre pulsa en rojo) |

La linterna se dispara con ratón/Espacio y solo sirve contra la Bruma, que ataca todo el tiempo con el núcleo compartido (`arena/core.ts`).

**Relación con el reto.** Mismo trabajo mental (las cuatro señales) en otra dinámica: en la Sala se decide con calma bajo un reloj de turnos; en la arena se decide interceptando en movimiento, con la Bruma encima. El material propio está en `arena/rumors.json` (18 rumores, mitad verdaderos, sutileza 1–3 según la fase vía `tiers`), validado con Zod en `arena/rumors.ts`.

**Reglas puras** (`arena/rumors.ts`, con pruebas en `tests/unit/games/comunicarte/`): plan según nivel y ritmo, lanzamiento, vuelo, interceptación, evaluación de decisiones y efecto de la llegada a la torre. La elección de rumores alterna verdaderos y falsos y no repite.

**Ritmo tranquilo y movimiento reducido.** `calm`: rumores más lentos, un solo rumor a la vez, más espacio entre ellos, pausa táctica casi detenida y los ataques de la Bruma más amables (núcleo compartido). `still`: sin pulsos de la torre, sin oscilación de los orbes ni cámara que sigue.

**Metas cortas y Gran Reto.** La arena no depende de `content.items`: usa sus propios rumores, así funciona igual con `goal` de 1 a 3 y con una Bruma de otro nombre y solo 3 embates. Solo el nombre de la Bruma sale de `content`.

## Decisiones

- **Rótulos de lienzo 2D** (`Label.tsx`, `labelTexture.ts`) en vez de `<Html>` de drei: sin red, sin DOM extra y sin el error de doble montaje del modo estricto.
- El informe del reto se reimplementa (`sala/report.tsx`, `reading.ts`) porque el de la versión accesible no se exporta; las reglas de la lectura son las mismas.
- El panel de la nota es HTML real (botones, `aria-live`); el lienzo es `aria-hidden`.
- Al cerrar la tarjeta de un rumor el foco vuelve al escenario, y los botones táctiles se ocultan mientras hay tarjeta para no taparla.
- Iluminación del escritorio: dos luces de punto fijas y el resto es material emisivo.

## Cómo probar

```bash
pnpm exec vitest run tests/unit/games/comunicarte
pnpm dev   # y abrir /mundo/comunicarte/comunicarte-sala-redaccion o /comunicarte-cierre
```

Para abrir las estaciones sin recorrer el sendero, sembrar `virtux:progreso` con las estaciones previas completadas (ver `docs/juegos-3d.md`). Capturas representativas generadas con Playwright en el scratchpad de la sesión.
