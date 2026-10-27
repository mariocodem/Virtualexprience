// Preload aislado (sandbox): solo expone que la app corre como ejecutable de escritorio.
import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('virtux', { desktop: true, platform: process.platform });
