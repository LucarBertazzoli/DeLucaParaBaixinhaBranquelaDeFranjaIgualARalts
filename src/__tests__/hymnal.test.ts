import { describe, expect, it } from '@jest/globals';

import { organArrangement } from '@/content/organ';
import type { ScoreFile } from '@/content/partituras/types';
import { songFromFile } from '@/content/songs';
import type { Voice } from '@/content/types';
import { buildTimeline } from '@/engine/timeline';

import { coral } from './helpers/coral';

const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const name = (m: number) => `${NAMES[m % 12]}${Math.floor(m / 12) - 1}`;

function voiceIn(song: { notes: { voice?: Voice; start: number; midi: number; duration: number }[] }, voice: Voice, from: number, to: number) {
  return song.notes
    .filter((n) => n.voice === voice && n.start >= from && n.start < to)
    .sort((a, b) => a.start - b.start)
    .map((n) => `${name(n.midi)}/${n.duration}`);
}

// Arquivo no formato gerado por scripts/importar-partituras.py.
const FILE: ScoreFile = {
  title: 'Teste',
  composer: '',
  key: -1,
  time: [3, 4],
  tempo: [100, 100],
  tempoMark: { unit: 'q', min: 100, max: 100, text: '' },
  measures: [0, 480, 1920],
  end: 3360,
  lines: [0, 1920],
  notes: [
    [72, 0, 480, 0],
    [69, 480, 960, 0],
    [65, 480, 1920, 1],
    [53, 480, 1440, 2],
    [70, 1440, 240, 0],
  ],
  rests: [[2400, 960, 0]],
};

describe('partituras importadas', () => {
  it('converte o arquivo compacto: batidas, mãos, vozes e trechos', () => {
    const s = songFromFile('in-the-end', FILE);
    // O título e o artista vêm do repertório.
    expect(s.title).toBe('In the End');
    expect(s.hymnNumber).toBe(12);
    expect(s.keySignature).toBe(-1);
    expect(s.timeSignature).toEqual([3, 4]);
    expect(s.measures).toEqual([0, 1, 4]);
    expect(s.endBeat).toBe(7);
    expect(voiceIn(s, 'soprano', 0, 7)).toEqual(['C5/1', 'A4/2', 'Bb4/0.5']);
    expect(voiceIn(s, 'alto', 0, 7)).toEqual(['F4/4']);
    expect(s.notes.find((n) => n.voice === 'tenor')!.hand).toBe('left');
    expect(s.sections?.map((x) => [x.label, x.startBeat, x.endBeat])).toEqual([
      ['1ª linha', 0, 4],
      ['2ª linha', 4, 7],
    ]);
  });
});

describe('arranjo de órgão', () => {
  it('segura as notas repetidas das vozes internas e tira o pedal do baixo', () => {
    const o = organArrangement(coral());
    expect(voiceIn(o, 'soprano', 0, 4)).toEqual(['G4/1', 'G4/1', 'F#4/1', 'E4/1']);
    expect(voiceIn(o, 'alto', 0, 4)).toEqual(['D4/3', 'C4/1']);
    // O Sol do tenor continua no compasso seguinte (só a linha interrompe).
    expect(voiceIn(o, 'tenor', 0, 4)).toEqual(['B3/2', 'A3/1', 'G3/2']);
    expect(voiceIn(o, 'bass', 0, 4)).toEqual(['G3/2', 'D3/1', 'C3/1']);
    expect(voiceIn(o, 'pedal', 0, 4)).toEqual(['G2/2', 'D2/1', 'C2/1']);
  });

  it('linhas viram trechos e a pedaleira só é ativa quando escolhida', () => {
    const h = coral();
    const tl = buildTimeline(h, { hands: 'both' });
    expect(tl.measureStarts.slice(0, 4)).toEqual([0, 4, 8, 12]);
    expect(tl.lineStarts).toEqual([0, 8]);
    const tlo = buildTimeline(organArrangement(h), { hands: 'both' });
    expect(tlo.notes.some((n) => n.voice === 'pedal' && n.active)).toBe(false);
    const tlp = buildTimeline(organArrangement(h), { hands: 'both', voices: ['pedal'] });
    expect(tlp.notes.filter((n) => n.active).every((n) => n.voice === 'pedal')).toBe(true);
  });
});
