import { describe, expect, it } from '@jest/globals';

import { perguntaAt } from '@/engine/pergunta';
import { buildTimeline } from '@/engine/timeline';

import { coral } from './helpers/coral';

describe('pergunta na primeira música', () => {
  it('aparece quando falta pouco para acabar a primeira linha', () => {
    // Coral: 16 batidas, primeira linha de 0 a 8 → 85% de 8 = 6,8 batidas.
    const tl = buildTimeline(coral(), { hands: 'both' });
    expect(perguntaAt(tl)).toBeCloseTo(6.8 / 16);
  });

  it('música de uma linha só: perto do fim, sem passar de 95%', () => {
    const tl = buildTimeline({ ...coral(), lines: [0] }, { hands: 'both' });
    expect(perguntaAt(tl)).toBeCloseTo(0.85);
  });
});
