import { usePartituras } from '@/store/partituras';

import { scoreLoaders } from './partituras/registry';
import type { ScoreFile } from './partituras/types';
import { repertoireSong } from './repertorio';
import type { NoteEvent, RestEvent, Song, Voice } from './types';

/**
 * Converte as partituras importadas (duas pautas, até duas vozes em cada)
 * em músicas do app. Vêm do próprio código (importador de linha de comando)
 * ou foram importadas no aparelho; a do aparelho tem preferência.
 */

const TPQ = 480;
const VOICES: Voice[] = ['soprano', 'alto', 'tenor', 'bass'];
const cache = new Map<string, { file: ScoreFile; song: Song }>();

function scoreFor(id: string): ScoreFile | undefined {
  const local = usePartituras.getState().scores[id];
  if (local) return local;
  return scoreLoaders[id]?.();
}

/**
 * A música já tem partitura (no código ou importada no aparelho)? Telas
 * passam `saved` (lido do store com o hook) para re-renderizar quando muda.
 */
export function hasScore(id: string, saved = usePartituras.getState().scores): boolean {
  return id in saved || id in scoreLoaders;
}

/** Converte o arquivo compacto em uma `Song` do app. */
export function songFromFile(id: string, f: ScoreFile): Song {
  const beats = (ticks: number) => ticks / TPQ;
  const notes: NoteEvent[] = f.notes.map(([midi, start, dur, v], i) => ({
    id: `${VOICES[v][0]}${i}`,
    midi,
    start: beats(start),
    duration: beats(dur),
    hand: v < 2 ? 'right' : 'left',
    voice: VOICES[v],
  }));
  const rests: RestEvent[] = f.rests.map(([start, dur, staff]) => ({
    start: beats(start),
    duration: beats(dur),
    hand: staff === 0 ? 'right' : 'left',
  }));
  const lines = f.lines.map(beats);
  const endBeat = beats(f.end);
  const info = repertoireSong(id);
  return {
    id,
    kind: 'hymn',
    hymnNumber: info?.number,
    title: info?.title ?? f.title,
    subtitle: info?.artist ?? (f.composer || undefined),
    composer: f.composer || undefined,
    tempo: f.tempo[0],
    tempoMark: f.tempoMark,
    timeSignature: f.time,
    keySignature: f.key,
    difficulty: 3,
    instruments: ['piano', 'organ'],
    notes,
    rests,
    measures: f.measures.map(beats),
    lines,
    endBeat,
    sections: lines.map((start, i) => ({
      id: `linha-${i + 1}`,
      label: `${i + 1}ª linha`,
      startBeat: start,
      endBeat: lines[i + 1] ?? endBeat,
    })),
    credits: 'Partitura importada para uso pessoal.',
  };
}

export function loadSong(id: string, file = scoreFor(id)): Song | undefined {
  if (!file) return undefined;
  const cached = cache.get(id);
  if (cached && cached.file === file) return cached.song;
  const song = songFromFile(id, file);
  cache.set(id, { file, song });
  return song;
}
