#!/usr/bin/env python3
"""
Importa partituras em MusicXML e gera os arquivos de dados usados pelo app
(src/content/partituras/*.json + registry.ts).

Uso:
    python3 scripts/importar-partituras.py <pasta-com-partituras> [saida]

Cada arquivo tem o nome do id da música em src/content/repertorio.ts, por
exemplo `faint.musicxml`, `faint.xml` ou `faint.mxl` (MusicXML compactado). Quase
todo editor de partitura exporta MusicXML (MuseScore, Sibelius, Finale,
Dorico, Musicnotes...).

A partitura deve ser de piano (uma parte com duas pautas) ou ter duas partes:
a primeira vira a mão direita e a última, a mão esquerda. O script:
  * lê notas, acordes, pausas, ligaduras, quiálteras e várias camadas;
  * separa duas vozes em cada pauta pela altura (a mais aguda é a de cima);
  * toca a partitura de ponta a ponta (ritornelos não são repetidos);
  * guarda compassos (inclusive anacruse), linhas (quebras de sistema),
    tonalidade, fórmula de compasso, andamento, título e autor.

Formato de saída (compacto, tempos em "ticks": 480 = uma semínima):
  { title, composer, key, time: [n, d], tempo: [min, max], tempoMark,
    measures: [inícios...], end, lines: [inícios...],
    notes: [[midi, início, duração, voz(0/1 = pauta de cima, 2/3 = de baixo)], ...],
    rests: [[início, duração, pauta(0|1)], ...] }
"""
import json
import os
import re
import sys
import xml.etree.ElementTree as ET
import zipfile
from fractions import Fraction

TPQ = 480
STEPS = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
EXTENSIONS = ('.musicxml', '.xml', '.mxl')
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')


def text(el, path, default=None):
    found = el.find(path)
    return found.text.strip() if found is not None and found.text is not None else default


def strip_ns(root):
    """Remove namespaces das tags (alguns editores exportam com eles)."""
    for el in root.iter():
        if isinstance(el.tag, str) and '}' in el.tag:
            el.tag = el.tag.split('}', 1)[1]
    return root


def read_xml(path):
    if path.lower().endswith('.mxl'):
        with zipfile.ZipFile(path) as z:
            name = None
            if 'META-INF/container.xml' in z.namelist():
                container = strip_ns(ET.fromstring(z.read('META-INF/container.xml')))
                rootfile = container.find('.//rootfile')
                if rootfile is not None:
                    name = rootfile.get('full-path')
            if name is None:
                name = next(n for n in z.namelist() if n.endswith(('.xml', '.musicxml')) and not n.startswith('META-INF'))
            return strip_ns(ET.fromstring(z.read(name)))
    return strip_ns(ET.parse(path).getroot())


def repertoire_ids():
    """Ids das músicas cadastradas em src/content/repertorio.ts."""
    path = os.path.join(ROOT, 'src', 'content', 'repertorio.ts')
    with open(path, encoding='utf-8') as fh:
        return set(re.findall(r"\{ id: '([a-z0-9-]+)', title:", fh.read()))


