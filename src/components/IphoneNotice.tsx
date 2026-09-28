import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { usePalette, useType } from '@/theme';

import { Icon } from './Icon';

/** iPhone (no app ou no navegador). iPad não entra. */
function isIphone(): boolean {
  if (Platform.OS === 'ios') return !Platform.isPad;
  if (Platform.OS === 'web' && typeof navigator !== 'undefined') return /iPhone|iPod/i.test(navigator.userAgent);
  return false;
}

const IPHONE = isIphone();

/** No iPhone, um aviso no alto da tela sugere usar um iPad (dá para fechar). */
export function IphoneNotice() {
  const p = usePalette();
  const t = useType();
  const [open, setOpen] = useState(IPHONE);
  if (!open) return null;
  return (
    <Animated.View entering={FadeInUp.duration(300)} style={styles.wrap} pointerEvents="box-none">
      <View style={[styles.notice, { backgroundColor: p.surfaceStrong, borderColor: p.border }]}>
        <Text style={[t.regular, styles.text, { color: p.text }]}>Para melhor visualização, utilize um iPad.</Text>
        <Pressable onPress={() => setOpen(false)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Fechar aviso">
          <Icon name="close" size={16} color={p.textDim} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 10, left: 0, right: 0, alignItems: 'center', zIndex: 900 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10, maxWidth: 520 },
  text: { fontSize: 14, flexShrink: 1 },
});
