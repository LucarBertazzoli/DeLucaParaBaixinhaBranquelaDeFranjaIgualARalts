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
      { id: 'the-hanging-tree', title: 'The Hanging Tree', artist: 'James Newton Howard ft. Jennifer Lawrence' },
      { id: 'eyes-open', title: 'Eyes Open', artist: 'Taylor Swift' },
      { id: 'cant-catch-me-now', title: "Can't Catch Me Now", artist: 'Olivia Rodrigo' },
    ],
  },
  {
    id: 'loki',
    label: 'Loki',
    songs: [{ id: 'loki-green-theme', title: 'Loki Green Theme', artist: 'Natalie Holt' }],
  },
  {
    id: 'cinquenta-tons',
    label: 'Cinquenta Tons de Cinza',
    songs: [
      { id: 'i-dont-wanna-live-forever', title: "I Don't Wanna Live Forever", artist: 'Zayn & Taylor Swift' },
      { id: 'love-me-like-you-do', title: 'Love Me Like You Do', artist: 'Ellie Goulding' },
      { id: 'earned-it', title: 'Earned It', artist: 'The Weeknd' },
      { id: 'crazy-in-love', title: 'Crazy in Love (versão de Cinquenta Tons)', artist: 'Beyoncé' },
    ],
  },
  {
    id: 'pedidos-avulsos',
    label: 'Pedidos avulsos',
    songs: [
      { id: 'talking-body', title: 'Talking Body', artist: 'Tove Lo' },
      { id: 'black-sheep', title: 'Black Sheep', artist: 'Metric' },
      { id: 'heartbeat', title: 'Heartbeat', artist: 'Childish Gambino' },
      { id: 'feel-so-close', title: 'Feel So Close', artist: 'Calvin Harris' },
      { id: 'myself', title: 'Myself', artist: 'Artemas' },
      { id: 'chasing-the-sun', title: 'Chasing the Sun', artist: 'The Wanted' },
      { id: 'glad-you-came', title: 'Glad You Came', artist: 'The Wanted' },
    ],
  },
  {
    id: 'one-direction',
    label: 'One Direction',
    songs: [
      { id: 'what-makes-you-beautiful', title: 'What Makes You Beautiful' },
      { id: 'story-of-my-life', title: 'Story of My Life' },
      { id: 'night-changes', title: 'Night Changes' },
      { id: 'drag-me-down', title: 'Drag Me Down' },
      { id: 'best-song-ever', title: 'Best Song Ever' },
    ],
  },
  {
    id: 'vampire-diaries',
    label: 'The Vampire Diaries',
    songs: [
      { id: 'running-up-that-hill', title: 'Running Up That Hill', artist: 'Placebo' },
      { id: 'never-say-never', title: 'Never Say Never', artist: 'The Fray' },
      { id: 'echo', title: 'Echo', artist: 'Jason Walker' },
      { id: 'kiss-me-slowly', title: 'Kiss Me Slowly', artist: 'Parachute' },
      { id: 'skinny-love', title: 'Skinny Love', artist: 'Birdy' },
    ],
  },
  {
    id: 'nirvana',
    label: 'Nirvana',
    songs: [
      { id: 'smells-like-teen-spirit', title: 'Smells Like Teen Spirit' },
      { id: 'come-as-you-are', title: 'Come As You Are' },
      { id: 'heart-shaped-box', title: 'Heart-Shaped Box' },
      { id: 'lithium', title: 'Lithium' },
      { id: 'in-bloom', title: 'In Bloom' },
    ],
  },
  {
    id: 'linkin-park',
    label: 'Linkin Park',
    songs: [
      { id: 'in-the-end', title: 'In the End' },
      { id: 'numb', title: 'Numb' },
      { id: 'faint', title: 'Faint' },
      { id: 'what-ive-done', title: "What I've Done" },
      { id: 'crawling', title: 'Crawling' },
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
