# ADR 0005 — Ejecutable de escritorio con Electron y protocolo propio

- Estado: aceptada
- Fecha: 2026-10-27

## Contexto

La prueba pide un ejecutable llamado «Virtual Experience Engineering SAS» que funcione sin internet en Windows 10/11 (CLAUDE.md §12). El stack ya fija Electron y electron-builder. La web usa rutas reales (`/mundo/comunicarte`) con React Router y guarda el progreso en `localStorage`.

## Decisión

1. **Protocolo `app://archipielago`** en lugar de `file://`. Es un esquema estándar y seguro: las rutas del enrutador funcionan sin cambiar a un enrutador con `#`, `localStorage` tiene un origen estable y las rutas desconocidas caen en `index.html`. El manejador impide salir de `dist/`, devuelve 404 a los archivos con extensión que no existen y 503 a `/api/*`.
2. **Seguridad**: `contextIsolation`, `sandbox`, sin `nodeIntegration` y CSP estricta enviada por el propio protocolo (todo desde `'self'`; estilos en línea por los atributos `style` de React). Ninguna página abre ventanas ni navega fuera de la app: los enlaces `https` van al navegador del sistema. Solo se concede el permiso de pantalla completa.
3. **Sin red**: el preload expone `window.virtux.desktop`; con él, el cliente de IA ni intenta llamar al proxy y Brújula usa su motor local («Modo sin conexión»).
4. **Paquete mínimo**: Vite ya empaqueta la web, así que el asar lleva solo `dist/`, `dist-electron/` y el icono (≈ 4 MB), sin `node_modules`.
5. **Versiones fijadas** con al menos dos semanas de publicadas: Electron 44.8.0 y electron-builder 26.17.0.
6. **Build reproducible**: `release.yml` compila en `windows-latest` (NSIS + portable) y `ubuntu-latest` (AppImage), prueba cada ejecutable con Playwright (`tests/electron/`) y adjunta los binarios al Release del tag.

## Consecuencias

- El instalador de Windows no está firmado: SmartScreen muestra un aviso la primera vez (documentado en el README).
- El build de Windows necesita Windows o Wine; en Linux se compila el AppImage y Windows queda para el flujo de release.
- La IA generativa no está disponible en el ejecutable, por diseño; la web desplegada sí puede usar el proxy.
