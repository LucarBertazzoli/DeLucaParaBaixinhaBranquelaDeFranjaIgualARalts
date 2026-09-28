import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { REPERTORIO, type RepertoireSong } from '@/content/repertorio';
import { hasScore } from '@/content/songs';
import { describe, importScores } from '@/features/partituras/importar';
import { AvatarBadge } from '@/features/perfil/AvatarBadge';
import { RoundButton } from '@/features/player/controls';
import { AppearanceSettings } from '@/features/settings/AppearanceSettings';
import { usePartituras } from '@/store/partituras';
import { useSettings } from '@/store/settings';
import { usePalette, useType } from '@/theme';
import { withAlpha } from '@/theme/color';

/**
 * Lista de músicas: os grupos à esquerda (tocar pula até o grupo) e, à
 * direita, todas as músicas com o nome de cada grupo por cima. Partituras
 * entram pelo botão "Importar" (várias de uma vez) ou tocando numa música
 * ainda sem partitura; ficam guardadas só no aparelho.
 */

// Numeração contínua, na ordem da lista.
let counter = 0;
const GRUPOS = REPERTORIO.map((g) => ({ ...g, songs: g.songs.map((s) => ({ ...s, number: ++counter })) }));
const TOTAL = counter;

function open(id: string) {
  const { recent, set } = useSettings.getState();
  set({ recent: [id, ...recent.filter((r) => r !== id)].slice(0, 6) });
  router.push({ pathname: '/tocar/[songId]', params: { songId: id } });
}

