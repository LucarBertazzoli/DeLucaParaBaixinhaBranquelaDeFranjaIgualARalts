// Gerado por scripts/importar-partituras.py — não editar à mão.
import type { ScoreFile } from './types';

export const scoreLoaders: Record<string, () => ScoreFile> = {
  'cant-catch-me-now': () => require('./cant-catch-me-now.json'),
  'come-as-you-are': () => require('./come-as-you-are.json'),
  'eyes-open': () => require('./eyes-open.json'),
  'feel-so-close': () => require('./feel-so-close.json'),
  'glad-you-came': () => require('./glad-you-came.json'),
  'heartbeat': () => require('./heartbeat.json'),
  'in-the-end': () => require('./in-the-end.json'),
  'never-say-never': () => require('./never-say-never.json'),
  'night-changes': () => require('./night-changes.json'),
  'paradise': () => require('./paradise.json'),
  'safe-and-sound': () => require('./safe-and-sound.json'),
  'smells-like-teen-spirit': () => require('./smells-like-teen-spirit.json'),
  'story-of-my-life': () => require('./story-of-my-life.json'),
  'the-hanging-tree': () => require('./the-hanging-tree.json'),
  'what-ive-done': () => require('./what-ive-done.json'),
};
