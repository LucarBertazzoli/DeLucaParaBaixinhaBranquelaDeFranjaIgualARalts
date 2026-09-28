import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { AVATARES, type AvatarId } from '@/features/perfil/avatares';
import { NOME_USUARIA } from '@/features/perfil/usuaria';
import { useSettings } from '@/store/settings';
import { usePalette, useType } from '@/theme';
import { withAlpha } from '@/theme/color';

/**
 * Primeira tela: boas-vindas com o nome dela e a escolha do avatar, que
 * depois acompanha o app todo. Quem já escolheu vê o avatar marcado e entra.
 */
export default function BoasVindas() {
  const p = usePalette();
  const t = useType();
  const saved = useSettings((s) => s.avatar);
  const [choice, setChoice] = useState<AvatarId | null>(saved);

  const enter = () => {
    if (!choice) return;
    useSettings.getState().set({ avatar: choice });
    router.push('/musicas');
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: p.bg }]} edges={['left', 'right']}>
      <View style={styles.main}>
        <Animated.View entering={FadeInDown.duration(420)} style={styles.left}>
          <Text style={[t.regular, styles.hello, { color: p.textDim }]}>Bem-vinda,</Text>
          <Text style={[t.bold, styles.name, { color: p.text }]} numberOfLines={1} adjustsFontSizeToFit>
            {NOME_USUARIA}
          </Text>
          <Text style={[t.regular, styles.ask, { color: p.textDim }]}>Escolha seu avatar para começar.</Text>
          <Pressable
            onPress={enter}
            disabled={!choice}
            accessibilityRole="button"
            accessibilityState={{ disabled: !choice }}
            style={({ pressed }) => [
              styles.enter,
              { backgroundColor: choice ? p.primary : withAlpha(p.text, 0.08) },
              pressed && { opacity: 0.8 },
            ]}>
            <Text style={[t.bold, styles.enterText, { color: choice ? p.primaryText : p.textFaint }]}>
              {saved && choice === saved ? 'Entrar' : 'Vamos tocar'}
            </Text>
            <Icon name="chevronRight" size={18} color={choice ? p.primaryText : p.textFaint} />
          </Pressable>
        </Animated.View>

        <View style={styles.cards}>
          {AVATARES.map((a, i) => {
            const on = a.id === choice;
            return (
              <Animated.View key={a.id} entering={FadeInUp.duration(420).delay(120 + i * 90)} style={styles.cardSlot}>
                <Pressable
                  onPress={() => setChoice(a.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={a.nome}
                  style={({ pressed }) => [
                    styles.card,
                    {
                      backgroundColor: on ? withAlpha(p.primary, 0.14) : p.surface,
                      borderColor: on ? p.primary : p.border,
                      transform: [{ scale: on ? 1.04 : pressed ? 0.97 : 1 }],
                    },
                  ]}>
                  <Image source={a.imagem} style={styles.image} contentFit="contain" />
                  <View style={styles.cardFooter}>
                    <Text style={[on ? t.bold : t.regular, styles.cardName, { color: p.text }]}>{a.nome}</Text>
                    {on ? (
                      <Animated.View entering={FadeIn.duration(160)} style={[styles.check, { backgroundColor: p.primary }]}>
                        <Icon name="check" size={13} color={p.primaryText} />
                      </Animated.View>
                    ) : null}
                  </View>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 40,
    paddingHorizontal: 40,
    paddingVertical: 24,
    maxWidth: 1020,
    width: '100%',
    alignSelf: 'center',
  },
  left: { width: 250, gap: 6 },
  hello: { fontSize: 20 },
  name: { fontSize: 38, letterSpacing: -0.5 },
  ask: { fontSize: 15, lineHeight: 22, marginTop: 6 },
  enter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 24,
    marginTop: 22,
    alignSelf: 'flex-start',
    paddingHorizontal: 26,
  },
  enterText: { fontSize: 15 },
  cards: { flex: 1, flexDirection: 'row', gap: 16 },
  cardSlot: { flex: 1 },
  card: { borderRadius: 24, borderWidth: 1.5, padding: 14, gap: 10, alignItems: 'center' },
  image: { width: '100%', aspectRatio: 1 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 24 },
  cardName: { fontSize: 15 },
  check: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
