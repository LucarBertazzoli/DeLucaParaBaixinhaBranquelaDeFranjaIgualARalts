import { fourVoices } from '@/content/notation';
import type { Song } from '@/content/types';

/**
 * Coral curto a 4 vozes (escrito para os testes), no formato das partituras
 * importadas: 4 compassos em 4/4, duas linhas.
 */
export function coral(): Song {
  const { notes, rests } = fourVoices({
    soprano: 'G4/q G4 F#4 E4 | D4 G4 A4 B4 | B4 B4 A4 G4 | C5 B4 A4/h',
    alto: 'D4/q D4 D4 C4 | B3 D4 D4 D4 | D4 D4 D4 D4 | E4 D4 D4/h',
    tenor: 'B3/q B3 A3 G3 | G3 B3 C4 D4 | D4 G3 A3 B3 | G3 G3 F#3/h',
    bass: 'G3/q G3 D3 C3 | D3 E3 F#3 G3 | G3 E3 D3 E3 | C3 D3 D3/h',
  });
  return {
    id: 'coral',
    kind: 'hymn',
    title: 'Coral',
    tempo: 72,
    timeSignature: [4, 4],
    keySignature: 1,
    difficulty: 3,
    instruments: ['piano', 'organ'],
    notes,
    rests,
    measures: [0, 4, 8, 12],
    lines: [0, 8],
    endBeat: 16,
    sections: [
      { id: 'linha-1', label: '1ª linha', startBeat: 0, endBeat: 8 },
      { id: 'linha-2', label: '2ª linha', startBeat: 8, endBeat: 16 },
    ],
  };
}
