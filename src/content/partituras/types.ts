/** Formato compacto das partituras importadas (ver scripts/importar-partituras.py). */
export interface ScoreFile {
  title: string;
  composer: string;
  /** Armadura em quintas (-7..7). */
  key: number;
  time: [number, number];
  /** Faixa de andamento em semínimas por minuto. */
  tempo: [number, number];
  /** Indicação original: unidade (q, e, q., h), faixa e expressão. */
  tempoMark: { unit: 'q' | 'e' | 'q.' | 'h'; min: number; max: number; text: string };
  /** Início de cada compasso (ticks; 480 = semínima). */
  measures: number[];
  end: number;
  /** Início de cada linha (sistema) da partitura. */
  lines: number[];
  /** [midi, início, duração, voz (0/1 = mão direita, 2/3 = mão esquerda)] */
  notes: [number, number, number, number][];
  /** [início, duração, pauta (0=Sol 1=Fá)] */
  rests: [number, number, number][];
}
