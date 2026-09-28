import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { REPERTORIO_LISTA, repertoireSong } from '@/content/repertorio';
import { hasScore } from '@/content/songs';
import { AvatarCircle } from '@/features/perfil/AvatarBadge';
import { AVATARES, avatarDe } from '@/features/perfil/avatares';
import { NOME_USUARIA } from '@/features/perfil/usuaria';
import { RoundButton } from '@/features/player/controls';
import { useSettings } from '@/store/settings';
import { usePalette, useType } from '@/theme';
import { withAlpha } from '@/theme/color';

/** Perfil: o avatar grande, o nome (fixo), a troca de avatar e as últimas músicas. */
export default function Perfil() {
  const p = usePalette();
  const t = useType();
  const avatar = useSettings((s) => s.avatar);
  const recentIds = useSettings((s) => s.recent);
  const recent = recentIds.map((id) => repertoireSong(id)).filter((s) => !!s);
  const prontas = REPERTORIO_LISTA.filter((s) => hasScore(s.id)).length;
  const back = () => (router.canGoBack() ? router.back() : router.replace('/musicas'));

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: p.bg }]} edges={['left', 'right']}>
      <View style={styles.top}>
        <RoundButton icon="back" size={40} onPress={back} accessibilityLabel="Voltar" />
        <Text style={[t.bold, styles.brand, { color: p.textDim }]}>PERFIL</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.main}>
        {/* Esquerda: avatar e nome */}
        <Animated.View entering={FadeInDown.duration(380)} style={styles.left}>
          <AvatarCircle id={avatar} size={150} />
          <Text style={[t.bold, styles.name, { color: p.text }]} numberOfLines={1} adjustsFontSizeToFit>
            {NOME_USUARIA}
          </Text>
          <Text style={[t.regular, styles.caption, { color: p.textDim }]}>
            {avatarDe(avatar)?.nome ?? 'Sem avatar'} · {REPERTORIO_LISTA.length} músicas no repertório
          </Text>
        </Animated.View>

        {/* Direita: trocar avatar e últimas músicas */}
        <Animated.View entering={FadeIn.duration(500).delay(120)} style={styles.right}>
          <ScrollView contentContainerStyle={styles.rightInner} showsVerticalScrollIndicator={false}>
            <Text style={[t.bold, styles.section, { color: p.textFaint }]}>AVATAR</Text>
            <View style={styles.avatars}>
              {AVATARES.map((a) => {
                const on = a.id === avatar;
                return (
                  <Pressable
                    key={a.id}
                    onPress={() => useSettings.getState().set({ avatar: a.id })}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={a.nome}
                    style={({ pressed }) => [
                      styles.avatarCard,
                      { backgroundColor: on ? withAlpha(p.primary, 0.14) : p.surface, borderColor: on ? p.primary : p.border },
                      pressed && { opacity: 0.8 },
                    ]}>
                    <Image source={a.imagem} style={styles.avatarImage} contentFit="contain" />
                    <Text style={[on ? t.bold : t.regular, styles.avatarName, { color: p.text }]}>{a.nome}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[t.bold, styles.section, { color: p.textFaint }]}>TOCADAS POR ÚLTIMO</Text>
            <View style={[styles.card, { backgroundColor: p.surface, borderColor: p.border }]}>
              {recent.length ? (
                recent.map((s, i) => (
                  <Pressable
                    key={s.id}
                    onPress={() => router.push({ pathname: '/tocar/[songId]', params: { songId: s.id } })}
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.row,
                      i < recent.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: p.border },
                      pressed && { backgroundColor: p.surfaceStrong },
                    ]}>
                    <Text style={[t.bold, styles.number, { color: p.text }]}>{s.number}</Text>
                    <Text style={[t.regular, styles.title, { color: p.text }]} numberOfLines={1}>
                      {s.title}
                    </Text>
                    <Icon name="chevronRight" size={16} color={p.textFaint} />
                  </Pressable>
                ))
              ) : (
                <Text style={[t.regular, styles.empty, { color: p.textDim }]}>
                  {prontas ? 'Nenhuma música tocada ainda.' : 'As músicas aparecem aqui assim que tiverem partitura.'}
                </Text>
              )}
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 28, paddingTop: 12 },
  brand: { fontSize: 11, letterSpacing: 2.4 },
  main: {
    flex: 1,
    flexDirection: 'row',
    gap: 44,
    paddingHorizontal: 40,
    maxWidth: 1020,
    width: '100%',
    alignSelf: 'center',
  },
  left: { width: 250, alignItems: 'center', justifyContent: 'center', gap: 8, paddingBottom: 30 },
  name: { fontSize: 32, marginTop: 10, letterSpacing: -0.4 },
  caption: { fontSize: 13, textAlign: 'center' },
  right: { flex: 1 },
  rightInner: { paddingTop: 16, paddingBottom: 30, gap: 12 },
  section: { fontSize: 10, letterSpacing: 1.6, marginLeft: 4, marginTop: 6 },
  avatars: { flexDirection: 'row', gap: 12 },
  avatarCard: { flex: 1, borderRadius: 18, borderWidth: 1.5, padding: 10, alignItems: 'center', gap: 6 },
  avatarImage: { width: '100%', height: 90 },
  avatarName: { fontSize: 13 },
  card: { borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, height: 46 },
  number: { fontSize: 14, minWidth: 24, textAlign: 'right' },
  title: { fontSize: 14, flex: 1 },
  empty: { fontSize: 13, padding: 16 },
});
