import type { ScoreFile } from './partituras/types';
import { child, findDeep, parseXml, textOf, type XmlNode } from './xml';

/**
 * Converte MusicXML (score-partwise) no formato compacto das partituras.
 * Mesma lógica de scripts/importar-partituras.py, para importar direto no
 * aparelho: piano (uma parte, duas pautas) ou a primeira e a última parte
 * como mãos direita e esquerda; duas vozes por pauta separadas pela altura;
 * ritornelos tocados de ponta a ponta.
 */

const TPQ = 480;
const STEPS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

interface RawNote {
  pitch: number;
  start: number;
  dur: number;
  staff: number;
}

interface MeasureInfo {
  start: number;
  len: number;
  notes: RawNote[];
  lineBreak: boolean;
  key: number | null;
  time: [number, number] | null;
  tempo: { unit: string; dotted: boolean; min: number; max: number } | null;
}

const num = (s: string | undefined, fallback: number) => {
  const n = Number(s);
  return s !== undefined && Number.isFinite(n) ? n : fallback;
};

function parsePart(part: XmlNode): MeasureInfo[] {
  const measures: MeasureInfo[] = [];
  let divisions = 1;
  let timeSig: [number, number] = [4, 4];
  const ties = new Map<string, RawNote>();
  let tick = 0;
  for (const m of part.children.filter((c) => c.tag === 'measure')) {
    const info: MeasureInfo = { start: tick, len: 0, notes: [], lineBreak: false, key: null, time: null, tempo: null };
    const pr = child(m, 'print');
    if (pr && (pr.attrs['new-system'] === 'yes' || pr.attrs['new-page'] === 'yes')) info.lineBreak = true;
    // Posições em semínimas (frações exatas o bastante para quiálteras usuais).
    let cur = 0;
    let extent = 0;
    let lastStart = 0;
    for (const el of m.children) {
      if (el.tag === 'attributes') {
        divisions = num(textOf(el, 'divisions'), divisions);
        const fifths = textOf(el, 'key/fifths');
        if (fifths !== undefined) info.key = Number(fifths);
        const beats = textOf(el, 'time/beats');
        const type = textOf(el, 'time/beat-type');
        if (beats && type) {
          timeSig = [(beats.match(/\d+/g) ?? ['4']).reduce((a, b) => a + Number(b), 0), Number(type)];
          info.time = timeSig;
        }
      } else if (el.tag === 'direction') {
        const metro = findDeep(el, 'metronome');
        const perMinute = metro ? textOf(metro, 'per-minute') : undefined;
        if (!info.tempo && metro && perMinute) {
          const found = (perMinute.match(/\d+/g) ?? []).map(Number);
          if (found.length) {
            info.tempo = {
              unit: textOf(metro, 'beat-unit') ?? 'quarter',
              dotted: !!child(metro, 'beat-unit-dot'),
              min: found[0],
              max: found[found.length - 1],
            };
          }
        }
        const sound = child(el, 'sound');
        if (!info.tempo && sound?.attrs.tempo) {
          const bpm = Math.round(Number(sound.attrs.tempo));
          info.tempo = { unit: 'quarter', dotted: false, min: bpm, max: bpm };
        }
      } else if (el.tag === 'sound' && el.attrs.tempo && !info.tempo) {
        const bpm = Math.round(Number(el.attrs.tempo));
        info.tempo = { unit: 'quarter', dotted: false, min: bpm, max: bpm };
      } else if (el.tag === 'backup') {
        cur -= num(textOf(el, 'duration'), 0) / divisions;
      } else if (el.tag === 'forward') {
        cur += num(textOf(el, 'duration'), 0) / divisions;
        extent = Math.max(extent, cur);
      } else if (el.tag === 'note') {
        if (child(el, 'grace') || child(el, 'cue')) continue;
        const dur = num(textOf(el, 'duration'), 0) / divisions;
        let start: number;
        if (child(el, 'chord')) {
          start = lastStart;
        } else {
          start = cur;
          cur += dur;
          lastStart = start;
        }
        extent = Math.max(extent, start + dur);
        const staff = num(textOf(el, 'staff'), 1) - 1;
        const sTick = tick + Math.round(start * TPQ);
        const dTick = Math.round(dur * TPQ);
        const pitch = child(el, 'pitch');
        if (child(el, 'rest') || !pitch) continue;
        const midi =
          (num(textOf(pitch, 'octave'), 4) + 1) * 12 + (STEPS[textOf(pitch, 'step') ?? 'C'] ?? 0) + Math.round(num(textOf(pitch, 'alter'), 0));
        const tieTypes = new Set(el.children.filter((c) => c.tag === 'tie').map((c) => c.attrs.type));
        const key = `${staff}:${midi}`;
        const open = ties.get(key);
        if (tieTypes.has('stop') && open) {
          ties.delete(key);
          open.dur = sTick + dTick - open.start;
          if (tieTypes.has('start')) ties.set(key, open);
          continue;
        }
        const n: RawNote = { pitch: midi, start: sTick, dur: dTick, staff };
        info.notes.push(n);
        if (tieTypes.has('start')) ties.set(key, n);
      }
    }
    const full = (4 * timeSig[0]) / timeSig[1];
    // Anacruse e compassos incompletos têm o tamanho do que foi escrito.
    const length = m.attrs.implicit === 'yes' && extent > 0 ? extent : Math.max(full, extent);
    info.len = Math.round(length * TPQ);
    measures.push(info);
    tick += info.len;
  }
  return measures;
}

