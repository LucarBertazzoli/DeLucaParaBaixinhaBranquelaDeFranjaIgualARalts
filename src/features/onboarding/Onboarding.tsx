import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInRight } from 'react-native-reanimated';

import { Icon } from '@/components/Icon';
import { Segmented } from '@/features/player/controls';
import { useSettings } from '@/store/settings';
import { usePalette, useType } from '@/theme';

/**
 * Cartões de apresentação: aparecem só na primeira vez que o app é aberto.
 * Mostram como escolher a música, trocar órgão/piano, trocar partitura/notas
 * caindo e como o app ouve quem toca.
 */
export function Onboarding() {
  const p = usePalette();
  const t = useType();
  const finish = () => useSettings.getState().set({ onboarded: true });
  const [step, setStep] = useState(0);
  const [demoInstrument, setDemoInstrument] = useState<'organ' | 'piano'>('organ');
  const [demoView, setDemoView] = useState<'page' | 'falling'>('page');

  const cards: { title: string; text: string; art: ReactNode }[] = [
    {
      title: 'Seu repertório',
      text: 'Escolha uma música na lista; os grupos à esquerda levam direto a cada parte. Ela abre pronta para tocar. Tocando no seu avatar, você abre o seu perfil.',
      art: (
        <View style={[styles.searchArt, { backgroundColor: p.surface, borderColor: p.border }]}>
          <Icon name="music" size={16} color={p.textDim} />
          <Text style={[t.regular, styles.searchText, { color: p.textDim }]}>2 · The Hanging Tree</Text>
        </View>
      ),
    },
    {
      title: 'Órgão ou piano',
      text: 'No canto de cima, à direita, este interruptor troca o instrumento. Órgão: manual superior (mão direita), inferior (mão esquerda) e pedaleira.',
      art: (
        <View style={styles.artCol}>
          <Segmented
            options={[
              { value: 'organ', label: 'Órgão' },
              { value: 'piano', label: 'Piano' },
            ]}
            value={demoInstrument}
            onChange={(v) => setDemoInstrument(v as 'organ' | 'piano')}
          />
          <Keys rows={demoInstrument === 'organ' ? 2 : 1} pedal={demoInstrument === 'organ'} />
        </View>
      ),
    },
    {
      title: 'Partitura ou notas caindo',
      text: 'Ao lado, o outro interruptor troca como ver a música: a partitura ou as notas caindo sobre as teclas.',
      art: (
        <View style={styles.artCol}>
          <Segmented
            options={[
              { value: 'page', label: 'Partitura' },
              { value: 'falling', label: 'Notas' },
            ]}
            value={demoView}
            onChange={(v) => setDemoView(v as 'page' | 'falling')}
          />
          {demoView === 'page' ? <Staff /> : <Falling />}
        </View>
      ),
    },
    {
      title: 'O app ouve você',
      text: 'Pelo microfone, o app ouve o seu órgão ou piano e espera cada nota do acorde antes de seguir. As notas certas ficam marcadas.',
      art: (
        <View style={[styles.micArt, { backgroundColor: p.surface, borderColor: p.border }]}>
          <Icon name="mic" size={34} color={p.primary} />
        </View>
      ),
    },
  ];
  const card = cards[step];
  const last = step === cards.length - 1;

  return (
    <Animated.View entering={FadeIn.duration(200)} style={[StyleSheet.absoluteFill, styles.root, { backgroundColor: p.bg }]}>
      <Animated.View key={step} entering={FadeInRight.duration(260)} style={styles.card}>
        <View style={styles.art}>{card.art}</View>
        <View style={styles.textCol}>
          <Text style={[t.regular, styles.step, { color: p.textDim }]}>
            {step + 1} de {cards.length}
          </Text>
          <Text style={[t.bold, styles.title, { color: p.text }]}>{card.title}</Text>
          <Text style={[t.regular, styles.text, { color: p.textDim }]}>{card.text}</Text>
        </View>
      </Animated.View>

      <View style={styles.footer}>
        <Pressable onPress={finish} accessibilityRole="button" hitSlop={8}>
          <Text style={[t.regular, styles.skip, { color: p.textDim }]}>{last ? '' : 'Pular'}</Text>
        </Pressable>
        <View style={styles.dots}>
          {cards.map((_, i) => (
            <View key={i} style={[styles.dot, { backgroundColor: i === step ? p.primary : p.border, width: i === step ? 18 : 6 }]} />
          ))}
        </View>
        <Pressable
          onPress={() => (last ? finish() : setStep(step + 1))}
          accessibilityRole="button"
          style={({ pressed }) => [styles.next, { backgroundColor: p.primary }, pressed && { opacity: 0.8 }]}>
          <Text style={[t.bold, styles.nextText, { color: p.primaryText }]}>{last ? 'Começar' : 'Próximo'}</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

/** Teclados em miniatura (1 ou 2 manuais, com ou sem pedaleira). */
function Keys({ rows, pedal }: { rows: number; pedal: boolean }) {
  const p = usePalette();
  const white = Array.from({ length: 14 });
  const black = [0, 1, 3, 4, 5, 7, 8, 10, 11, 12];
  return (
    <View style={styles.keysBox}>
      {Array.from({ length: rows }).map((_, r) => (
        <View key={r} style={styles.manual}>
          {white.map((__, i) => (
            <View key={i} style={[styles.white, { backgroundColor: p.keyWhite }]} />
          ))}
          {black.map((i) => (
            <View key={`b${i}`} style={[styles.black, { left: i * 14 + 10, backgroundColor: p.keyBlack }]} />
          ))}
        </View>
      ))}
      {pedal ? (
        <View style={[styles.pedalBoard, { backgroundColor: p.pedalBoard }]}>
          {Array.from({ length: 8 }).map((_, i) => (
            <View key={i} style={[styles.pedal, { backgroundColor: p.pedalNatural }]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function Staff() {
  const p = usePalette();
  return (
    <View style={[styles.staffBox, { backgroundColor: p.paper }]}>
      {[0, 1, 2, 3, 4].map((l) => (
        <View key={l} style={[styles.staffLine, { top: 18 + l * 8, backgroundColor: p.staff }]} />
      ))}
      {[20, 50, 80, 110, 140, 170].map((x, i) => (
        <View key={x} style={[styles.head, { left: x, top: 20 + ((i * 5) % 4) * 6, backgroundColor: p.ink }]} />
      ))}
    </View>
  );
}

function Falling() {
  const p = usePalette();
  const bars = [
    { l: 16, t: 6, h: 30 },
    { l: 56, t: 24, h: 22 },
    { l: 96, t: 0, h: 40 },
    { l: 136, t: 18, h: 26 },
    { l: 176, t: 8, h: 20 },
  ];
  return (
    <View style={[styles.staffBox, { backgroundColor: p.highway }]}>
      {bars.map((b, i) => (
        <View key={i} style={{ position: 'absolute', left: b.l, top: b.t, width: 22, height: b.h, borderRadius: 5, backgroundColor: i % 2 ? p.noteLeft : p.noteRight }} />
      ))}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 12, height: 2, backgroundColor: p.hitLine }} />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 12, backgroundColor: p.keyWhite }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { zIndex: 100, justifyContent: 'center', paddingHorizontal: 40, paddingVertical: 24 },
  card: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 40, maxWidth: 860, width: '100%', alignSelf: 'center' },
  art: { width: 280, alignItems: 'center', justifyContent: 'center' },
  artCol: { alignItems: 'center', gap: 14 },
  textCol: { flex: 1, gap: 10 },
  step: { fontSize: 12, letterSpacing: 1 },
  title: { fontSize: 26 },
  text: { fontSize: 15, lineHeight: 22 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: 860,
    width: '100%',
    alignSelf: 'center',
  },
  skip: { fontSize: 14, minWidth: 60 },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { height: 6, borderRadius: 3 },
  next: { borderRadius: 24, paddingHorizontal: 26, height: 46, justifyContent: 'center' },
  nextText: { fontSize: 15 },
  searchArt: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 26, borderWidth: 1, paddingHorizontal: 18, height: 50, width: 260 },
  searchText: { fontSize: 14 },
  micArt: { width: 96, height: 96, borderRadius: 48, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  keysBox: { gap: 3, alignItems: 'center' },
  manual: { flexDirection: 'row', gap: 1, height: 36 },
  white: { width: 13, height: 36, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },
  black: { position: 'absolute', top: 0, width: 8, height: 22, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },
  pedalBoard: { flexDirection: 'row', gap: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4, marginTop: 4 },
  pedal: { width: 12, height: 18, borderRadius: 2 },
  staffBox: { width: 220, height: 74, borderRadius: 8, overflow: 'hidden' },
  staffLine: { position: 'absolute', left: 8, right: 8, height: 1 },
  head: { position: 'absolute', width: 10, height: 7, borderRadius: 4 },
});
