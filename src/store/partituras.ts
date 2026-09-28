import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { ScoreFile } from '@/content/partituras/types';

/**
 * Partituras importadas no próprio aparelho (botão "Importar" da lista).
 * Ficam só aqui: não vão para o código do app nem para o site publicado.
 */
export interface PartiturasState {
  scores: Record<string, ScoreFile>;
  add: (id: string, score: ScoreFile) => void;
  remove: (id: string) => void;
}

export const usePartituras = create<PartiturasState>()(
  persist(
    (set) => ({
      scores: {},
      add: (id, score) => set((s) => ({ scores: { ...s.scores, [id]: score } })),
      remove: (id) =>
        set((s) => {
          const { [id]: _, ...rest } = s.scores;
          return { scores: rest };
        }),
    }),
    {
      name: 'repertorio-partituras',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      partialize: (s) => ({ scores: s.scores }),
    },
  ),
);
