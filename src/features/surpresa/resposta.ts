import { Platform } from 'react-native';

import { useSettings } from '@/store/settings';

/**
 * A resposta da pergunta fica no servidor (api/resposta.js), para valer em
 * qualquer aparelho e aparecer na página secreta. Só existe no site (web).
 */

const URL = '/api/resposta';

export interface Resposta {
  configurado: boolean;
  topou: boolean;
  em: string | null;
  erro?: string;
}

export async function lerResposta(): Promise<Resposta> {
  const res = await fetch(URL, { cache: 'no-store' });
  const data = (await res.json()) as Resposta;
  return data;
}

/** Envia o "Sim". Até o servidor confirmar, fica pendente e é reenviado. */
export async function enviarResposta(): Promise<boolean> {
  if (Platform.OS !== 'web') return false;
  try {
    const res = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"topou":true}' });
    const data = (await res.json()) as Resposta;
    if (res.ok && data.topou) {
      useSettings.getState().set({ respostaPendente: false });
      return true;
    }
  } catch {
    // Sem internet ou servidor fora: tenta de novo na próxima abertura.
  }
  return false;
}

/**
 * Ao abrir o app: reenvia um "Sim" pendente; e, se ela já topou (em qualquer
 * aparelho), a pergunta não aparece mais aqui.
 */
export async function sincronizarResposta(): Promise<void> {
  if (Platform.OS !== 'web') return;
  const { respostaPendente, perguntaVista, set } = useSettings.getState();
  if (respostaPendente) {
    await enviarResposta();
    return;
  }
  if (perguntaVista) return;
  try {
    const r = await lerResposta();
    if (r.topou) set({ perguntaVista: true });
  } catch {
    // Sem servidor: vale só o que está salvo no aparelho.
  }
}
