import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { durationLabel, faroVideo } from '@/data/faroVideo';
import { byteRange } from '../../../electron/range';

const PUBLIC = path.resolve(__dirname, '../../../public');

const seconds = (stamp: string) => {
  const [h = 0, m = 0, s = 0] = stamp.split(':').map(Number);
  return h * 3600 + m * 60 + s;
};

describe('video del Faro Minuto', () => {
  it('sus archivos están en public/', () => {
    for (const file of [faroVideo.src, faroVideo.poster, faroVideo.captions]) {
      expect(existsSync(path.join(PUBLIC, file)), file).toBe(true);
    }
  });

  it('los subtítulos son WebVTT en orden, legibles y dentro de la duración', () => {
    const vtt = readFileSync(path.join(PUBLIC, faroVideo.captions), 'utf8');
    expect(vtt.startsWith('WEBVTT')).toBe(true);
    const cues = [...vtt.matchAll(/^([\d:.]+) --> ([\d:.]+)\n((?:.+\n?)+)/gm)];
    expect(cues.length).toBeGreaterThan(30);
    let last = 0;
    for (const [, from = '', to = '', text = ''] of cues) {
      const start = seconds(from);
      const end = seconds(to);
      expect(start).toBeGreaterThanOrEqual(last);
      expect(end).toBeGreaterThan(start);
      expect(end).toBeLessThanOrEqual(faroVideo.seconds);
      // Dos líneas de 42 caracteres como máximo.
      const lines = text.trim().split('\n');
      expect(lines.length, text).toBeLessThanOrEqual(2);
      for (const line of lines) expect(line.length, line).toBeLessThanOrEqual(42);
      last = end;
    }
  });

  it('nombra las seis líneas como las islas, en subtítulos y transcripción', () => {
    const vtt = readFileSync(path.join(PUBLIC, faroVideo.captions), 'utf8');
    const transcript = faroVideo.transcript.flatMap((s) => s.paragraphs).join(' ');
    for (const name of [
      'ComunicArte',
      'NeuroMath',
      'ActivaTuIdea',
      'Gerencia+',
      'Voxcivitas',
      'LatidoSocial',
    ]) {
      expect(vtt, name).toContain(name);
      expect(transcript, name).toContain(name);
    }
  });

  it('los subtítulos dicen lo mismo que la transcripción, sin palabras partidas', () => {
    const words = (text: string) =>
      text
        .toLowerCase()
        .split(/[^\p{L}\d+]+/u)
        .filter(Boolean);
    const cues = readFileSync(path.join(PUBLIC, faroVideo.captions), 'utf8')
      .split('\n')
      .filter((line) => line && !line.includes('-->') && !/^\d+$/.test(line))
      .slice(3)
      .join(' ');
    const known = new Set(words(faroVideo.transcript.flatMap((s) => s.paragraphs).join(' ')));
    expect(words(cues).filter((w) => !known.has(w))).toEqual([]);
  });

  it('dice su duración en palabras', () => {
    expect(durationLabel(208)).toBe('3 min 28 s');
    expect(durationLabel(120)).toBe('2 min');
  });
});

describe('rangos del ejecutable', () => {
  it('sirve el tramo pedido, el sufijo y el resto del archivo', () => {
    expect(byteRange('bytes=0-99', 1000)).toEqual({ start: 0, end: 99 });
    expect(byteRange('bytes=500-', 1000)).toEqual({ start: 500, end: 999 });
    expect(byteRange('bytes=-100', 1000)).toEqual({ start: 900, end: 999 });
    expect(byteRange('bytes=900-5000', 1000)).toEqual({ start: 900, end: 999 });
  });

  it('rechaza lo que no se puede servir', () => {
    expect(byteRange('bytes=1000-', 1000)).toBeNull();
    expect(byteRange('bytes=50-10', 1000)).toBeNull();
    expect(byteRange('bytes=-', 1000)).toBeNull();
    expect(byteRange('items=0-1', 1000)).toBeNull();
    expect(byteRange('bytes=0-1,5-9', 1000)).toBeNull();
  });
});
