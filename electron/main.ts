import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  app,
  BrowserWindow,
  dialog,
  Menu,
  net,
  protocol,
  session,
  shell,
  type MenuItemConstructorOptions,
} from 'electron';

/**
 * Ejecutable «Virtual Experience Engineering SAS»: carga el build de Vite desde
 * el propio paquete con un protocolo seguro (`app://`), sin servidor ni red.
 */

const PRODUCT = 'Virtual Experience Engineering SAS';
const SCHEME = 'app';
const ORIGIN = `${SCHEME}://archipielago`;
const DEV_URL = 'http://localhost:5173';
const dev = process.argv.includes('--dev');
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(app.getAppPath(), 'dist');

/** Todo sale del paquete; estilos en línea por los atributos `style` de React. */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "media-src 'self' data: blob:",
  "connect-src 'self' data: blob:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ');

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.glb': 'model/gltf-binary',
  '.ktx2': 'image/ktx2',
  '.wasm': 'application/wasm',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.txt': 'text/plain; charset=utf-8',
};

protocol.registerSchemesAsPrivileged([
  { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

const isFile = (file: string) => existsSync(file) && statSync(file).isFile();

/** Resuelve una ruta del sitio a un archivo del build; las rutas de la app caen en `index.html`. */
function resolveAsset(pathname: string): string | null {
  const target = path.normalize(path.join(root, decodeURIComponent(pathname)));
  if (target !== root && !target.startsWith(root + path.sep)) return null;
  if (isFile(target)) return target;
  // Un archivo con extensión que no existe es un 404; lo demás es una ruta del enrutador.
  return path.extname(target) ? null : path.join(root, 'index.html');
}

async function serve(request: Request): Promise<Response> {
  const { pathname } = new URL(request.url);
  // Sin proxy de IA en el ejecutable: Brújula usa su motor local («Modo sin conexión»).
  if (pathname.startsWith('/api/')) return new Response(null, { status: 503 });
  const file = resolveAsset(pathname);
  if (!file) return new Response('No encontrado', { status: 404 });
  const response = await net.fetch(pathToFileURL(file).toString());
  const headers = new Headers({
    'content-type': MIME[path.extname(file)] ?? 'application/octet-stream',
    'content-security-policy': CSP,
    'x-content-type-options': 'nosniff',
  });
  return new Response(response.body, { status: response.status, headers });
}

const isInternal = (url: string) =>
  url.startsWith(`${ORIGIN}/`) || (dev && url.startsWith(DEV_URL));

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    title: PRODUCT,
    backgroundColor: '#0b2347',
    show: false,
    icon: path.join(app.getAppPath(), 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(here, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
      devTools: dev || !app.isPackaged,
    },
  });
  win.once('ready-to-show', () => {
    win.show();
  });
  void win.loadURL(dev ? DEV_URL : `${ORIGIN}/`);
  return win;
}

function buildMenu(): Menu {
  const template: MenuItemConstructorOptions[] = [
    ...(process.platform === 'darwin' ? [{ role: 'appMenu' } as const] : []),
    { label: 'Archivo', submenu: [{ role: 'quit', label: 'Salir' }] },
    {
      label: 'Ver',
      submenu: [
        { role: 'togglefullscreen', label: 'Pantalla completa', accelerator: 'F11' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Tamaño real' },
        { role: 'zoomIn', label: 'Acercar' },
        { role: 'zoomOut', label: 'Alejar' },
        ...(app.isPackaged
          ? []
          : ([
              { type: 'separator' },
              { role: 'reload', label: 'Recargar' },
              { role: 'toggleDevTools', label: 'Herramientas de desarrollo' },
            ] as const)),
      ],
    },
    {
      label: 'Ayuda',
      submenu: [
        {
          label: 'Acerca de',
          click: () => {
            void dialog.showMessageBox({
              title: 'Acerca de',
              message: PRODUCT,
              detail: [
                `Archipiélago VirtuX ${app.getVersion()}`,
                'Experiencia educativa inmersiva para el ecosistema VirtuXperience de UNIMINUTO.',
                'Funciona sin conexión a internet.',
                'Autor: Mario Mendoza Huertas.',
              ].join('\n'),
            });
          },
        },
      ],
    },
  ];
  return Menu.buildFromTemplate(template);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  // Ningún contenido abre ventanas ni navega fuera de la app; los enlaces web van al navegador.
  app.on('web-contents-created', (_event, contents) => {
    contents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith('https://')) void shell.openExternal(url);
      return { action: 'deny' };
    });
    contents.on('will-navigate', (event, url) => {
      if (isInternal(url)) return;
      event.preventDefault();
      if (url.startsWith('https://')) void shell.openExternal(url);
    });
  });

  void app.whenReady().then(() => {
    protocol.handle(SCHEME, serve);
    // Solo la pantalla completa de los juegos; ni cámara, ni micrófono, ni ubicación.
    session.defaultSession.setPermissionRequestHandler((_contents, permission, callback) => {
      callback(permission === 'fullscreen');
    });
    Menu.setApplicationMenu(buildMenu());
    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
