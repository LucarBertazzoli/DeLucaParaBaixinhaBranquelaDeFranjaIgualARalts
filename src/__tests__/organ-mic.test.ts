import { describe, expect, it } from '@jest/globals';

import { organArrangement } from '@/content/organ';
import type { Voice } from '@/content/types';
import { PracticeSession, type PracticeMode } from '@/engine/practice-session';
import type { TimedNote } from '@/engine/timeline';
import { buildTimeline } from '@/engine/timeline';
import { PitchProcessor } from '@/input/pitch/pitch-processor';
import type { NoteInputEvent } from '@/input/types';

import { coral } from './helpers/coral';
import { OrganRoom, SR, type RoomOptions, type StopName } from './helpers/organ-room';

/**
 * Reconhecimento pelo microfone num órgão de igreja (simulado): acordes a
 * 4 vozes, pedaleira de 16', registros, reverberação, ruído e zumbido.
 */

const BLOCK = 1024;
const ALL: Voice[] = ['soprano', 'alto', 'tenor', 'bass', 'pedal'];

function listen(
  notes: { midi: number; stop?: StopName; octave?: number }[],
  guide: number[],
  room: RoomOptions = {},
  opts: { pedal?: number[]; context?: number[] } = {},
) {
  const r = new OrganRoom(room);
  const events: NoteInputEvent[] = [];
  const p = new PitchProcessor(SR, (e) => events.push(e));
  p.setGuide(
    guide.map((m, i) => ({ id: `n${i}`, midi: m, pedal: opts.pedal?.includes(m) })),
    opts.context ?? guide,
  );
  p.push(r.render(SR * 0.3));
  for (const n of notes) r.strike(n.midi, n.stop ?? 'principal', n.octave ?? 0);
  for (let i = 0; i < 20; i++) p.push(r.render(SR * 0.05));
  return events.filter((e) => e.type === 'on').map((e) => e.midi).sort((a, b) => a - b);
}

describe('microfone no órgão: acordes', () => {
  const C = [60, 64, 67, 72];
  it.each<[string, StopName]>([
    ['principal 8', 'principal'],
    ['flauta 8', 'flauta'],
    ['cheio 8-4-2', 'cheio'],
  ])('reconhece as 4 vozes (%s)', (_, stop) => {
    expect(listen(C.map((midi) => ({ midi, stop })), C)).toEqual(C);
  });

  it('reconhece as 4 vozes + pedaleira de 16′ (soa uma oitava abaixo)', () => {
    const notes = [...[64, 67, 72, 76].map((midi) => ({ midi })), { midi: 36, stop: 'flauta' as const, octave: -1 }];
    expect(listen(notes, [36, 64, 67, 72, 76], {}, { pedal: [36] })).toEqual([36, 64, 67, 72, 76]);
  });

  it('não aceita nota meio tom errada (Mi♭ no lugar de Mi)', () => {
    expect(listen([60, 63, 67, 72].map((midi) => ({ midi })), C)).toEqual([60, 67, 72]);
  });

  it('não inventa nota que ninguém tocou', () => {
    expect(listen(C.map((midi) => ({ midi, stop: 'cheio' as const })), [62, 65, 74])).toEqual([]);
  });

  it('piano: nota uma oitava abaixo não vale pela esperada', () => {
    expect(listen([{ midi: 48, stop: 'piano' }], [60])).toEqual([]);
    expect(listen([{ midi: 55, stop: 'piano' }], [67])).toEqual([]);
  });

  it('piano: nota uma oitava acima não vale pela esperada', () => {
    expect(listen([{ midi: 72, stop: 'piano' }], [60])).toEqual([]);
  });

  it('piano: a nota certa vale, mesmo com a oitava de baixo pedida no hino', () => {
    expect(listen([{ midi: 60, stop: 'piano' }], [60])).toEqual([60]);
    expect(listen([48, 60].map((midi) => ({ midi, stop: 'piano' as const })), [48, 60])).toEqual([48, 60]);
  });

  it('manual do órgão: oitava abaixo também não vale (só a pedaleira aceita o 16′)', () => {
    expect(listen([{ midi: 52 }], [64])).toEqual([]);
  });

  it('silêncio da igreja (ruído + zumbido) não vira nota', () => {
    expect(listen([], C)).toEqual([]);
  });

  it('órgão um pouco desafinado (+15 cents) ainda vale', () => {
    expect(listen(C.map((midi) => ({ midi })), C, { detuneCents: 15 })).toEqual(C);
  });

  it('igreja com muita reverberação', () => {
    expect(listen(C.map((midi) => ({ midi })), C, { reverb: 0.6, rt60: 3 })).toEqual(C);
  });
});

// ------------------------------------------------------------------ coral inteiro

function hymn(mode: PracticeMode, policy: 'all' | 'any') {
  const song = organArrangement(coral());
  const timeline = buildTimeline(song, { hands: 'both', voices: ALL });
  const session = new PracticeSession({ timeline, mode, leadIn: 1, chordPolicy: policy, inputLatency: 0.12 });
  const processor = new PitchProcessor(SR, (e) => {
    if (e.type === 'on') session.noteOn(e.midi);
  });
  return { song, timeline, session, processor };
}

/** Notas que devem estar soando agora (como o app manda ao microfone). */
function contextOf(session: PracticeSession): number[] {
  const t = session.time;
  return [...new Set(session.timeline.notes.filter((n) => n.time <= t + 0.1 && t < n.time + n.duration + 0.3).map((n) => n.midi))];
}

function stopFor(n: TimedNote): [StopName, number] {
  return n.voice === 'pedal' ? ['flauta', -1] : ['principal', 0];
}