/** Separa duas vozes de uma pauta pela altura em cada momento. */
function assignVoices(notes: RawNote[], upper: number, lower: number): [RawNote, number][] {
  const byKey = new Map<string, RawNote>();
  for (const n of notes) {
    const k = `${n.start}:${n.pitch}`;
    const prev = byKey.get(k);
    if (prev) prev.dur = Math.max(prev.dur, n.dur);
    else byKey.set(k, { ...n });
  }
  const uniq = [...byKey.values()].sort((a, b) => a.start - b.start || a.pitch - b.pitch);
  return uniq.map((n) => {
    const others = uniq.filter((o) => o !== n && o.start <= n.start && n.start < o.start + o.dur);
    const top = !others.length || n.pitch >= Math.max(...others.map((o) => o.pitch));
    return [n, top ? upper : lower];
  });
}

/** Intervalos sem nenhuma nota soando (para desenhar pausas). */
function silentGaps(notes: RawNote[], start: number, end: number): [number, number][] {
  const gaps: [number, number][] = [];
  let cur = start;
  for (const n of [...notes].sort((a, b) => a.start - b.start)) {
    if (n.start > cur) gaps.push([cur, n.start]);
    cur = Math.max(cur, n.start + n.dur);
  }
  if (cur < end) gaps.push([cur, end]);
  return gaps;
}

function splitRest(start: number, dur: number): [number, number][] {
  const out: [number, number][] = [];
  for (const value of [1920, 960, 480, 240, 120]) {
    while (dur >= value) {
      out.push([start, value]);
      start += value;
      dur -= value;
    }
  }
  return out;
}

export function musicXmlToScore(xml: string): ScoreFile {
  const root = parseXml(xml);
  if (root.tag !== 'score-partwise') throw new Error('Não é um MusicXML (score-partwise).');
  const parts = root.children.filter((c) => c.tag === 'part');
  if (!parts.length) throw new Error('Partitura sem partes.');

  const parsed = parts.map(parsePart);
  const pianoIndex = parts.findIndex((p) => num(findDeep(p, 'staves')?.text.trim(), 1) >= 2);
  let base: MeasureInfo[];
  let top: RawNote[];
  let bottom: RawNote[];
  if (pianoIndex >= 0) {
    base = parsed[pianoIndex];
    const all = base.flatMap((m) => m.notes);
    top = all.filter((n) => n.staff === 0);
    bottom = all.filter((n) => n.staff >= 1);
  } else {
    base = parsed[0];
    top = parsed[0].flatMap((m) => m.notes);
    bottom = parsed.length > 1 ? parsed[parsed.length - 1].flatMap((m) => m.notes) : [];
  }

  const title = textOf(root, 'work/work-title') ?? textOf(root, 'movement-title') ?? '';
  const creator = (child(root, 'identification')?.children ?? []).find((c) => c.tag === 'creator' && c.attrs.type === 'composer');
  const composer = creator?.text.trim() ?? '';

  const measures = base.map((m) => m.start);
  const last = base[base.length - 1];
  const end = last ? last.start + last.len : 0;
  let lines = [0, ...base.slice(1).filter((m) => m.lineBreak).map((m) => m.start)];
  if (lines.length === 1 && base.length > 4) {
    // Sem quebras de sistema no arquivo: uma linha a cada 4 compassos.
    lines = base.filter((_, i) => i % 4 === 0).map((m) => m.start);
  }

  const notes: [number, number, number, number][] = [];
  for (const [staffNotes, up, low] of [
    [top, 0, 1],
    [bottom, 2, 3],
  ] as const) {
    for (const [n, voice] of assignVoices(staffNotes, up, low)) notes.push([n.pitch, n.start, n.dur, voice]);
  }
  notes.sort((a, b) => a[1] - b[1] || a[3] - b[3] || a[0] - b[0]);
  if (!notes.length) throw new Error('Nenhuma nota encontrada.');

  // Numa mesma voz, uma nota termina quando a próxima começa.
  for (let voice = 0; voice < 4; voice++) {
    const vs = notes.filter((n) => n[3] === voice).sort((a, b) => a[1] - b[1]);
    vs.forEach((a, i) => {
      const next = vs.slice(i + 1).find((b) => b[1] > a[1]);
      if (next && next[1] < a[1] + a[2]) a[2] = next[1] - a[1];
    });
  }

  const rests: [number, number, number][] = [];
  [top, bottom].forEach((staffNotes, staffIndex) => {
    for (const m of base) {
      const s = m.start;
      const e = m.start + m.len;
      const inside = staffNotes.filter((n) => (s <= n.start && n.start < e) || (n.start < s && s < n.start + n.dur));
      for (const [gs, ge] of silentGaps(inside, s, e)) {
        for (const [rs, rd] of splitRest(gs, ge - gs)) rests.push([rs, rd, staffIndex]);
      }
    }
  });

  const key = base.find((m) => m.key !== null)?.key ?? 0;
  const time = base.find((m) => m.time !== null)?.time ?? [4, 4];
  const tempo = parsed.flat().find((m) => m.tempo !== null)?.tempo;
  let unit: ScoreFile['tempoMark']['unit'] = 'q';
  let factor = 1;
  const lo = tempo?.min ?? 90;
  const hi = tempo?.max ?? 90;
  if (tempo?.unit === 'half') [unit, factor] = ['h', 2];
  else if (tempo?.unit === 'eighth') [unit, factor] = ['e', 0.5];
  else if (tempo?.unit === 'quarter' && tempo.dotted) [unit, factor] = ['q.', 1.5];

  return {
    title,
    composer,
    key,
    time: [time[0], time[1]],
    tempo: [Math.round(lo * factor), Math.round(hi * factor)],
    tempoMark: { unit, min: lo, max: hi, text: '' },
    measures,
    end,
    lines,
    notes,
    rests,
  };
}
