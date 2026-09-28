import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { getSong } from '@/content';
import { PracticePlayer } from '@/features/player/PracticePlayer';
import { usePartituras } from '@/store/partituras';
import { usePalette, useType } from '@/theme';

/** Abre a música direto na tela de tocar (os ajustes ficam no painel do player). */
export default function PlayHymnScreen() {
  const { songId } = useLocalSearchParams<{ songId: string }>();
  // Partitura salva no aparelho (chega depois que o armazenamento carrega).
  const saved = usePartituras((s) => s.scores[songId]);
  const song = getSong(songId, saved);
  const pal = usePalette();
  const type = useType();

  const exit = () => (router.canGoBack() ? router.back() : router.replace('/musicas'));
  if (!song) {
    return (
      <View style={{ flex: 1, backgroundColor: pal.bg, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <Text style={[type.regular, { color: pal.text }]}>Esta música ainda não tem partitura.</Text>
        <Pressable onPress={exit} accessibilityRole="button">
          <Text style={[type.bold, { color: pal.primary }]}>Voltar à lista</Text>
        </Pressable>
      </View>
    );
  }
  return <PracticePlayer key={song.id} song={song} onExit={exit} />;
}
