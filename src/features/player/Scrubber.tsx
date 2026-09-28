import { useState } from 'react';
import { StyleSheet, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';

import { usePalette } from '@/theme';

interface Props {
  /** Início de cada compasso (batidas), com o fim da música no último item. */
  measureStarts: number[];
  secondsPerBeat: number;
  /** Posição atual (0..1). */
  progress: number;
  /** Chamado com o instante (s) do compasso escolhido. */
  onSeek: (seconds: number) => void;
  /** Versão fina (sobre a música enquanto toca). */
  thin?: boolean;
  /** Cor da trilha em fundo claro (partitura). */
  onPaper?: boolean;
}

/** Índice do compasso que contém a batida `beat`. */
export function measureAt(measureStarts: number[], beat: number): number {
  let i = 0;
  while (i + 1 < measureStarts.length - 1 && measureStarts[i + 1] <= beat + 1e-6) i++;
  return i;
}

/**
 * Linha do tempo arrastável: toque ou arraste para ir a qualquer compasso.
 * Tem um tique por compasso e “gruda” no início do compasso mais próximo.
 */
export function Scrubber({ measureStarts, secondsPerBeat, progress, onSeek, thin, onPaper }: Props) {
  const p = usePalette();
  const [width, setWidth] = useState(0);
  const [drag, setDrag] = useState<number | null>(null);
  const total = measureStarts[measureStarts.length - 1] || 1;

  const pick = (e: GestureResponderEvent) => {
    if (width <= 0) return;
    const frac = Math.max(0, Math.min(1, e.nativeEvent.locationX / width));
    // Compasso mais próximo do ponto tocado.
    const beat = frac * total;
    let best = 0;
    for (let i = 0; i < measureStarts.length - 1; i++) {
      if (Math.abs(measureStarts[i] - beat) < Math.abs(measureStarts[best] - beat)) best = i;
    }
    const snapped = measureStarts[best] / total;
    setDrag(snapped);
    onSeek(measureStarts[best] * secondsPerBeat);
  };

  const pos = drag ?? progress;
  const track = onPaper ? 'rgba(0,0,0,0.12)' : p.border;
  const fill = onPaper ? p.ink : p.text;

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={pick}
      onResponderMove={pick}
      onResponderRelease={() => setDrag(null)}
      onResponderTerminate={() => setDrag(null)}
      accessibilityRole="adjustable"
      accessibilityLabel="Linha do tempo da música"
      style={thin ? styles.hitThin : styles.hit}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={[thin ? styles.axisThin : styles.axis, { backgroundColor: track }]} />
        <View style={[thin ? styles.axisThin : styles.axis, { backgroundColor: fill, right: undefined, width: `${pos * 100}%` }]} />
        {thin
          ? null
          : measureStarts.slice(1, -1).map((b, i) => (
              <View key={i} style={[styles.tick, { left: `${(b / total) * 100}%`, backgroundColor: p.textFaint }]} />
            ))}
        <View
          style={[
            thin ? styles.knobThin : styles.knob,
            { left: `${pos * 100}%`, backgroundColor: onPaper ? p.ink : p.primary, borderColor: onPaper ? p.paper : p.bg },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hit: { height: 28, justifyContent: 'center' },
  hitThin: { height: 24, justifyContent: 'center' },
  axis: { position: 'absolute', left: 0, right: 0, top: 13, height: 2, borderRadius: 1 },
  axisThin: { position: 'absolute', left: 0, right: 0, top: 11, height: 3, borderRadius: 2 },
  tick: { position: 'absolute', top: 9, width: 1, height: 10 },
  knob: { position: 'absolute', top: 5, width: 18, height: 18, borderRadius: 9, marginLeft: -9, borderWidth: 3 },
  knobThin: { position: 'absolute', top: 6, width: 13, height: 13, borderRadius: 7, marginLeft: -6.5, borderWidth: 2 },
});
