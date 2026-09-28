import { useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSpring, ZoomIn } from 'react-native-reanimated';

import { AvatarCircle } from '@/features/perfil/AvatarBadge';
import { useSettings } from '@/store/settings';
import { usePalette, useType } from '@/theme';

const CARD_W = 360;
const CARD_H = 210;

/**
 * Balão no meio da tela, com o fundo escurecido. O "Não" foge: a cada toque
 * (ou quando o mouse chega perto) o balão pula para outro lugar. Só fecha
 * depois do "Sim" (que já grava a resposta), com um recado.
 */
export function Pergunta({ onYes, onDone }: { onYes: () => void; onDone: () => void }) {
  const p = usePalette();
  const t = useType();
  const avatar = useSettings((s) => s.avatar);
  const { width, height } = useWindowDimensions();
  const [answered, setAnswered] = useState(false);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const move = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { translateY: y.value }] }));

  const dodge = () => {
    const maxX = Math.max(0, (width - CARD_W) / 2 - 16);
    const maxY = Math.max(0, (height - CARD_H) / 2 - 16);
    // Sempre para longe de onde estava.
    const pick = (max: number, cur: number) => {
      const v = (Math.random() * 0.6 + 0.4) * max;
      return cur > 0 ? -v : v;
    };
    x.set(withSpring(pick(maxX, x.get()), { damping: 14, stiffness: 160 }));
    y.set(withSpring(pick(maxY, y.get()), { damping: 14, stiffness: 160 }));
  };

  const yes = () => {
    x.set(withSpring(0));
    y.set(withSpring(0));
    setAnswered(true);
    onYes();
  };

  return (
    <Animated.View entering={FadeIn.duration(300)} style={[StyleSheet.absoluteFill, styles.backdrop]} accessibilityViewIsModal>
      <Animated.View style={move}>
        <Animated.View entering={ZoomIn.duration(320)} style={[styles.card, { backgroundColor: p.surfaceStrong, borderColor: p.border }]}>
          <AvatarCircle id={avatar} size={52} />
          {answered ? (
            <Animated.View key="recado" entering={FadeIn.duration(260)} style={styles.body}>
              <Text style={[t.bold, styles.question, { color: p.text }]}>Você fica linda quando faz essa cara.</Text>
              <Pressable
                onPress={onDone}
                accessibilityRole="button"
                style={({ pressed }) => [styles.button, { backgroundColor: p.primary }, pressed && { opacity: 0.8 }]}>
                <Text style={[t.bold, styles.buttonText, { color: p.primaryText }]}>Continuar ♥</Text>
              </Pressable>
            </Animated.View>
          ) : (
            <View style={styles.body}>
              <Text style={[t.regular, styles.before, { color: p.textDim }]}>Antes de continuar…</Text>
              <Text style={[t.bold, styles.question, { color: p.text }]}>Topa voltar a nos conhecermos e ir devagar?</Text>
              <View style={styles.buttons}>
                <Pressable
                  onPress={yes}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.button, { backgroundColor: p.primary }, pressed && { opacity: 0.8 }]}>
                  <Text style={[t.bold, styles.buttonText, { color: p.primaryText }]}>Sim</Text>
                </Pressable>
                <Pressable
                  onPressIn={dodge}
                  onHoverIn={dodge}
                  onPress={dodge}
                  accessibilityRole="button"
                  style={[styles.button, styles.no, { borderColor: p.border }]}>
                  <Text style={[t.bold, styles.buttonText, { color: p.text }]}>Não</Text>
                </Pressable>
              </View>
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: { zIndex: 200, backgroundColor: 'rgba(0,0,0,0.72)', alignItems: 'center', justifyContent: 'center' },
  card: {
    width: CARD_W,
    minHeight: CARD_H,
    borderRadius: 28,
    borderWidth: 1,
    padding: 22,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
  },
  body: { alignItems: 'center', gap: 12 },
  before: { fontSize: 13 },
  question: { fontSize: 19, lineHeight: 26, textAlign: 'center' },
  buttons: { flexDirection: 'row', gap: 12, marginTop: 4 },
  button: { height: 44, minWidth: 110, borderRadius: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22 },
  no: { borderWidth: 1 },
  buttonText: { fontSize: 15 },
});
