# ADR 0006 · Un monumento colosal en el centro de cada isla

- **Estado:** aceptada
- **Fecha:** 2026-11-11

## Contexto

Vistas desde la carta, las seis islas se parecían: el mismo escalonado hipsométrico, una cumbre
clara y construcciones pequeñas. Las construcciones contaban el lugar de cada isla (la radio, el
observatorio, el cabildo…), pero de cerca. Hacía falta que cada isla se reconociera de un vistazo y
desde cualquier punto del archipiélago.

## Decisiones

1. **Una estatua colosal por isla, en el centro de la cumbre.** Cada línea tiene su monumento: el
   cerebro que habla (ComunicArte), el libro de matemáticas (NeuroMath), la balanza
   (Voxcivitas), el timón (Gerencia+), el cohete (ActivaTuIdea) y el corazón en dos manos
   (LatidoSocial). Mide unas 4 unidades del mundo, más que el faro, y cada una tiene algo vivo
   (ondas, signos que orbitan, el astil que oscila, la rueda, la llama, el latido). Con movimiento
   reducido quedan quietas.
2. **La cumbre es su escenario.** Las cumbres se ensancharon (`RELIEF` en `geography.ts`) y se
   tiñen con el acento de la isla (`landColor` en `palette.ts`), en el 3D y en la carta 2D. El
   desafío de la isla queda a los pies del monumento, del lado del mar (`SUMMIT_LEAD`), y lo que
   antes coronaba la isla baja a la terraza de debajo.
3. **El sendero no se esconde detrás del monumento.** Su arco antes de la cumbre se limita
   (`MAX_ARC` en `layout.ts`), así las paradas quedan del lado que ve la cámara de la isla.
4. **Mira a quien llega.** La estatua da la cara al frente de la isla, donde aterriza la cámara;
   las planas (timón, corazón) se abren un poco hacia la carta para no verse de canto. La cámara de
   isla se alejó y mira más arriba para encuadrarla entera, y los rótulos se anclan sobre su cima
   (`islandCrest`).
5. **Mismo kit, mismo coste.** Las estatuas se arman con las primitivas del kit (`landmarkKit.ts`):
   lo estático se funde con el resto de la isla y cada pieza móvil es una sola malla, así una
   estatua suma una o dos llamadas de dibujo.

## Consecuencias

- Las pruebas de `landmarks.test.ts` exigen un solo monumento por isla, el suyo, en el centro de la
  cumbre y de cara al mar abierto; las de `layout.test.ts` siguen exigiendo el desafío en la cumbre.
- Una isla nueva necesita su monumento: un tipo en `STATUES`, sus piezas en el kit y su altura en
  `MONUMENT_HEIGHT` (para el rótulo).
