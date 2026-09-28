import type { Timeline } from './timeline';

/**
 * Em que ponto (fração do trecho, 0..1) a pergunta aparece: quando falta
 * pouco para terminar a primeira linha da música (85% dela).
 */
export function perguntaAt(timeline: Pick<Timeline, 'lineStarts' | 'measureStarts' | 'secondsPerBeat' | 'duration'>): number {
  const end = timeline.lineStarts[1] ?? timeline.measureStarts[timeline.measureStarts.length - 1];
  const seconds = end * timeline.secondsPerBeat * 0.85;
  return timeline.duration > 0 ? Math.min(0.95, seconds / timeline.duration) : 0;
}
