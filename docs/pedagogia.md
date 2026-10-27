# Pedagogía: rutas, evaluación y DUA

## Rutas de aprendizaje

Cada isla es una ruta de una línea de VirtuXperience. Su sendero tiene un orden sugerido: cada estación se abre al completar la anterior, y la siguiente aparece marcada «Sugerida por Brújula».

| Isla         | Sendero                                                                                                                             |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| ComunicArte  | La imprenta del puerto → Taller de titulares → La cabina de radio → **Sala de Redacción** → Bitácora del editor → Edición de cierre |
| NeuroMath    | El observatorio de patrones → Escalas y proporciones → **Puentes de Fractal** → El gran puente                                      |
| Voxcivitas   | Anatomía de un argumento → Dilemas de la plaza → **Sesión de cabildo** → La voz común                                               |
| Gerencia+    | El astillero y sus recursos → Decidir con datos → **Día de mercado** → Llevar el barco a puerto                                     |
| ActivaTuIdea | Cazadores de problemas → Prototipo en una tarde → **Banco de pruebas** → Pitch del taller                                           |
| LatidoSocial | Mapa de mi territorio → Bitácora de bienestar → **La huerta comunitaria** → Raíces compartidas                                      |

En negrita, el reto (minijuego) de cada isla. La última estación es el desafío contra la Bruma, que entrega el fragmento de luz.

## Tipos de estación

| Tipo           | Propósito                               | Cómo se juega                                                                                                                                             | XP  |
| -------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| 📖 Explorar    | Presentar el concepto                   | En la plaza 3D de la isla, cada formato (texto, audio, video, infografía, interactivo) es un objeto al que se camina; el estudiante elige y puede cambiar | 30  |
| 🧩 Practicar   | Aplicar con retroalimentación inmediata | Micro-ejercicios: las respuestas son faroles en la plaza; explicación del porqué                                                                          | 40  |
| 🎮 Reto        | Usar la competencia en una situación    | Minijuego en 3D o en versión accesible, con dificultad adaptativa                                                                                         | 80  |
| 💬 Reflexionar | Metacognición                           | Pregunta abierta escrita en la bitácora de la plaza; Brújula la lee con una rúbrica                                                                       | 40  |
| 🏆 Desafío     | Demostrar la competencia bajo presión   | Combate contra la Bruma: la linterna solo se carga respondiendo bien con la competencia de la isla                                                        | 120 |

## Evaluación por criterios

Los retos registran **qué criterios aplicó** el estudiante, no solo si acertó. Cada partida guarda la precisión, la proporción de justificaciones con el criterio adecuado y las herramientas de verificación usadas (`recordMinigame`).

| Reto                  | Qué evidencia                                                                                                                    |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Sala de Redacción     | Decide qué noticias salen al aire y justifica con un criterio (fuente, fecha, cita, imagen); investigar cuesta tiempo del cierre |
| Puentes de Fractal    | Elige piezas que cumplen la proporción o la ecuación; la vagoneta comprueba si el puente resiste                                 |
| Sesión de cabildo     | Modera con intervenciones deliberativas, sin falacias ni imposiciones                                                            |
| Día de mercado        | Hace pedidos que responden a los datos y resuelve los dilemas del equipo                                                         |
| Banco de pruebas      | Mejora el prototipo con lo que se repite entre quienes tienen el problema, no con ocurrencias                                    |
| La huerta comunitaria | Reparte el trabajo según el saber de cada grupo y rota antes de que se agote                                                     |

Al cerrar cada reto hay un informe con aciertos, criterios usados y la retroalimentación de Brújula.

## Niveles

- **Explorador** (por XP): Grumete (0), Navegante (100), Cartógrafo (300), Guardián del Faro (600). El Gran Reto suma 250 XP más.
- **Competencia** (por dominio estimado, ver [ia.md](ia.md)): Inicial, Intermedio (≥ 0,4), Avanzado (≥ 0,75), uno por isla.
- **Dificultad adaptativa**: los retos y las Brumas van del nivel 1 al 5 según el dominio. La Bruma se fortalece con cada una que se vence.

## Recompensas e implicación

- **Fragmentos de luz**: uno por isla; el Faro Minuto se ilumina en la carta a medida que llegan.
- **23 insignias** en cuatro categorías: competencia (una por ruta y una por cada reto bien resuelto), exploración (primera estación, diez escalas, las seis islas), accesibilidad (probar otro formato, los cinco formatos) y constancia (tres reflexiones, tres días distintos).
- **Pasaporte**: sellos con fecha, avance hacia las insignias por sellar, nivel, fragmentos y bitácora. Se exporta como imagen o PDF.

## DUA

Los tres principios del Diseño Universal para el Aprendizaje atraviesan todo el recorrido. El detalle está en [accesibilidad.md](accesibilidad.md).

- **Representación**: varios formatos por concepto, lectura en voz alta y carta 2D equivalente.
- **Acción y expresión**: teclado, ratón o táctil; versión accesible de cada juego; ritmo tranquilo.
- **Implicación**: elección de isla y de formato, metas visibles, retroalimentación que explica y reconocimiento de la constancia.

## Contenido

Todo el contenido vive en `src/data/` como JSON validado con Zod. Una ruta nueva se añade con datos, sin tocar componentes. El contenido es original y realista; no usa datos institucionales inventados.
