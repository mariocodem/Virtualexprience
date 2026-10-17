import { createServer } from 'node:http';
import { handleBrujula } from './brujula.ts';

/**
 * Servidor local del proxy de IA (`pnpm server`). Vite reenvía /api a este
 * puerto en desarrollo; en producción el mismo handler corre en api/brujula.ts.
 */
const PORT = Number(process.env.PORT ?? 8787);

createServer((req, res) => {
  const chunks: Buffer[] = [];
  req.on('data', (chunk: Buffer) => chunks.push(chunk));
  req.on('end', () => {
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') headers.set(key, value);
    }
    const request = new Request(`http://localhost${req.url ?? '/'}`, {
      method: req.method,
      headers,
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : Buffer.concat(chunks),
    });
    void handleBrujula(request).then(async (response) => {
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
    });
  });
}).listen(PORT, '127.0.0.1', () => {
  console.log(`Brújula escucha en http://127.0.0.1:${String(PORT)}/api/brujula`);
});