def parse_part(part):
    """
    Lê uma parte: devolve, por compasso, início/duração, quebras de linha,
    armadura, fórmula, andamento e notas/pausas de cada pauta.
    """
    measures = []
    divisions = 1
    time_sig = (4, 4)
    ties = {}  # (pauta, altura) -> nota aberta
    tick = 0
    for m in part.findall('measure'):
        info = {'start': tick, 'notes': [], 'rests': [], 'lineBreak': False, 'key': None, 'time': None, 'tempo': None}
        pr = m.find('print')
        if pr is not None and (pr.get('new-system') == 'yes' or pr.get('new-page') == 'yes'):
            info['lineBreak'] = True
        cur = Fraction(0)
        extent = Fraction(0)
        last_start = Fraction(0)
        for el in m:
            tag = el.tag
            if tag == 'attributes':
                divisions = int(text(el, 'divisions', divisions))
                key = el.find('key')
                if key is not None and text(key, 'fifths') is not None:
                    info['key'] = int(text(key, 'fifths'))
                ts = el.find('time')
                if ts is not None and text(ts, 'beats') and text(ts, 'beat-type'):
                    beats = text(ts, 'beats')
                    # "3+2" vira 5
                    time_sig = (sum(int(x) for x in re.findall(r'\d+', beats)), int(text(ts, 'beat-type')))
                    info['time'] = time_sig
            elif tag == 'direction':
                sound = el.find('sound')
                metro = el.find('.//metronome')
                if info['tempo'] is None and metro is not None and text(metro, 'per-minute'):
                    unit = text(metro, 'beat-unit', 'quarter')
                    dotted = metro.find('beat-unit-dot') is not None
                    found = [int(x) for x in re.findall(r'\d+', text(metro, 'per-minute'))]
                    if found:
                        info['tempo'] = (unit, dotted, found[0], found[-1])
                if info['tempo'] is None and sound is not None and sound.get('tempo'):
                    bpm = round(float(sound.get('tempo')))
                    info['tempo'] = ('quarter', False, bpm, bpm)
            elif tag == 'sound' and el.get('tempo') and info['tempo'] is None:
                bpm = round(float(el.get('tempo')))
                info['tempo'] = ('quarter', False, bpm, bpm)
            elif tag == 'backup':
                cur -= Fraction(int(text(el, 'duration', 0)), divisions)
            elif tag == 'forward':
                cur += Fraction(int(text(el, 'duration', 0)), divisions)
                extent = max(extent, cur)
            elif tag == 'note':
                if el.find('grace') is not None or el.find('cue') is not None:
                    continue
                dur = Fraction(int(text(el, 'duration', 0)), divisions)
                if el.find('chord') is not None:
                    start = last_start
                else:
                    start = cur
                    cur += dur
                    last_start = start
                extent = max(extent, start + dur)
                staff = int(text(el, 'staff', 1)) - 1
                s_tick = tick + int(start * TPQ)
                d_tick = int(dur * TPQ)
                if el.find('rest') is not None:
                    if el.get('print-object') != 'no':
                        info['rests'].append({'start': s_tick, 'dur': d_tick, 'staff': staff})
                    continue
                pitch = el.find('pitch')
                if pitch is None:
                    continue  # nota sem altura (percussão)
                midi = (int(text(pitch, 'octave')) + 1) * 12 + STEPS[text(pitch, 'step')] + round(float(text(pitch, 'alter', 0)))
                tie_types = {t.get('type') for t in el.findall('tie')}
                key = (staff, midi)
                if 'stop' in tie_types and key in ties:
                    opened = ties.pop(key)
                    opened['dur'] = s_tick + d_tick - opened['start']
                    if 'start' in tie_types:
                        ties[key] = opened
                    continue
                n = {'pitch': midi, 'start': s_tick, 'dur': d_tick, 'staff': staff}
                info['notes'].append(n)
                if 'start' in tie_types:
                    ties[key] = n
        full = Fraction(4 * time_sig[0], time_sig[1])
        # Anacruse e compassos incompletos têm o tamanho do que foi escrito.
        length = extent if (m.get('implicit') == 'yes' and extent > 0) else max(full, extent)
        info['len'] = int(length * TPQ)
        measures.append(info)
        tick += info['len']
    return measures


def assign_voices(notes, upper, lower):
    """Separa duas vozes de uma pauta pela altura em cada momento."""
    out = []
    by_key = {}
    for n in notes:
        k = (n['start'], n['pitch'])
        if k in by_key:
            by_key[k]['dur'] = max(by_key[k]['dur'], n['dur'])
        else:
            by_key[k] = dict(n)
    uniq = sorted(by_key.values(), key=lambda n: (n['start'], n['pitch']))
    for n in uniq:
        others = [o for o in uniq if o is not n and o['start'] <= n['start'] < o['start'] + o['dur']]
        if not others or n['pitch'] >= max(o['pitch'] for o in others):
            out.append((n, upper))
        else:
            out.append((n, lower))
    return out


def silent_gaps(notes, start, end):
    """Intervalos sem nenhuma nota soando na pauta (para desenhar pausas)."""
    gaps = []
    cur = start
    for n in sorted(notes, key=lambda n: n['start']):
        if n['start'] > cur:
            gaps.append((cur, n['start']))
        cur = max(cur, n['start'] + n['dur'])
    if cur < end:
        gaps.append((cur, end))
    return gaps


def split_rest(start, dur):
    """Quebra um silêncio em figuras de pausa usuais."""
    out = []
    for value in (1920, 960, 480, 240, 120):
        while dur >= value:
            out.append((start, value))
            start += value
            dur -= value
    return out


