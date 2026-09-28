import { describe, expect, it } from '@jest/globals';

import type { Song } from '@/content/types';
import { twoHands } from '@/content/notation';
import { PracticeSession, type SessionEvent } from '@/engine/practice-session';
import { buildTimeline } from '@/engine/timeline';

import { coral } from './helpers/coral';

const song: Song = {
  id: 't',
  kind: 'exercise',
  title: 'teste',
  tempo: 60, // 1 batida = 1 s
  timeSignature: [4, 4],
  keySignature: 0,
  difficulty: 1,
  instruments: ['piano'],
  notes: twoHands('C4/q D4 [E4 G4]/h', 'C3/w'),
};

function run(session: PracticeSession, seconds: number, step = 1 / 60) {
  for (let t = 0; t < seconds; t += step) session.tick(step);
}

describe('PracticeSession — modo espera', () => {
  it('para na nota e espera o aluno', () => {
    const s = new PracticeSession({ timeline: buildTimeline(song, { hands: 'right' }), mode: 'wait', leadIn: 1 });
    s.start();
    run(s, 3);
    expect(s.status).toBe('waiting');
    expect(s.time).toBeCloseTo(0);
    expect(s.expectedNotes().map((n) => n.midi)).toEqual([60]);

    s.noteOn(61); // errada
    expect(s.status).toBe('waiting');
    s.noteOn(60);
    expect(s.status).toBe('playing');

    run(s, 2);
    expect(s.expectedNotes().map((n) => n.midi)).toEqual([62]);
    s.noteOn(62);
    run(s, 2);
    // Acorde: precisa das duas notas.
    s.noteOn(64);
    expect(s.status).toBe('waiting');
    s.noteOn(67);
    expect(s.status).toBe('playing');
    run(s, 4);
    expect(s.status).toBe('finished');
    const score = s.score();
    expect(score.hits).toBe(4);
    expect(score.wrong).toBe(1);
  });

  it('com microfone (policy any) basta uma nota do acorde', () => {
    const s = new PracticeSession({
      timeline: buildTimeline(song, { hands: 'right', startBeat: 2 }),
      mode: 'wait',
      leadIn: 0.5,
      chordPolicy: 'any',
    });
    s.start();
    run(s, 1);
    s.noteOn(67);
    expect(s.status).toBe('playing');
  });

  it('toca a outra mão sozinha como acompanhamento', () => {
    const events: SessionEvent[] = [];
    const s = new PracticeSession({ timeline: buildTimeline(song, { hands: 'right' }), mode: 'wait', leadIn: 0.5 });
    s.subscribe((e) => events.push(e));
    s.start();
    run(s, 1);
    expect(events.some((e) => e.type === 'auto' && e.note.midi === 48)).toBe(true);
  });
});

describe('PracticeSession — modo ritmo', () => {
  it('pontua acertos no tempo e marca perdidas', () => {
    const s = new PracticeSession({ timeline: buildTimeline(song, { hands: 'right' }), mode: 'rhythm', leadIn: 1 });
    s.start();
    run(s, 1.02); // t ≈ 0
    s.noteOn(60); // perfeito
    run(s, 1.1); // t ≈ 1.1
    s.noteOn(62); // bom (0.1s atrasado)
    run(s, 4); // deixa o acorde passar
    expect(s.status).toBe('finished');
    const score = s.score();
    expect(score.hits).toBe(2);
    expect(score.perfect).toBe(1);
    expect(score.missed).toBe(2);
    expect(score.stars).toBe(0);
  });

  it('respeita a latência da entrada', () => {
    const s = new PracticeSession({
      timeline: buildTimeline(song, { hands: 'right' }),
      mode: 'rhythm',
      leadIn: 1,
      inputLatency: 0.15,
    });
    s.start();
    run(s, 1.15);
    s.noteOn(60);
    expect(s.score().perfect).toBe(1);
  });
});

describe('timeline', () => {
  it('aplica andamento e trecho', () => {
    const tl = buildTimeline(song, { hands: 'both', tempoFactor: 0.5, startBeat: 1, endBeat: 4 });
    expect(tl.secondsPerBeat).toBe(2);
    expect(tl.notes.map((n) => n.midi)).toEqual([62, 64, 67]);
    expect(tl.notes[0].time).toBe(0);
    expect(tl.duration).toBe(6);
  });
});

describe('exercícios de ritmo', () => {
  it('aceita qualquer tecla quando anyKey está ligado', () => {
    const s = new PracticeSession({ timeline: buildTimeline(song, { hands: 'right' }), mode: 'rhythm', leadIn: 1, anyKey: true });
    s.start();
    run(s, 1.02);
    s.noteOn(30); // tecla qualquer
    expect(s.score().hits).toBe(1);
  });
});

describe('músicas a 4 vozes', () => {
  it('marca como ativas só as vozes escolhidas', () => {
    const hymn = coral();
    const tl = buildTimeline(hymn, { hands: 'right', voices: ['soprano'] });
    const active = tl.notes.filter((n) => n.active);
    expect(active.length).toBeGreaterThan(0);
    expect(active.every((n) => n.voice === 'soprano')).toBe(true);
  });
});

describe('PracticeSession — linha do tempo (seek)', () => {
  it('pula para um ponto e espera a primeira nota dali', () => {
    const s = new PracticeSession({ timeline: buildTimeline(song, { hands: 'right' }), mode: 'wait', leadIn: 1 });
    s.seek(1.5);
    expect(s.status).toBe('ready');
    expect(s.time).toBeCloseTo(1.5);
    s.start();
    run(s, 2);
    // A próxima nota depois de 1,5 s é o acorde (E4 G4) em 2 s.
    expect(s.status).toBe('waiting');
    expect(s.expectedNotes().map((n) => n.midi).sort()).toEqual([64, 67]);
    s.noteOn(64);
    s.noteOn(67);
    run(s, 4);
    expect(s.status).toBe('finished');
    expect(s.score().total).toBe(2);
    expect(s.score().accuracy).toBe(1);
  });

  it('mantém pausado e aplica a contagem antes do ponto', () => {
    const s = new PracticeSession({ timeline: buildTimeline(song, { hands: 'right' }), mode: 'rhythm', leadIn: 1 });
    s.start();
    run(s, 0.5);
    s.pause();
    s.seek(1, 0.5);
    expect(s.status).toBe('paused');
    expect(s.time).toBeCloseTo(0.5);
    s.start();
    expect(s.status).toBe('playing');
  });

  it('seek(0) volta ao começo com a contagem inteira', () => {
    const s = new PracticeSession({ timeline: buildTimeline(song, { hands: 'right' }), mode: 'wait', leadIn: 1 });
    s.seek(2);
    s.seek(0);
    expect(s.time).toBeCloseTo(-1);
    expect(s.score().total).toBe(4);
  });
});
