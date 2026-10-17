# CLAUDE.md — Archipiélago VirtuX · Prueba técnica UNIMINUTO

> Contexto maestro para Claude Code. Léelo completo antes de escribir código.
> Autor del proyecto: **Mario Mendoza Huertas** (GitHub: `mariocodem`).
> Este proyecto es una **prueba técnica de selección laboral**. La calidad visual, la solidez técnica y la documentación son tan importantes como que funcione.

---

## 1. Qué estamos construyendo

Una **experiencia educativa inmersiva** para UNIMINUTO que evoluciona el ecosistema actual de VirtuXperience (https://www.uniminuto.edu/virtuxperience-home) hacia un **mundo virtual explorable**, no un sitio web de tarjetas.

Tiene dos grandes superficies:

1. **Landing page cinematográfica** (al nivel de la de UNIMINUTO o superior) con animaciones de scroll, hero 3D y presentación de la propuesta.
2. **El Mundo**: un **mapa 3D explorable (archipiélago)** con islas/paradas, donde cada isla es una ruta de aprendizaje con estaciones, retos, un minijuego jugable, IA adaptativa y sistema de progreso.

Entregables obligatorios (ambos, no se sustituyen entre sí):

- **Repositorio Git** completo con README profesional.
- **Ejecutable** con nombre de producto **"Virtual Experience Engineering SAS"** (Windows `.exe` instalador + portable; Linux AppImage como extra).
- Complementario: **demo desplegada** (Vercel / Netlify / GitHub Pages).

---

## 2. Concepto narrativo — "Archipiélago VirtuX"

**Premisa:** El estudiante llega como *Explorador/a* a un archipiélago donde el **Faro Minuto** —que guía a la comunidad— perdió su luz. Cada isla guarda un **fragmento de luz** que solo se recupera desarrollando una competencia. Al reunir los seis fragmentos, el faro se enciende y se desbloquea el **Gran Reto Integrador**.

Guía narrativa: **"Brújula"**, un asistente con IA que acompaña, da pistas y adapta la ruta.

Las islas se llaman como las **líneas oficiales de VirtuXperience**, con su lema oficial (decisión de Mario, 2026-10-17; ids de URL entre paréntesis). La metáfora describe el lugar de cada isla.

| Isla = línea VirtuXperience | Lema oficial | Metáfora del lugar | Competencia que trabaja |
|---|---|---|---|
| **ComunicArte** (`comunicarte`) | Desarrolla tu pensamiento crítico y comunica con propósito. | Ciudad-puerto con imprenta y radio | Comunicación oral y escrita, verificación de información |
| **NeuroMath** (`neuromath`) | Estimula tu mente. Fortalece tu pensamiento lógico y matemático. | Observatorio y puentes geométricos | Pensamiento lógico-matemático |
| **Voxcivitas** (`voxcivitas`) | Desarrolla autonomía, proyecto de vida y ciudadanía. | Plaza pública con cabildo | Ciudadanía, ética y proyecto de vida |
| **Gerencia+** (`gerencia`) | Lidera con propósito, crece con confianza. | Astillero y mercado | Gestión, toma de decisiones, liderazgo |
| **ActivaTuIdea** (`activatuidea`) | Convierte tu creatividad en proyectos reales. | Taller-laboratorio maker | Emprendimiento e innovación |
| **LatidoSocial** (`latidosocial`) | ¡Aquí se vibra con el corazón del impacto social! | Bosque comunitario y huerta | Proyección social y bienestar |
| **Faro Minuto** (centro) | — | Faro en la isla central | Gran Reto Integrador: combina las seis competencias |

Coherencia: toda la UI usa vocabulario del mundo (fragmentos, bitácora, pasaporte, mareas), sin romper con jerga web ("Página 2", "Siguiente").

---

## 3. Stack tecnológico (decidido — no cambiar sin motivo)

| Capa | Tecnología | Por qué |
|---|---|---|
| Build | **Vite + React 19 + TypeScript (strict)** | Rápido, tipado, estándar de industria |
| 3D | **three.js + @react-three/fiber 9 + @react-three/drei 10** | Mapa 3D declarativo, buen rendimiento |
| Postprocesado | **@react-three/postprocessing 3** (bloom suave, vignette) | Look cinematográfico |
| Animación UI | **Framer Motion** + **GSAP (ScrollTrigger)** | Micro-interacciones + scroll storytelling |
| Scroll suave | **Lenis** | Landing fluida |
| Estado | **Zustand** con `persist` (localStorage) | Progreso del estudiante, simple y testeable |
| Rutas | **React Router** | `/`, `/mundo`, `/mundo/:isla`, `/pasaporte`, `/accesibilidad` |
| Estilos | **Tailwind CSS** + CSS variables (design tokens) | Consistencia y velocidad |
| Audio | **Howler.js** (ambiente + SFX, con mute global) | Inmersión |
| Voz | **Web Speech API** (TTS nativo) | Accesibilidad DUA |
| IA | Motor adaptativo local + **proveedor LLM opcional** vía proxy (ver §7) | Funciona offline en el ejecutable |
| Escritorio | **Electron + electron-builder** | Ejecutable Windows/Linux |
| Tests | **Vitest** + **Testing Library** + **Playwright** (e2e y capturas) | Calidad y evidencias |
| Calidad | ESLint + Prettier + Husky + lint-staged + commitlint | Repositorio profesional |
| CI/CD | **GitHub Actions** (lint, test, build web, build ejecutables, release) | Ejecutable reproducible |

Requisitos: Node **24 LTS**, pnpm 9 (o npm).

---

## 4. Estructura del proyecto

```
archipielago-virtux/
├─ CLAUDE.md
├─ README.md
├─ docs/
│  ├─ arquitectura.md          # diagramas (Mermaid) y decisiones
│  ├─ narrativa.md             # mundo, personajes, guion
│  ├─ pedagogia.md             # rutas, competencias, niveles, evaluación, DUA
│  ├─ ia.md                    # motor adaptativo, prompts, privacidad
│  ├─ accesibilidad.md         # checklist WCAG 2.2 AA + DUA
│  ├─ adr/                     # Architecture Decision Records (0001-stack.md, ...)
│  └─ evidencias/              # capturas y GIF generados con Playwright
├─ electron/
│  ├─ main.ts                  # ventana, menú, seguridad (contextIsolation)
│  └─ preload.ts
├─ public/
│  ├─ models/                  # .glb low-poly comprimidos (Draco/meshopt)
│  ├─ audio/
│  └─ fonts/                   # incluye Atkinson Hyperlegible / OpenDyslexic
├─ src/
│  ├─ app/                     # router, providers, layout
│  ├─ landing/                 # secciones de la landing
│  │  ├─ Hero3D.tsx
│  │  ├─ Manifiesto.tsx
│  │  ├─ RutasShowcase.tsx
│  │  ├─ ComoFunciona.tsx
│  │  ├─ IASection.tsx
│  │  ├─ Accesibilidad.tsx
│  │  └─ CTAFinal.tsx
│  ├─ world/                   # el mundo 3D
│  │  ├─ WorldCanvas.tsx
│  │  ├─ Ocean.tsx             # shader de agua estilizada
│  │  ├─ Island.tsx            # isla genérica parametrizable
│  │  ├─ Lighthouse.tsx        # faro central (se ilumina por fragmentos)
│  │  ├─ RoutePaths.tsx        # caminos/rutas entre paradas (líneas animadas)
│  │  ├─ StopMarker.tsx        # parada/estación: hover, foco, estado
│  │  ├─ CameraRig.tsx         # vuelo de cámara entre islas (GSAP)
│  │  └─ MapFallback2D.tsx     # mapa SVG accesible equivalente
│  ├─ islands/                 # contenido de cada isla
│  │  └─ comunicarte/
│  │     ├─ stations.ts
│  │     └─ minigames/SalaDeRedaccion/
│  ├─ minigames/               # motor común de retos
│  ├─ ai/
│  │  ├─ adaptiveEngine.ts     # motor local (sin red)
│  │  ├─ brujula.ts            # guía: pistas, retroalimentación
│  │  ├─ llmClient.ts          # cliente opcional al proxy
│  │  └─ prompts/
│  ├─ progress/                # store, insignias, niveles, XP, pasaporte
│  ├─ a11y/                    # preferencias, TTS, foco, atajos
│  ├─ data/                    # contenido JSON tipado (islas, estaciones, retos)
│  ├─ ui/                      # design system (Button, Panel, Dialog, Toast...)
│  ├─ styles/tokens.css
│  └─ types/
├─ server/                     # proxy IA opcional (Express/Hono), nunca expone la API key
├─ tests/
│  ├─ unit/
│  └─ e2e/
└─ .github/workflows/
   ├─ ci.yml
   └─ release.yml
```

Regla: **el contenido pedagógico vive en `src/data/*.json` tipado con Zod**, nunca hardcodeado en componentes. Así se demuestra que el mundo escala a nuevas rutas sin tocar código.

---

## 5. Landing page (primera impresión — debe impresionar)

Referencia: landing actual de VirtuXperience/UNIMINUTO. Meta: **más inmersiva, más fluida, igual de clara**.

### Secciones (en orden)

1. **Hero 3D**: el archipiélago flotando al amanecer, cámara orbitando lentamente; el faro parpadea apagado. Título grande con reveal por palabras: *"Aprende explorando. Enciende el Faro."* CTA principal **"Entrar al mundo"** + secundario **"Ver cómo funciona"**. Indicador de scroll animado.
2. **Manifiesto**: texto que se revela línea a línea con el scroll (GSAP ScrollTrigger + split text). Mensaje: de la página web al mundo explorable.
3. **Las seis islas (Rutas)**: sección *pinned*; al hacer scroll la cámara 3D viaja isla por isla y a la izquierda aparece una tarjeta con nombre, competencia, número de estaciones y un micro-loop animado.
4. **Cómo funciona**: 4 pasos ilustrados (Explora → Practica → Recibe retroalimentación de Brújula → Gana fragmentos/insignias), con contadores animados.
5. **IA que te acompaña**: mock animado de una conversación con Brújula adaptando dificultad.
6. **Diseñado para todos (DUA)**: tres principios (representación, acción/expresión, implicación) con iconografía y toggles en vivo (alto contraste, tamaño de texto) que afectan la propia landing.
7. **Pasaporte**: preview del pasaporte con insignias que "se sellan" al entrar en viewport.
8. **CTA final + footer** institucional.

### Lineamientos visuales

- Paleta institucional UNIMINUTO (amarillo y azul como base; **verificar los valores exactos contra el manual de marca o el sitio oficial** antes de fijarlos en `tokens.css`) + un color de acento por isla.
- Tipografía: display moderna (p. ej. *Sora* o *Plus Jakarta Sans*) + cuerpo legible (*Inter*). Opción de *Atkinson Hyperlegible*.
- Estilo 3D: **low-poly estilizado**, iluminación cálida, niebla atmosférica, sombras suaves. Nada de assets genéricos que se vean "de plantilla".
- Logo: el **logo oficial** de UNIMINUTO (suministrado por Mario) está en `src/assets/brand/uniminuto-logo.png` y se usa con `<Logo />`, sin redibujarlo, recolorearlo ni recortarlo; sobre fondos oscuros va en una placa clara. Colores medidos en el logo: amarillo `#FED300`, azul `#004B93` (confirmar contra el manual de marca).
- Micro-interacciones: botones magnéticos, cursor personalizado sutil (desactivable), transiciones de página con *fade + blur*.
- **`prefers-reduced-motion`**: desactivar parallax, orbitado de cámara y split text; mostrar estados finales.

---

## 6. El Mundo — mapa con paradas

### Navegación
- Vista **mapa general**: archipiélago completo, faro en el centro, rutas como líneas punteadas animadas sobre el agua.
- **Click / Enter sobre una isla** → la cámara vuela (GSAP, 1.2 s, ease `power3.inOut`) y aterriza en la vista de isla.
- En la isla, las **paradas (estaciones)** son marcadores 3D con estado: 🔒 bloqueada · ○ disponible · ◐ en curso · ● completada. Siguen un **sendero** con orden sugerido (la IA puede reordenar).
- **Minimapa** permanente en esquina con posición actual y progreso.
- Controles: ratón (orbitar/zoom acotados), **teclado completo** (flechas/Tab entre paradas, Enter abrir, Esc volver), táctil.
- **Modo 2D accesible** (`MapFallback2D`): mapa SVG equivalente, totalmente navegable por teclado y lector de pantalla. Se activa automáticamente si no hay WebGL o si el usuario lo elige.

### Tipos de estación (cada isla mezcla varios)
- 📖 **Explorar**: recurso breve en 5 formatos (texto, audio, video, infografía, interactivo) — el estudiante elige (DUA).
- 🧩 **Practicar**: micro-ejercicio con retroalimentación inmediata.
- 🎮 **Reto/Simulación**: minijuego.
- 💬 **Reflexionar**: pregunta abierta evaluada por Brújula.
- 🏆 **Desafío de isla**: al completarlo se obtiene el fragmento de luz.

### Alcance realista (priorizar profundidad sobre amplitud)
- **ComunicArte: 100 % jugable** — 5 estaciones + minijuego completo + desafío.
- **NeuroMath: segundo minijuego corto** (si el tiempo alcanza).
- **Resto de islas**: navegables, con estaciones de muestra y contenido real breve, marcadas "Expedición en preparación" con elegancia (no pantallas vacías).
- **Faro Minuto**: animación de encendido parcial según fragmentos + descripción del Gran Reto.

---

## 7. Minijuego principal — "Sala de Redacción" (ComunicArte)

**Situación:** la radio de la isla ComunicArte recibe noticias; algunas son falsas. El estudiante es editor/a y debe decidir qué se publica antes del cierre de edición.

**Mecánica:**
1. Llegan tarjetas de noticia (titular, fuente, fecha, cita, imagen).
2. El estudiante puede **investigar** pistas (verificar fuente, revisar fecha, buscar la cita original, revisar la imagen) — cada acción consume tiempo del reloj de cierre.
3. Decide: **Publicar / Descartar / Pedir corrección**, y justifica eligiendo el criterio.
4. Al final: reporte con aciertos, criterios usados y retroalimentación de Brújula.

**Adaptatividad:** dificultad 1–5 (sutileza de las señales de desinformación, tiempo disponible, número de noticias). El motor ajusta por rendimiento.

**Competencia evidenciada:** lectura crítica y verificación de información — evaluada por *criterios aplicados*, no solo por acierto.

### Minijuego secundario (opcional) — "Puentes de Fractal" (NeuroMath)
Completar un puente eligiendo piezas que cumplan una proporción/ecuación; la física simple muestra si el puente resiste.

---

## 8. Inteligencia Artificial

Principio: **el ejecutable debe funcionar 100 % offline**; la IA generativa es un plus, no una dependencia.

### Capa 1 — Motor adaptativo local (`adaptiveEngine.ts`, obligatorio)
- Modelo de dominio por competencia: estimación de dominio 0–1 actualizada con un **modelo tipo Elo / BKT simplificado** (documentar fórmula en `docs/ia.md`).
- Decide: siguiente estación recomendada, nivel de dificultad del reto, cuándo ofrecer pista, cuándo sugerir un formato alternativo (p. ej. si falla dos veces con texto → ofrecer audio/infografía).
- Detecta perfil de interacción (explorador, enfocado, con dificultad) a partir de eventos y lo muestra en la **ruta sugerida**.
- Totalmente testeado con Vitest (casos deterministas).

### Capa 2 — Brújula con LLM (opcional)
- Retroalimentación en lenguaje natural sobre las justificaciones y reflexiones; generación de variaciones de noticias para el minijuego.
- El cliente llama a `server/` (proxy). **La API key nunca va en el frontend ni en el ejecutable.** Variable `.env`: `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL`.
- Si no hay proxy configurado → Brújula usa respuestas plantilla de la Capa 1 y se indica en la UI ("Modo sin conexión").
- Prompts versionados en `src/ai/prompts/`, con salida en **JSON validado con Zod**.
- Privacidad: no se envían datos personales; solo texto de la respuesta y metadatos de nivel.

---

## 9. Sistema de progreso

- **XP** por estación y **niveles de explorador** (Grumete → Navegante → Cartógrafo → Guardián del Faro).
- **3 niveles por competencia**: Inicial, Intermedio, Avanzado.
- **Fragmentos de luz**: 1 por isla; el faro se ilumina progresivamente (emisión del material + bloom).
- **Insignias** (≥ 12): por competencia, por exploración ("Visitaste las 6 islas"), por accesibilidad ("Probaste otro formato"), por constancia.
- **Pasaporte del explorador** (`/pasaporte`): sellos animados, estadísticas, ruta recorrida; **exportable a PDF/imagen**.
- **Bitácora**: historial de actividades.
- Persistencia en localStorage (Zustand `persist`), con botón "Reiniciar progreso" y **modo demo** (`?demo=1`) que precarga progreso parcial para que el evaluador vea todo rápido.

---

## 10. Accesibilidad y DUA (criterio evaluado — no es opcional)

Objetivo **WCAG 2.2 AA**. Panel de accesibilidad siempre a un clic (icono fijo + atajo `Alt+A`):

- Tamaño de texto (4 pasos), **alto contraste**, fuente para dislexia, espaciado de líneas.
- **Reducir movimiento** (respeta también `prefers-reduced-motion`).
- **Lectura en voz alta** (TTS) de cualquier panel; subtítulos para todo audio/video.
- Modo **2D sin WebGL** con paridad funcional.
- Navegación completa por teclado, foco visible, orden lógico, *skip links*.
- ARIA correcto en diálogos, live regions para retroalimentación de retos.
- Contenido en múltiples formatos por estación (principio de **representación**).
- Varias formas de responder en retos: clic, teclado, arrastrar con alternativa (principio de **acción y expresión**).
- Elección de ruta, metas visibles y recompensas (principio de **implicación**).
- Verificar con **axe-core** en Playwright (0 violaciones serias) y documentar en `docs/accesibilidad.md`.

---

## 11. Rendimiento

- Lighthouse (web): **Performance ≥ 85, Accesibilidad ≥ 95, Best Practices ≥ 95**.
- 60 fps en laptop media; `dpr` adaptativo (`<AdaptiveDpr />`, `<PerformanceMonitor />`).
- Modelos `.glb` < 2 MB total, comprimidos; texturas KTX2 si aplica; *instancing* para árboles/rocas.
- Lazy-load del mundo 3D (la landing no debe esperar al mundo completo); pantalla de carga temática ("Izando velas… 64 %").
- Code splitting por ruta.

---

## 12. Ejecutable "Virtual Experience Engineering SAS"

- Electron con `contextIsolation: true`, `nodeIntegration: false`, CSP estricta.
- `electron-builder`:
  - `productName`: **"Virtual Experience Engineering SAS"**
  - `appId`: `co.virtualexperience.archipielago`
  - Windows: **NSIS** (instalador) + **portable** `.exe`
  - Linux: **AppImage**
  - Icono propio (no el logo institucional).
- Carga el build de Vite desde archivos locales (sin servidor, sin internet).
- Pantalla completa con `F11`, menú mínimo.
- **GitHub Actions `release.yml`**: al crear un tag `v*` compila en `windows-latest` y `ubuntu-latest` y adjunta los binarios al Release. Así el ejecutable es reproducible y verificable.
- Documentar en README: requisitos (Windows 10/11 x64, 4 GB RAM, GPU con WebGL 2), aviso de SmartScreen por app no firmada y cómo continuar.

---

## 13. Comandos

```bash
pnpm install
pnpm dev              # web en http://localhost:5173
pnpm build            # build web de producción
pnpm preview
pnpm test             # Vitest
pnpm test:e2e         # Playwright (incluye axe)
pnpm evidencias       # Playwright genera capturas/GIF en docs/evidencias
pnpm lint && pnpm typecheck
pnpm electron:dev     # app de escritorio en desarrollo
pnpm dist:win         # ejecutable Windows
pnpm dist:linux       # AppImage
pnpm server           # proxy IA opcional
```

---

## 14. Convenciones de código

- TypeScript `strict`, sin `any`. Tipos de dominio en `src/types/`.
- Componentes funcionales, nombres en PascalCase; hooks `useX`.
- **Código en inglés, contenido y UI en español** (público colombiano). Comentarios breves, solo donde aporten.
- Sin lógica de negocio en componentes 3D: los componentes leen del store y emiten eventos.
- Commits: **Conventional Commits** en español (`feat(mundo): vuelo de cámara entre islas`). Commits pequeños y frecuentes: el historial también se evalúa.
- Ramas: `main` estable; trabajo en `feat/*` si conviene.
- Nada de secretos en el repo; `.env.example` documentado.

---

## 15. README.md — contenido obligatorio

El README es la carta de presentación. Debe incluir, en este orden:

1. Banner/GIF del mundo + badges (CI, licencia, versión).
2. **Resumen en 3 líneas** y enlaces: demo desplegada · descargar ejecutable (Releases) · video demo (si existe).
3. **Inicio rápido para evaluadores** (≤ 5 pasos, incluye `?demo=1`).
4. Concepto y narrativa.
5. Cómo responde a cada uno de los 8 requerimientos (tabla requerimiento → dónde está implementado).
6. Funcionalidades desarrolladas (con capturas).
7. Arquitectura (diagrama Mermaid) y decisiones (enlace a ADRs).
8. Tecnologías y por qué.
9. Requisitos técnicos, instalación y ejecución (web y ejecutable, Windows y Linux).
10. IA: cómo funciona, modo offline, cómo activar el LLM.
11. Accesibilidad y DUA.
12. Pruebas y calidad (resultados de Lighthouse y axe).
13. Evidencias (`docs/evidencias/`).
14. Limitaciones conocidas y hoja de ruta (honesto y propositivo).
15. Autor y contacto.

---

## 16. Plan de trabajo por fases

Trabaja **fase por fase**; al terminar cada una: tests en verde, commit, y breve resumen a Mario.

1. **Fundaciones**: scaffold Vite + TS + Tailwind + ESLint/Prettier/Husky, tokens de diseño, router, design system base, CI.
2. **Datos y dominio**: esquemas Zod, JSON de islas/estaciones/insignias, store de progreso + tests.
3. **Landing**: secciones con animaciones, hero 3D, responsive, reduced-motion.
4. **Mundo 3D**: océano, islas, faro, rutas, marcadores, cámara, minimapa, modo 2D.
5. **ComunicArte completa**: estaciones + "Sala de Redacción".
6. **IA**: motor adaptativo local + Brújula + proxy opcional.
7. **Progreso**: XP, niveles, insignias, fragmentos, faro, pasaporte exportable, modo demo.
8. **Accesibilidad**: panel, TTS, teclado, auditoría axe.
9. **Pulido**: audio, transiciones, pantalla de carga, rendimiento, Lighthouse.
10. **Empaquetado**: Electron, electron-builder, workflow de release.
11. **Documentación y evidencias**: README, docs/, capturas con Playwright, deploy web.

---

## 17. Definición de "terminado"

- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e` en verde.
- [ ] La landing se ve impecable en 1920px, 1366px, tablet y móvil.
- [ ] Se puede ir del landing al mundo, volar a ComunicArte, completar el minijuego y ver el pasaporte actualizado, **solo con teclado**.
- [ ] El ejecutable instala y abre sin internet en Windows 10/11.
- [ ] Modo demo funciona.
- [ ] README cubre todos los puntos del §15 y cada requerimiento tiene evidencia.
- [ ] Sin errores en consola, sin `TODO` visibles en la UI.

---

## 18. Mapa requerimiento → implementación (mantener actualizado)

| Requerimiento de la prueba | Implementación |
|---|---|
| 1. Mundo inmersivo | Archipiélago 3D explorable (`src/world/`) + modo 2D |
| 2. Arquitectura narrativa | Faro Minuto, fragmentos de luz, Brújula (`docs/narrativa.md`) |
| 3. Rutas de aprendizaje | 6 islas = 6 líneas, senderos de estaciones con orden sugerido |
| 4. Interacción | Vuelo de cámara, paradas 3D, formatos múltiples, minimapa |
| 5. Reto/simulación | "Sala de Redacción" (+ "Puentes de Fractal") |
| 6. IA | Motor adaptativo local + Brújula LLM opcional |
| 7. Progreso | XP, niveles, insignias, fragmentos, pasaporte |
| 8. Accesibilidad/DUA | Panel a11y, TTS, teclado, alto contraste, 2D, WCAG 2.2 AA |

---

## 19. Notas para Claude Code

- Si una decisión no está aquí, elige la opción **más profesional y mantenible** y regístrala como ADR en `docs/adr/`.
- No uses marcas, personajes o assets con derechos de terceros. Modelos 3D: generarlos con primitivas de three.js o usar assets CC0 (Kenney, Poly Pizza CC0) y **acreditarlos en el README**.
- No inventes datos institucionales de UNIMINUTO (cifras, nombres de personas). El contenido pedagógico puede ser original y realista.
- Prioriza que **lo que existe funcione perfecto** antes de añadir islas nuevas.
- Pregunta a Mario antes de: cambiar el stack, agregar dependencias pesadas (> 200 KB gz) o tocar la narrativa.
