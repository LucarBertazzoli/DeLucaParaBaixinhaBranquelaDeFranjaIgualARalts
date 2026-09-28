import { scoreLoaders } from './partituras/registry';
import type { ScoreFile } from './partituras/types';
import { repertoireSong } from './repertorio';
import type { NoteEvent, RestEvent, Song, Voice } from './types';

/**
 * Converte as partituras importadas (duas pautas, até duas vozes em cada)
 * em músicas do app. Cada partitura é carregada só quando é aberta.
 */

const TPQ = 480;
const VOICES: Voice[] = ['soprano', 'alto', 'tenor', 'bass'];
const cache = new Map<string, Song>();

/** A música já tem partitura importada? */
export function hasScore(id: string): boolean {
  return id in scoreLoaders;
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

export function loadSong(id: string): Song | undefined {
  const cached = cache.get(id);
  if (cached) return cached;
  const loader = scoreLoaders[id];
  if (!loader) return undefined;
  const song = songFromFile(id, loader());
  cache.set(id, song);
  return song;
}