def convert(path):
    root = read_xml(path)
    if root.tag != 'score-partwise':
        raise ValueError('esperado MusicXML "score-partwise"')
    parts = root.findall('part')
    if not parts:
        raise ValueError('partitura sem partes')

    # Pautas de cima e de baixo: piano (uma parte, duas pautas) ou duas partes.
    parsed = [parse_part(p) for p in parts]
    piano = next((i for i, p in enumerate(parts) if int(text(p, './/attributes/staves', 1)) >= 2), None)
    if piano is not None:
        base = parsed[piano]
        top = [[n for n in m['notes'] if n['staff'] == 0] for m in base]
        bottom = [[n for n in m['notes'] if n['staff'] >= 1] for m in base]
    else:
        base = parsed[0]
        top = [m['notes'] for m in parsed[0]]
        bottom = [m['notes'] for m in parsed[-1]] if len(parsed) > 1 else [[] for _ in base]

    title = text(root, 'work/work-title') or text(root, 'movement-title') or ''
    composer = ''
    for c in root.findall('identification/creator'):
        if c.get('type') == 'composer' and c.text:
            composer = c.text.strip()

    measures = [m['start'] for m in base]
    end = base[-1]['start'] + base[-1]['len'] if base else 0
    lines = [0] + [m['start'] for m in base[1:] if m['lineBreak']]
    if len(lines) == 1 and len(base) > 4:
        # Sem quebras de sistema no arquivo: uma linha a cada 4 compassos.
        lines = [m['start'] for i, m in enumerate(base) if i % 4 == 0]

    notes = []
    for staff_notes, (up, low) in ((top, (0, 1)), (bottom, (2, 3))):
        flat = [n for m in staff_notes for n in m]
        for n, voice in assign_voices(flat, up, low):
            notes.append([n['pitch'], n['start'], n['dur'], voice])
    notes.sort(key=lambda n: (n[1], n[3], n[0]))
    if not notes:
        raise ValueError('nenhuma nota encontrada')

    # Numa mesma voz, uma nota termina quando a próxima começa.
    for voice in range(4):
        vs = sorted((n for n in notes if n[3] == voice), key=lambda n: n[1])
        for i, a in enumerate(vs):
            nxt = next((b for b in vs[i + 1:] if b[1] > a[1]), None)
            if nxt is not None and nxt[1] < a[1] + a[2]:
                a[2] = nxt[1] - a[1]

    rests = []
    for staff_index, staff_notes in enumerate((top, bottom)):
        flat = [n for m in staff_notes for n in m]
        for m in base:
            s, e = m['start'], m['start'] + m['len']
            inside = [n for n in flat if s <= n['start'] < e or n['start'] < s < n['start'] + n['dur']]
            for gs, ge in silent_gaps(inside, s, e):
                for rs, rd in split_rest(gs, ge - gs):
                    rests.append([rs, rd, staff_index])

    key = next((m['key'] for m in base if m['key'] is not None), 0)
    time_sig = next((m['time'] for m in base if m['time'] is not None), (4, 4))
    tempo_info = next((m['tempo'] for p in parsed for m in p if m['tempo'] is not None), None)
    unit, factor, lo, hi = 'q', 1, 90, 90
    if tempo_info:
        beat_unit, dotted, lo, hi = tempo_info
        if beat_unit == 'half':
            unit, factor = 'h', 2
        elif beat_unit == 'eighth':
            unit, factor = 'e', 0.5
        elif beat_unit == 'quarter' and dotted:
            unit, factor = 'q.', 1.5
    return {
        'title': title,
        'composer': composer,
        'key': key,
        'time': list(time_sig),
        'tempo': [round(lo * factor), round(hi * factor)],
        'tempoMark': {'unit': unit, 'min': lo, 'max': hi, 'text': ''},
        'measures': measures,
        'end': end,
        'lines': lines,
        'notes': notes,
        'rests': rests,
    }


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    src = sys.argv[1]
    dest = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, 'src', 'content', 'partituras')
    os.makedirs(dest, exist_ok=True)
    known = repertoire_ids()
    ids = []
    errors = []
    for name in sorted(os.listdir(src)):
        stem, ext = os.path.splitext(name)
        if ext.lower() not in EXTENSIONS:
            continue
        if stem not in known:
            errors.append(f'{name}: "{stem}" não é um id de src/content/repertorio.ts')
            continue
        try:
            data = convert(os.path.join(src, name))
        except Exception as exc:  # noqa: BLE001
            errors.append(f'{name}: {exc}')
            continue
        with open(os.path.join(dest, f'{stem}.json'), 'w', encoding='utf-8') as fh:
            json.dump(data, fh, ensure_ascii=False, separators=(',', ':'))
        ids.append(stem)

    # O registro lista todas as partituras da pasta (as de importações anteriores também).
    present = sorted(f[:-5] for f in os.listdir(dest) if f.endswith('.json') and f[:-5] in known)
    lines = [
        '// Gerado por scripts/importar-partituras.py — não editar à mão.',
        "import type { ScoreFile } from './types';",
        '',
        'export const scoreLoaders: Record<string, () => ScoreFile> = {' + ('' if present else '};'),
    ]
    if present:
        for key in present:
            lines.append(f"  '{key}': () => require('./{key}.json'),")
        lines.append('};')
    with open(os.path.join(dest, 'registry.ts'), 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(lines) + '\n')
    print(f'{len(ids)} partitura(s) importada(s); {len(present)} no app ({dest})')
    for e in errors:
        print('ERRO', e)


if __name__ == '__main__':
    main()
