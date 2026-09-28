/**
 * Repertório do app: as músicas, divididas em grupos, na ordem da tela
 * inicial. Aqui ficam só título e artista; a partitura de cada música entra
 * pelo importador (ver docs/CONTEUDO.md) e fica em `partituras/`.
 */

export interface RepertoireSong {
  /** Também é o nome do arquivo da partitura: `<id>.musicxml`. */
  id: string;
  title: string;
  artist?: string;
}

export interface RepertoireGroup {
  id: string;
  label: string;
  songs: RepertoireSong[];
}

export const REPERTORIO: RepertoireGroup[] = [
  {
    id: 'jogos-vorazes',
    label: 'Jogos Vorazes',
    songs: [
      { id: 'safe-and-sound', title: 'Safe & Sound', artist: 'Taylor Swift ft. The Civil Wars' },
      { id: 'eyes-open', title: 'Eyes Open', artist: 'Taylor Swift' },
      { id: 'the-hanging-tree', title: 'The Hanging Tree', artist: 'James Newton Howard ft. Jennifer Lawrence' },
      { id: 'cant-catch-me-now', title: "Can't Catch Me Now", artist: 'Olivia Rodrigo' },
    ],
  },
  {
    id: 'loki',
    label: 'Loki',
    songs: [{ id: 'loki-green-theme', title: 'Loki Green Theme', artist: 'Natalie Holt' }],
  },
  {
    id: 'pedidos-avulsos',
    label: 'Pedidos avulsos',
    songs: [
      { id: 'heartbeat', title: 'Heartbeat', artist: 'Childish Gambino' },
      { id: 'feel-so-close', title: 'Feel So Close', artist: 'Calvin Harris' },
    ],
  },
  {
    id: 'one-direction',
    label: 'One Direction',
    songs: [
      { id: 'story-of-my-life', title: 'Story of My Life' },
      { id: 'night-changes', title: 'Night Changes' },
    ],
  },
  {
    id: 'nirvana',
    label: 'Nirvana',
    songs: [
      { id: 'smells-like-teen-spirit', title: 'Smells Like Teen Spirit' },
      { id: 'come-as-you-are', title: 'Come As You Are' },
    ],
  },
  {
    id: 'linkin-park',
    label: 'Linkin Park',
    songs: [
      { id: 'in-the-end', title: 'In the End' },
      { id: 'what-ive-done', title: "What I've Done" },
    ],
  },
];

/** Todas as músicas, numeradas de 1 em diante na ordem da lista. */
export const REPERTORIO_LISTA: (RepertoireSong & { number: number; group: string })[] = REPERTORIO.flatMap((g) =>
  g.songs.map((s) => ({ ...s, group: g.label })),
).map((s, i) => ({ ...s, number: i + 1 }));

const BY_ID = new Map(REPERTORIO_LISTA.map((s) => [s.id, s]));

export function repertoireSong(id: string) {
  return BY_ID.get(id);
}

/** "Can't Catch Me Now (Piano)" → "cant-catch-me-now-piano". */
export function slug(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Acha a música de um arquivo de partitura pelo nome do arquivo ou pelo
 * título dentro dele ("In_the_End_Linkin_Park.musicxml" → in-the-end).
 */
export function matchSong(fileName: string, title = ''): RepertoireSong | undefined {
  const names = [slug(fileName.replace(/\.[^.]+$/, '')), slug(title)].filter(Boolean);
  const fits = (name: string, key: string) => name === key || name.startsWith(`${key}-`);
  const hits = REPERTORIO_LISTA.filter((s) => names.some((n) => fits(n, s.id) || fits(n, slug(s.title))));
  // Com mais de uma, fica a de nome mais longo (a mais específica).
  return hits.sort((a, b) => b.id.length - a.id.length)[0];
}
