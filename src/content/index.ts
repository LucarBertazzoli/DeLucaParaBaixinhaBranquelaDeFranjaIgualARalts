import type { ScoreFile } from './partituras/types';
import { loadSong } from './songs';
import type { Song } from './types';

/**
 * Busca uma música do repertório (só as que já têm partitura). `saved` é a
 * partitura importada no aparelho, quando a tela já a tem em mãos.
 */
export function getSong(id: string, saved?: ScoreFile): Song | undefined {
  return saved ? loadSong(id, saved) : loadSong(id);
}

export type { Song } from './types';
