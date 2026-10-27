# ActivaTuIdea · juegos 3D

Competencia: emprendimiento e innovación (validar con quienes tienen el problema, separar patrones de casos aislados y de ocurrencias, iterar con poco). Código en `src/games/activatuidea/`.

## Reto 3D · Banco de pruebas

El taller maker: un banco con plato giratorio donde gira el prototipo (bolso impermeable de lona de vela), quienes lo prueban en arco detrás, tres canastas, un estante de mejoras y una bandeja de materiales.

1. **Escuchar**: cada persona da un paso al frente y su comentario aparece en una burbuja. Se manda a una canasta («Se repite», «Caso aislado», «Fuera del problema»): teclas 1 a 3, o clic; ↑ ↓ cambian de comentario.
2. **Estante**: se revisan las notas y se eligen hasta dos mejoras (teclas 1 a 4). La bandeja marca los materiales que se gastarían y las piezas elegidas se ven translúcidas sobre el bolso.
3. **Prueba de agua**: caen gotas sobre el bolso y cada persona muestra su variación de satisfacción; la lona se oscurece.
4. **Informe**: el `GameReport` compartido.

Usa el mismo motor (`src/minigames/banco-de-pruebas/engine.ts`), las mismas métricas y los mismos avisos (`onBrujula`, `recordMinigame`, `onComplete`, `onFail`) que la versión accesible.

## Arena 3D · Prototipar el cañón de luz

Recolección y fabricación. Los comentarios de la prueba del cañón flotan por el taller como burbujas (una ronda entera a la vez, para poder comparar quién dice qué; la lista «Comentarios en el aire» del HUD las resume).

- **E** recoge la burbuja cercana; cargarla frena al explorador.
- **Banco de trabajo** (izquierda): lo que **se repite** mejora el cañón (cada dos patrones sube un nivel visible) y carga la linterna (`chargeArena`). Un caso aislado o una ocurrencia lo **atasca**: pierde un disparo cargado y fortalece a la Bruma (`strengthenBruma`).
- **Papelera** (derecha): descartar lo que no es evidencia es correcto, pero no carga. Tirar un patrón pierde evidencia y fortalece a la Bruma.
- Con **ritmo tranquilo** las burbujas son menos, más lentas y más fáciles de alcanzar, la carga frena menos y 1 / 2 mandan la burbuja al banco o a la papelera sin caminar.
- Disparo: Espacio o clic; Mayús esquiva. Cada decisión de entrega llama a `onDecision` con la sutileza de la ronda.

Material propio: `data/canon.json` (7 rondas de comentarios clasificados, sutileza 1 a 3) validado con Zod en `canon/model.ts`. La ronda sale según la sutileza de la fase (`tiers`), así que funciona con cualquier `goal` (1 a 3 en el Gran Reto) y con una Bruma de otro nombre: los embates de `content.items` no se usan, solo sus frases.

## Relación arena–reto

Ambos entrenan lo mismo: leer a quienes tienen el problema. En el reto se clasifica y se construye; en la arena se recoge lo que sirve y se fabrica el cañón.

## Decisiones

- Rótulos como sprites de lienzo (`labels.tsx`): sin red y sin `<Html>` (da error en el doble montaje del modo estricto).
- Lógica pura: `banco/session.ts`, `banco/parts3d.ts`, `canon/collect.ts`, `canon/model.ts`. Pruebas en `tests/unit/games/activatuidea/`.
- El panel del reto va abajo y una franja arriba, para dejar libre el banco en lienzos estrechos.
- Frenar al cargar se aplica sobre la posición tras `stepArena` (`applyBurden`), sin tocar el núcleo compartido ni la esquiva.
- Sin cambios en archivos compartidos.

## Cómo probar

`pnpm exec vite --port 5205`, y sembrar progreso (`virtux:progreso`) con `activatuidea-problemas` y `activatuidea-prototipo` completadas para abrir `/mundo/activatuidea/activatuidea-taller`; completar también `activatuidea-taller` para `/mundo/activatuidea/activatuidea-cierre`. `pnpm exec vitest run tests/unit/games/activatuidea`.
