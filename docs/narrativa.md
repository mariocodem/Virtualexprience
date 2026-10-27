# Narrativa: el Archipiélago VirtuX

## Premisa

El estudiante llega como **Explorador o Exploradora** a un archipiélago donde el **Faro Minuto**, que guía a la comunidad, perdió su luz. Cada isla guarda un **fragmento de luz** que solo se recupera desarrollando una competencia. Al reunir los seis, el faro se enciende y se abre el **Gran Reto Integrador**.

La metáfora reemplaza la lógica de un sitio web por la de un lugar: las rutas de aprendizaje son islas, los contenidos son estaciones de un sendero, el avance es luz que vuelve al faro y el registro es una bitácora y un pasaporte con sellos.

## Personajes

- **Brújula**: la guía. Acompaña, da pistas, explica el porqué de cada respuesta y sugiere la siguiente estación. Cuando hay IA en línea habla con más matices; sin conexión usa su motor local (ver [ia.md](ia.md)).
- **Las Brumas**: cada isla tiene la suya, la niebla de un mal hábito que se opone a su competencia. Se enfrenta en el desafío de isla y solo se disipa usando bien lo aprendido.
- **La Gran Bruma**: la niebla que apagó el faro. Lleva dentro a las seis Brumas y se enfrenta en el Gran Reto.

## Las islas

Las islas llevan los nombres y lemas oficiales de las líneas de VirtuXperience.

| Isla         | Lema                                                             | Lugar                              | Competencia                               | Su Bruma                      | Fragmento                 |
| ------------ | ---------------------------------------------------------------- | ---------------------------------- | ----------------------------------------- | ----------------------------- | ------------------------- |
| ComunicArte  | Desarrolla tu pensamiento crítico y comunica con propósito.      | Ciudad-puerto con imprenta y radio | Comunicación oral y escrita, verificación | Bruma de los rumores          | Fragmento de la Palabra   |
| NeuroMath    | Estimula tu mente. Fortalece tu pensamiento lógico y matemático. | Observatorio y puentes geométricos | Pensamiento lógico-matemático             | Bruma del cálculo a ciegas    | Fragmento del Patrón      |
| Voxcivitas   | Desarrolla autonomía, proyecto de vida y ciudadanía.             | Plaza pública con cabildo          | Ciudadanía, ética y proyecto de vida      | Bruma de la indiferencia      | Fragmento de la Voz Común |
| Gerencia+    | Lidera con propósito, crece con confianza.                       | Astillero y mercado                | Gestión, toma de decisiones, liderazgo    | Bruma de la deriva            | Fragmento del Rumbo       |
| ActivaTuIdea | Convierte tu creatividad en proyectos reales.                    | Taller-laboratorio maker           | Emprendimiento e innovación               | Bruma de la idea perfecta     | Fragmento de la Idea      |
| LatidoSocial | ¡Aquí se vibra con el corazón del impacto social!                | Bosque comunitario y huerta        | Proyección social y bienestar             | Bruma del sálvese quien pueda | Fragmento de la Raíz      |

Cada Bruma se alimenta de lo contrario a su competencia. La de los rumores crece con lo que se reenvía sin verificar. La del cálculo a ciegas prefiere la corazonada al razonamiento. La de la indiferencia susurra que participar no sirve. La de la deriva empuja a decidir sin rumbo. La de la idea perfecta convence de no mostrar nada hasta que sea perfecto. La del sálvese quien pueda convence a cada quien de que está solo.

## El Gran Reto: la Noche del Faro

Con los seis fragmentos, todas las islas navegan juntas hacia el faro para encenderlo. La Gran Bruma se alimenta a la vez de rumores, cálculos a ciegas, voces que dividen, rumbos perdidos, ideas guardadas y gente sola. Toma la forma de cada isla, una tras otra, y al final muestra su corazón, que piensa con todas a la vez. Solo la disipa quien combina las seis competencias.

> «El Faro Minuto vuelve a girar. Su haz cruza el canal y, en cada isla, alguien levanta la vista: la ruta está encendida para todas.»

## Vocabulario del mundo

La interfaz no rompe la ficción con jerga web: se habla de zarpar, escalas, sendero, estaciones, fragmentos, bitácora, pasaporte, sellos y mareas. Los niveles del explorador son **Grumete**, **Navegante**, **Cartógrafo** y **Guardián del Faro**.

## Dónde vive en el código

- Islas, lemas y fragmentos: `src/data/islands.json`.
- Las Brumas y sus embates: `src/data/content/<isla>-cierre.json`.
- La Gran Bruma: `src/data/content/faro-gran-reto.json`.
- Brújula: `src/ai/brujula.ts`.
