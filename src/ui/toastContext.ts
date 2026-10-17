import { createContext, useContext } from 'react';

export type ToastTone = 'info' | 'success' | 'progress';

export interface ToastInput {
  title: string;
  description?: string;
  tone?: ToastTone;
}

export interface ToastApi {
  notify: (toast: ToastInput) => void;
}

export const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast debe usarse dentro de <ToastProvider>.');
  return api;
}
