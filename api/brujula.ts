import { handleBrujula } from '../server/brujula.ts';

// Función de Vercel: mismo handler que el servidor local. La API key vive en las
// variables de entorno del proyecto en Vercel, nunca en el frontend.
export function GET(request: Request): Promise<Response> {
  return handleBrujula(request);
}

export function POST(request: Request): Promise<Response> {
  return handleBrujula(request);
}

export function OPTIONS(request: Request): Promise<Response> {
  return handleBrujula(request);
}