export default function Musicas() {
  const p = usePalette();
  const t = useType();
  const [look, setLook] = useState(false);
  const [active, setActive] = useState(GRUPOS[0].id);
  const [notice, setNotice] = useState<string | null>(null);
  // Partituras do aparelho: a lista muda quando uma entra ou sai.
  const saved = usePartituras((s) => s.scores);
  const prontas = GRUPOS.reduce((n, g) => n + g.songs.filter((s) => hasScore(s.id, saved)).length, 0);

  const runImport = async (songId?: string) => {
    try {
      const r = await importScores(songId);
      if (r) setNotice(describe(r));
    } catch (e) {
      setNotice(`Não deu para abrir o arquivo: ${e instanceof Error ? e.message : String(e)}`);
    }
  };
  const list = useRef<ScrollView>(null);
  const offsets = useRef<Record<string, number>>({});

  const jump = (id: string) => {
    setActive(id);
    list.current?.scrollTo({ y: Math.max(0, (offsets.current[id] ?? 0) - 4), animated: true });
  };

  // Marca na coluna da esquerda o grupo que está no alto da lista.
  const onScroll = (y: number) => {
    let current = GRUPOS[0].id;
    for (const g of GRUPOS) if ((offsets.current[g.id] ?? Infinity) <= y + 24) current = g.id;
    if (current !== active) setActive(current);
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: p.bg }]} edges={['left', 'right']}>
      <View style={styles.top}>
        <AvatarBadge size={34} withName />
        <Text style={[t.bold, styles.brand, { color: p.textDim }]}>REPERTÓRIO</Text>
        <View style={styles.topActions}>
          <Pressable
            onPress={() => runImport()}
            accessibilityRole="button"
            accessibilityLabel="Importar partituras (MusicXML)"
            style={({ pressed }) => [styles.importButton, { borderColor: p.border, backgroundColor: p.surface }, pressed && { opacity: 0.75 }]}>
            <Icon name="plus" size={16} color={p.text} />
            <Text style={[t.bold, styles.importText, { color: p.text }]}>Importar</Text>
          </Pressable>
          <RoundButton icon="contrast" size={38} onPress={() => setLook(true)} accessibilityLabel="Aparência: fonte e cores" />
        </View>
      </View>

      <View style={styles.main}>
        {/* Esquerda: grupos */}
        <Animated.View entering={FadeInDown.duration(380)} style={styles.left}>
          <Text style={[t.regular, styles.heading, { color: p.text }]}>O que vamos tocar?</Text>
          <Text style={[t.regular, styles.sub, { color: p.textFaint }]}>
            {TOTAL} músicas{prontas < TOTAL ? ` · ${prontas} com partitura` : ''}
          </Text>
          <ScrollView style={styles.nav} showsVerticalScrollIndicator={false}>
            {GRUPOS.map((g) => {
              const on = g.id === active;
              return (
                <Pressable
                  key={g.id}
                  onPress={() => jump(g.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  style={({ pressed }) => [styles.navItem, on && { backgroundColor: p.surfaceStrong }, pressed && { opacity: 0.7 }]}>
                  <View style={[styles.navMark, { backgroundColor: on ? p.primary : 'transparent' }]} />
                  <Text style={[on ? t.bold : t.regular, styles.navLabel, { color: on ? p.text : p.textDim }]} numberOfLines={1}>
                    {g.label}
                  </Text>
                  <Text style={[t.regular, styles.navCount, { color: p.textFaint }]}>{g.songs.length}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* Direita: a lista */}
        <Animated.View entering={FadeIn.duration(500).delay(120)} style={styles.right}>
          <ScrollView
            ref={list}
            showsVerticalScrollIndicator={false}
            onScroll={(e) => onScroll(e.nativeEvent.contentOffset.y)}
            scrollEventThrottle={32}
            contentContainerStyle={styles.listInner}>
            {GRUPOS.map((g) => (
              <View key={g.id} onLayout={(e) => (offsets.current[g.id] = e.nativeEvent.layout.y)} style={styles.group}>
                <View style={styles.groupHeader}>
                  <Text style={[t.bold, styles.groupTitle, { color: p.text }]}>{g.label}</Text>
                  <View style={[styles.groupRule, { backgroundColor: p.border }]} />
                </View>
                <View style={[styles.card, { backgroundColor: p.surface, borderColor: p.border }]}>
                  {g.songs.map((s, i) => (
                    <SongRow key={s.id} song={s} ready={hasScore(s.id, saved)} last={i === g.songs.length - 1} onImport={() => runImport(s.id)} />
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
        </Animated.View>
      </View>

      {notice ? (
        <Animated.View entering={FadeInDown.duration(200)} style={[styles.notice, { backgroundColor: p.surfaceStrong, borderColor: p.border }]}>
          <Text style={[t.regular, styles.noticeText, { color: p.text }]}>{notice}</Text>
          <Pressable onPress={() => setNotice(null)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Fechar aviso">
            <Icon name="close" size={16} color={p.textDim} />
          </Pressable>
        </Animated.View>
      ) : null}

      {look ? (
        <Animated.View entering={FadeIn.duration(160)} style={[StyleSheet.absoluteFill, styles.sheet, { backgroundColor: withAlpha(p.bg, 0.96) }]}>
          <View style={styles.sheetHeader}>
            <Text style={[t.bold, styles.sheetTitle, { color: p.text }]}>Aparência</Text>
            <RoundButton icon="close" size={40} onPress={() => setLook(false)} accessibilityLabel="Fechar" />
          </View>
          <ScrollView contentContainerStyle={styles.sheetBody} showsVerticalScrollIndicator={false}>
            <AppearanceSettings />
          </ScrollView>
        </Animated.View>
      ) : null}
    </SafeAreaView>
  );
}

function SongRow({
  song,
  ready,
  last,
  onImport,
}: {
  song: RepertoireSong & { number: number };
  ready: boolean;
  last: boolean;
  onImport: () => void;
}) {
  const p = usePalette();
  const t = useType();
  return (
    <Pressable
      onPress={() => (ready ? open(song.id) : onImport())}
      accessibilityRole="button"
      accessibilityLabel={`${song.title}${song.artist ? `, ${song.artist}` : ''}${ready ? '' : ', sem partitura: toque para importar'}`}
      style={({ pressed }) => [
        styles.row,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: p.border },
        pressed && { backgroundColor: p.surfaceStrong },
      ]}>
      <Text style={[t.bold, styles.number, { color: ready ? p.text : p.textFaint }]}>{song.number}</Text>
      <View style={styles.rowText}>
        <Text style={[t.regular, styles.title, { color: ready ? p.text : p.textDim }]} numberOfLines={1}>
          {song.title}
        </Text>
        {song.artist ? (
          <Text style={[t.regular, styles.artist, { color: p.textFaint }]} numberOfLines={1}>
            {song.artist}
          </Text>
        ) : null}
      </View>
      {ready ? (
        <View style={[styles.play, { backgroundColor: p.primary }]}>
          <Icon name="play" size={13} color={p.primaryText} />
        </View>
      ) : (
        <Text style={[t.regular, styles.missing, { color: p.textFaint, borderColor: p.border }]}>+ partitura</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingTop: 12,
    paddingBottom: 4,
  },
  brand: { fontSize: 11, letterSpacing: 2.4 },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  importButton: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, borderRadius: 19, borderWidth: 1, paddingHorizontal: 14 },
  importText: { fontSize: 13 },
  notice: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    maxWidth: 620,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  noticeText: { fontSize: 13, flexShrink: 1 },
  main: {
    flex: 1,
    flexDirection: 'row',
    gap: 36,
    paddingHorizontal: 40,
    maxWidth: 1020,
    width: '100%',
    alignSelf: 'center',
  },
  left: { width: 230, paddingTop: 14, paddingBottom: 20 },
  heading: { fontSize: 26, letterSpacing: -0.3 },
  sub: { fontSize: 12, marginTop: 4, marginBottom: 14, marginLeft: 2 },
  nav: { flex: 1 },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 36, borderRadius: 12, paddingRight: 12 },
  navMark: { width: 3, height: 16, borderRadius: 2, marginLeft: 6 },
  navLabel: { fontSize: 14, flex: 1 },
  navCount: { fontSize: 11 },
  right: { flex: 1 },
  listInner: { paddingTop: 14, paddingBottom: 40, gap: 22 },
  group: { gap: 10 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4 },
  groupTitle: { fontSize: 13, letterSpacing: 0.4 },
  groupRule: { flex: 1, height: StyleSheet.hairlineWidth },
  card: { borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, minHeight: 54, paddingVertical: 8 },
  number: { fontSize: 14, minWidth: 24, textAlign: 'right' },
  rowText: { flex: 1, gap: 2 },
  title: { fontSize: 15 },
  artist: { fontSize: 12 },
  play: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  missing: { fontSize: 11, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, overflow: 'hidden' },
  sheet: { paddingHorizontal: 28, paddingTop: 16 },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    maxWidth: 860,
    width: '100%',
    alignSelf: 'center',
  },
  sheetTitle: { fontSize: 20 },
  sheetBody: { paddingBottom: 28, maxWidth: 860, width: '100%', alignSelf: 'center' },
});
