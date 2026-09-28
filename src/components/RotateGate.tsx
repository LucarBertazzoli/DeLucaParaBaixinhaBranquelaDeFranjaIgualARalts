import { useEffect } from 'react';
import { Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { usePalette, useType } from '@/theme';

import { Icon } from './Icon';

// Celular ou tablet (tela de toque) no navegador. No app instalado a tela já
// fica travada na horizontal; no computador qualquer janela funciona.
const isTouchWeb =
  Platform.OS === 'web' &&
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(pointer: coarse)').matches;

/**
 * O app só funciona com o aparelho deitado. No navegador do celular não dá
 * para girar a tela à força, então, em pé, o app fica coberto por este aviso.
 */
export function RotateGate() {
  const { width, height } = useWindowDimensions();
  const portrait = isTouchWeb && height > width;
  if (!portrait) return null;
  return <RotateNotice />;
}

function RotateNotice() {
  const p = usePalette();
  const t = useType();
  const angle = useSharedValue(0);
  useEffect(() => {
    angle.value = withRepeat(
      withSequence(withDelay(500, withTiming(-90, { duration: 700 })), withDelay(900, withTiming(0, { duration: 0 }))),
      -1,
    );
  }, [angle]);
  const phone = useAnimatedStyle(() => ({ transform: [{ rotate: `${angle.value}deg` }] }));

  return (
    <View style={[StyleSheet.absoluteFill, styles.root, { backgroundColor: p.bg }]} accessibilityRole="alert">
      <Animated.View style={phone}>
        <Icon name="touch" size={72} color={p.primary} />
      </Animated.View>
      <Text style={[t.bold, styles.title, { color: p.text }]}>Gire o celular</Text>
      <Text style={[t.regular, styles.text, { color: p.textDim }]}>O app funciona com o celular deitado.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { zIndex: 1000, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32 },
  title: { fontSize: 22, marginTop: 10 },
  text: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
