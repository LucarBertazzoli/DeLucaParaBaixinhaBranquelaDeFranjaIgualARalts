import { loadSong } from './songs';
import type { Song } from './types';

/** Busca uma música do repertório (só as que já têm partitura importada). */
export function getSong(id: string): Song | undefined {
  return loadSong(id);
}

export type { Song } from './types';
