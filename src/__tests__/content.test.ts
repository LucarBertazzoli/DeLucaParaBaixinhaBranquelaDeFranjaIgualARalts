import { describe, expect, it } from '@jest/globals';

import { fitRange, keyboardLayout } from '@/components/keyboard-layout';
import { getSong } from '@/content';
import { scoreLoaders } from '@/content/partituras/registry';
import { REPERTORIO, REPERTORIO_LISTA, repertoireSong } from '@/content/repertorio';
import { hasScore } from '@/content/songs';

describe('repertório', () => {
  it('tem as 15 músicas em 7 grupos, com ids únicos', () => {
    expect(REPERTORIO.map((g) => [g.label, g.songs.length])).toEqual([
      ['Jogos Vorazes', 3],
      ['Loki', 1],
      ['Pedidos avulsos', 4],
      ['One Direction', 2],
      ['The Vampire Diaries', 1],
      ['Nirvana', 2],
      ['Linkin Park', 2],
    ]);
    expect(new Set(REPERTORIO_LISTA.map((s) => s.id)).size).toBe(15);
    expect(REPERTORIO_LISTA.at(-1)).toMatchObject({ number: 15, title: "What I've Done" });
  });

  it('toda partitura importada é de uma música do repertório e carrega', () => {
    for (const id of Object.keys(scoreLoaders)) {
      expect(repertoireSong(id)).toBeDefined();
      const song = getSong(id)!;
      expect(song.notes.length).toBeGreaterThan(0);
      expect(Math.max(...song.notes.map((n) => n.start + n.duration))).toBeLessThanOrEqual(song.endBeat! + 1e-6);
      expect(song.measures![0]).toBe(0);
    }
    // Sem partitura, a música fica na lista mas não abre.
    for (const s of REPERTORIO_LISTA) expect(getSong(s.id) !== undefined).toBe(hasScore(s.id));
  });
});

describe('layout do teclado', () => {
  it('ajusta a extensão cobrindo as notas, com o mínimo de teclas', () => {
    const [low, high] = fitRange(60, 67, 15);
    expect(low).toBeLessThanOrEqual(60);
    expect(high).toBeGreaterThanOrEqual(67);
    const layout = keyboardLayout(low, high, 900);
    expect(layout.keys.filter((k) => !k.black)).toHaveLength(15);
    const c = layout.byMidi.get(60)!;
    const cs = layout.byMidi.get(61)!;
    expect(cs.x).toBeGreaterThan(c.x);
    expect(cs.x).toBeLessThan(c.x + c.width);
  });
});
