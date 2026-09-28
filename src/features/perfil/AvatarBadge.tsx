import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useSettings } from '@/store/settings';
import { usePalette, useType } from '@/theme';

import { avatarDe, type AvatarId } from './avatares';
import { NOME_USUARIA } from './usuaria';

/** Só a imagem do avatar num círculo. */
export function AvatarCircle({ id, size }: { id: AvatarId | null; size: number }) {
  const p = usePalette();
  const avatar = avatarDe(id);
  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: p.surface, borderColor: p.border },
      ]}>
      {avatar ? (
        <Image source={avatar.imagem} style={{ width: size * 0.84, height: size * 0.84 }} contentFit="contain" />
      ) : null}
    </View>
  );
}

/**
 * O avatar que acompanha a usuária pelo app. Tocar nele abre o perfil.
 * `withName` mostra o nome ao lado (na lista de músicas).
 */
export function AvatarBadge({ size = 40, withName = false }: { size?: number; withName?: boolean }) {
  const p = usePalette();
  const t = useType();
  const avatar = useSettings((s) => s.avatar);
  return (
    <Pressable
      onPress={() => router.push('/perfil')}
      accessibilityRole="button"
      accessibilityLabel={`Perfil de ${NOME_USUARIA}`}
      hitSlop={6}
      style={({ pressed }) => [styles.badge, withName && { borderColor: p.border, backgroundColor: p.surface }, pressed && { opacity: 0.75 }]}>
      <AvatarCircle id={avatar} size={size} />
      {withName ? <Text style={[t.bold, styles.name, { color: p.text }]}>{NOME_USUARIA}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, overflow: 'hidden' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 999, borderWidth: 1, borderColor: 'transparent', paddingRight: 4 },
  name: { fontSize: 14, paddingRight: 10 },
});
