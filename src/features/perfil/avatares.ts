import type { ImageSource } from 'expo-image';

/** Avatares que ela pode escolher (troque as imagens em assets/avatars/). */
export type AvatarId = 'ralts' | 'eevee' | 'piplup';

export const AVATARES: { id: AvatarId; nome: string; imagem: ImageSource }[] = [
  { id: 'ralts', nome: 'Ralts', imagem: require('../../../assets/avatars/ralts.png') },
  { id: 'eevee', nome: 'Eevee', imagem: require('../../../assets/avatars/eevee.png') },
  { id: 'piplup', nome: 'Piplup', imagem: require('../../../assets/avatars/piplup.png') },
];

export function avatarDe(id: AvatarId | null | undefined) {
  return AVATARES.find((a) => a.id === id);
}