/**
 * Organista virtual no modo espera: quando o app para num acorde, ele solta
 * as notas que acabaram, espera um pouco (reação) e toca as novas.
 * `mistake` troca uma nota por outra (erro de propósito).
 */
function playWaitMode(policy: 'all' | 'any', mistake?: (n: TimedNote) => number, maxSeconds?: number, room: RoomOptions = {}) {
  const { timeline, session, processor } = hymn('wait', policy);
  const r = new OrganRoom(room);
  const sounding = new Map<string, { voice: ReturnType<OrganRoom['strike']>; end: number }>();
  let pendingGroup = '';
  let strikeAt = -1;
  let seconds = 0;
  session.start();
  const limit = maxSeconds ?? timeline.duration * 4 + 10;
  while (session.status !== 'finished' && seconds < limit) {
    const expected = session.status === 'waiting' ? session.expectedNotes() : [];
    const key = expected.map((n) => n.id).join(',');
    if (key && key !== pendingGroup) {
      pendingGroup = key;
      const t = expected[0].time;
      // Solta o que já acabou (com uma pequena respiração).
      for (const [id, s] of sounding) {
        if (s.end <= t + 0.01) {
          r.release(s.voice);
          sounding.delete(id);
        }
      }
      strikeAt = seconds + 0.12;
    }
    if (strikeAt >= 0 && seconds >= strikeAt) {
      strikeAt = -1;
      for (const n of session.expectedNotes()) {
        const [stop, octave] = stopFor(n);
        sounding.set(n.id, { voice: r.strike(mistake ? mistake(n) : n.midi, stop, octave), end: n.time + n.duration });
      }
    }
    processor.setGuide(session.listenFor().map((n) => ({ id: n.id, midi: n.midi, restrike: session.isRepeat(n), pedal: n.voice === 'pedal' })), contextOf(session));
    processor.push(r.render(BLOCK));
    session.tick(BLOCK / SR);
    seconds += BLOCK / SR;
  }
  return { session, seconds, timeline, processor };
}

describe('microfone no órgão: cada nota do acorde conta', () => {
  it('modo espera: tocando só a melodia, só ela é marcada e o app espera as outras vozes', () => {
    const { session, processor } = hymn('wait', 'all');
    const r = new OrganRoom();
    session.start();
    let struck = false;
    for (let t = 0; t < 6; t += BLOCK / SR) {
      if (!struck && session.status === 'waiting') {
        struck = true;
        const soprano = session.expectedNotes().find((n) => n.voice === 'soprano')!;
        r.strike(soprano.midi);
      }
      processor.setGuide(session.listenFor().map((n) => ({ id: n.id, midi: n.midi, restrike: session.isRepeat(n), pedal: n.voice === 'pedal' })), contextOf(session));
      processor.push(r.render(BLOCK));
      session.tick(BLOCK / SR);
    }
    const pending = session.expectedNotes();
    expect(session.status).toBe('waiting');
    expect(session.score().hits).toBe(1);
    expect(pending.map((n) => n.voice).sort()).toEqual(['alto', 'bass', 'pedal', 'tenor']);
  });
});

// Simulam o coral inteiro (demoram minutos): rode com ORGAN_FULL=1 npm test.
(process.env.ORGAN_FULL ? describe : describe.skip)('microfone no órgão: coral inteiro', () => {
  it('modo espera: o organista toca as 4 vozes + pedal e o coral vai até o fim', () => {
    const { session, seconds, timeline } = playWaitMode('all');
    expect(session.status).toBe('finished');
    const score = session.score();
    expect(score.hits).toBe(score.total);
    // Reage em cada acorde, mas sem travar: bem menos que o dobro da duração.
    expect(seconds).toBeLessThan(timeline.duration * 2 + 5);
  });

  it('modo espera: se o soprano erra meio tom, o app não avança', () => {
    const { session } = playWaitMode('all', (n) => (n.voice === 'soprano' ? n.midi + 1 : n.midi), 10);
    // Parado no primeiro acorde: as outras vozes foram marcadas, o soprano não.
    expect(session.status).toBe('waiting');
    expect(session.expectedNotes().map((n) => n.voice)).toEqual(['soprano']);
  });

  it('modo ritmo: tocando no tempo, quase todas as notas contam', () => {
    const { timeline, session } = hymn('rhythm', 'all');
    const processor = new PitchProcessor(SR, (e) => {
      if (e.type === 'on') session.noteOn(e.midi);
    });
    const r = new OrganRoom();
    const events: { at: number; on: boolean; n: TimedNote }[] = [];
    for (const n of timeline.notes) {
      events.push({ at: n.time + 1, on: true, n }, { at: n.time + n.duration + 1 - 0.04, on: false, n });
    }
    events.sort((a, b) => a.at - b.at || Number(a.on) - Number(b.on));
    const voices = new Map<string, ReturnType<OrganRoom['strike']>>();
    let k = 0;
    session.start();
    for (let t = 0; session.status !== 'finished' && t < timeline.duration + 5; t += BLOCK / SR) {
      while (k < events.length && events[k].at <= t) {
        const e = events[k++];
        if (e.on) {
          const [stop, octave] = stopFor(e.n);
          voices.set(e.n.id, r.strike(e.n.midi, stop, octave));
        } else {
          const v = voices.get(e.n.id);
          if (v) r.release(v);
        }
      }
      processor.setGuide(session.listenFor().map((n) => ({ id: n.id, midi: n.midi, restrike: session.isRepeat(n), pedal: n.voice === 'pedal' })), contextOf(session));
      processor.push(r.render(BLOCK));
      session.tick(BLOCK / SR);
    }
    const score = session.score();
    expect(score.hits / score.total).toBeGreaterThan(0.9);
  });
});
