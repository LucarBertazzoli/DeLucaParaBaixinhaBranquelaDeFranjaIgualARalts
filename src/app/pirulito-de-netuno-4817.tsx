import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { lerResposta, type Resposta } from '@/features/surpresa/resposta';
import { usePalette, useType } from '@/theme';

/**
 * Página secreta (não aparece em nenhum menu): mostra se ela já respondeu
 * "Sim" à pergunta. Lê do servidor, então vale para qualquer aparelho, e se
 * atualiza sozinha a cada 15 segundos.
 */
export default function PirulitoDeNetuno() {
  const p = usePalette();
  const t = useType();
  const [state, setState] = useState<Resposta | 'carregando' | 'offline'>('carregando');

  const refresh = useCallback(async () => {
    try {
      setState(await lerResposta());
    } catch {
      setState('offline');
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(refresh, 0);
    const timer = setInterval(refresh, 15000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [refresh]);

  const when =
    typeof state === 'object' && state.em
      ? new Date(state.em).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })
      : null;

  let body;
  if (state === 'carregando') {
    body = <Text style={[t.regular, styles.sub, { color: p.textDim }]}>Perguntando ao servidor…</Text>;
  } else if (state === 'offline' || !state.configurado || state.erro) {
    body = (
      <>
        <Text style={[t.bold, styles.title, { color: p.text }]}>Sem resposta do servidor</Text>
        <Text style={[t.regular, styles.sub, { color: p.textDim }]}>
          {state !== 'offline' && !state.configurado
            ? 'O banco de dados ainda não foi ligado na Vercel (Storage → Upstash Redis).'
            : 'Não deu para ler agora. Tentando de novo a cada 15 segundos.'}
        </Text>
      </>
    );
  } else if (state.topou) {
    body = (
      <Animated.View entering={ZoomIn.duration(500)} style={styles.center}>
        <Text style={styles.heart}>♥</Text>
        <Text style={[t.bold, styles.big, { color: p.text }]}>Ela topou.</Text>
        {when ? <Text style={[t.regular, styles.sub, { color: p.textDim }]}>Em {when}.</Text> : null}
      </Animated.View>
    );
  } else {
    body = (
      <>
        <Text style={[t.bold, styles.title, { color: p.text }]}>Ainda não respondeu</Text>
        <Text style={[t.regular, styles.sub, { color: p.textDim }]}>
          A pergunta aparece na primeira música que ela tocar. Esta página se atualiza sozinha.
        </Text>
      </>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: p.bg }]}>
      <Animated.View entering={FadeIn.duration(300)} style={styles.center}>
        {body}
        <Pressable onPress={refresh} accessibilityRole="button" style={({ pressed }) => [styles.button, { borderColor: p.border }, pressed && { opacity: 0.7 }]}>
          <Text style={[t.regular, styles.buttonText, { color: p.textDim }]}>Atualizar</Text>
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  center: { alignItems: 'center', gap: 12, maxWidth: 520 },
  heart: { fontSize: 64, color: '#D81B60' },
  big: { fontSize: 44, letterSpacing: -0.5 },
  title: { fontSize: 26, textAlign: 'center' },
  sub: { fontSize: 15, lineHeight: 22, textAlign: 'center' },
  button: { marginTop: 18, borderWidth: 1, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 8 },
  buttonText: { fontSize: 13 },
});
