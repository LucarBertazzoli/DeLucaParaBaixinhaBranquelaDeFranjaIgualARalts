import { describe, expect, it } from '@jest/globals';

import { getSong } from '@/content';
import { musicXmlToScore } from '@/content/musicxml';
import { matchSong } from '@/content/repertorio';
import { hasScore } from '@/content/songs';
import { parseXml, textOf } from '@/content/xml';
import { usePartituras } from '@/store/partituras';

// Trecho escrito para o teste: piano (2 pautas), anacruse, acorde, ligadura,
// várias camadas (backup), pausas e quebra de sistema.
const XML = `
  <?xml version="1.0" encoding="UTF-8"?>
  <score-partwise version="3.1">
    <work><work-title>Teste</work-title></work>
    <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
    <part id="P1">
      <measure number="0" implicit="yes">
        <attributes><divisions>2</divisions><key><fifths>-1</fifths></key><time><beats>3</beats><beat-type>4</beat-type></time><staves>2</staves></attributes>
        <direction><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>100</per-minute></metronome></direction-type><sound tempo="100"/></direction>
        <note><pitch><step>C</step><octave>5</octave></pitch><duration>2</duration><voice>1</voice><staff>1</staff></note>
      </measure>
      <measure number="1">
        <note><pitch><step>F</step><octave>4</octave></pitch><duration>4</duration><tie type="start"/><voice>1</voice><staff>1</staff></note>
        <note><chord/><pitch><step>A</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><staff>1</staff></note>
        <note><pitch><step>B</step><alter>-1</alter><octave>4</octave></pitch><duration>1</duration><voice>1</voice><staff>1</staff></note>
        <note><rest/><duration>1</duration><voice>1</voice><staff>1</staff></note>
        <backup><duration>6</duration></backup>
        <note><pitch><step>F</step><octave>3</octave></pitch><duration>6</duration><voice>5</voice><staff>2</staff></note>
      </measure>
      <measure number="2">
        <print new-system="yes"/>
        <note><pitch><step>F</step><octave>4</octave></pitch><duration>2</duration><tie type="stop"/><voice>1</voice><staff>1</staff></note>
        <note><rest/><duration>4</duration><voice>1</voice><staff>1</staff></note>
        <backup><duration>6</duration></backup>
        <note><rest/><duration>6</duration><voice>5</voice><staff>2</staff></note>
      </measure>
    </part>
  </score-partwise>
`;

describe('MusicXML', () => {
  it('converte como o importador de linha de comando', () => {
    const s = musicXmlToScore(XML);
    expect(s).toMatchObject({ title: 'Teste', key: -1, time: [3, 4], tempo: [100, 100] });
    expect(s.measures).toEqual([0, 480, 1920]);
    expect(s.end).toBe(3360);
    expect(s.lines).toEqual([0, 1920]);
    expect(s.notes).toEqual([
      [72, 0, 480, 0],
      [69, 480, 960, 0],
      [65, 480, 1920, 1],
      [53, 480, 1440, 2],
      [70, 1440, 240, 0],
    ]);
    expect(s.rests).toEqual([
      [2400, 960, 0],
      [0, 480, 1],
      [1920, 960, 1],
      [2880, 480, 1],
    ]);
  });

  it('recusa o que não é MusicXML', () => {
    expect(() => musicXmlToScore('<html><body/></html>')).toThrow();
  });

  it('lê entidades, namespaces e CDATA', () => {
    const x = parseXml('<?xml version="1.0"?><!DOCTYPE a><m:a><m:b t="1">Safe &amp; Sound &#233;</m:b><c><![CDATA[<x>]]></c></m:a>');
    expect(x.tag).toBe('a');
    expect(textOf(x, 'b')).toBe('Safe & Sound é');
    expect(x.children[0].attrs.t).toBe('1');
    expect(textOf(x, 'c')).toBe('<x>');
  });
});

describe('reconhecer a música do arquivo', () => {
  it('pelo nome do arquivo ou pelo título', () => {
    expect(matchSong('In_the_End_Linkin_Park.musicxml')?.id).toBe('in-the-end');
    expect(matchSong('Safe_and_Sound.musicxml')?.id).toBe('safe-and-sound');
    expect(matchSong('Cant_Catch_Me_Now.musicxml')?.id).toBe('cant-catch-me-now');
    expect(matchSong('What_Ive_Done.musicxml')?.id).toBe('what-ive-done');
    expect(matchSong('arquivo.musicxml', 'Come As You Are (Piano)')?.id).toBe('come-as-you-are');
    expect(matchSong('Eyes_Open.musicxml', 'Eyes Open')?.id).toBe('eyes-open');
  });
});

describe('partituras no aparelho', () => {
  it('uma partitura importada abre a música; apagada, some', () => {
    expect(hasScore('loki-green-theme')).toBe(false);
    usePartituras.getState().add('loki-green-theme', musicXmlToScore(XML));
    expect(hasScore('loki-green-theme')).toBe(true);
    expect(getSong('loki-green-theme')).toMatchObject({ title: 'Loki Green Theme', subtitle: 'Natalie Holt', hymnNumber: 7 });
    usePartituras.getState().remove('loki-green-theme');
    expect(getSong('loki-green-theme')).toBeUndefined();
  });
});
