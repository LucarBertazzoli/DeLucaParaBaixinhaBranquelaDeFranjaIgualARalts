import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';

import { musicXmlToScore } from '@/content/musicxml';
import { matchSong, repertoireSong } from '@/content/repertorio';
import { usePartituras } from '@/store/partituras';

export interface ImportResult {
  imported: string[];
  failed: { name: string; reason: string }[];
}

async function readText(asset: DocumentPicker.DocumentPickerAsset): Promise<string> {
  if (Platform.OS === 'web' && asset.file) return asset.file.text();
  const { File } = await import('expo-file-system');
  return new File(asset.uri).text();
}

/**
 * Abre o seletor de arquivos e importa partituras MusicXML para o aparelho.
 * Com `songId`, o arquivo vai para aquela música; sem, cada arquivo é
 * reconhecido pelo nome (ou pelo título dentro dele).
 */
export async function importScores(songId?: string): Promise<ImportResult | null> {
  const picked = await DocumentPicker.getDocumentAsync({ multiple: !songId, type: '*/*', copyToCacheDirectory: true });
  if (picked.canceled) return null;
  const result: ImportResult = { imported: [], failed: [] };
  for (const asset of picked.assets) {
    try {
      if (/\.mxl$/i.test(asset.name)) throw new Error('arquivo compactado (.mxl): exporte como .musicxml');
      const score = musicXmlToScore(await readText(asset));
      const song = songId ? repertoireSong(songId) : matchSong(asset.name, score.title);
      if (!song) throw new Error('não é de nenhuma música da lista');
      usePartituras.getState().add(song.id, score);
      result.imported.push(song.title);
    } catch (e) {
      result.failed.push({ name: asset.name, reason: e instanceof Error ? e.message : String(e) });
    }
  }
  return result;
}

/** Resumo em uma frase para mostrar na tela. */
export function describe(r: ImportResult): string {
  const ok = r.imported.length;
  const parts: string[] = [];
  if (ok) parts.push(ok === 1 ? `“${r.imported[0]}” importada.` : `${ok} partituras importadas.`);
  for (const f of r.failed) parts.push(`${f.name}: ${f.reason}.`);
  return parts.join(' ') || 'Nenhum arquivo escolhido.';
}
