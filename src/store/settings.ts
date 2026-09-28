import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Instrument } from '@/content/types';
import type { AvatarId } from '@/features/perfil/avatares';
import type { InputSourceKind } from '@/input/types';
import type { Notation } from '@/music/theory';

export type NoteLabelMode = 'name' | 'finger' | 'none';
/** falling = notas caindo; page = partitura (formato do hinário). */
export type ViewMode = 'falling' | 'page';
/** Fonte do app: Verdana (a da CCB), serifada ou OpenDyslexic (dislexia). */
export type FontChoice = 'verdana' | 'serif' | 'dyslexic';
/** Cores escolhidas pelo usuário no modo colorido. */
export interface ColorChoices {
  accent: string;
  right: string;
  left: string;
  pedal: string;
  hit: string;
  miss: string;
  background: string;
  paper: string;
}

export const DEFAULT_COLORS: ColorChoices = {
  accent: '#D81B60',
  right: '#3FA9F5',
  left: '#A06BFF',
  pedal: '#26A69A',
  hit: '#43C463',
  miss: '#FF5A5F',
  background: '#000000',
  paper: '#FFFFFF',
};

export interface SettingsState {
  notation: Notation;
  noteLabels: NoteLabelMode;
  showKeyLabels: boolean;
  instrument: Instrument;
  inputSource: InputSourceKind;
  /** Volume mínimo que o microfone considera como nota (0.002 .. 0.05). */
  micSensitivity: number;
  /** Latência do microfone (s) para o modo Tocar. */
  micLatency: number;
  /** Velocidade de queda das notas (pixels por segundo). */
  fallSpeed: number;
  volume: number;
  playAccompaniment: boolean;
  metronome: boolean;
  viewMode: ViewMode;
  /** Mostra o teclado na tela junto com a partitura. */
  showKeyboard: boolean;
  /** Tamanho das teclas: grandes (menos teclas) ou pequenas (mais teclas). */
  keySize: 'large' | 'medium' | 'small';
  /** Órgão: dois manuais (superior e inferior) ou um teclado só. */
  organManuals: 'one' | 'two';
  /** Órgão: mostrar a pedaleira. */
  showPedalboard: boolean;
  /** Preto e branco (padrão, com a cor de destaque) ou com cores por mão. */
  colorMode: 'mono' | 'color';
  colors: ColorChoices;
  fontChoice: FontChoice;
  /** Últimas músicas abertas (ids), a mais recente primeiro. */
  recent: string[];
  /** Avatar escolhido na tela de boas-vindas (null = ainda não escolheu). */
  avatar: AvatarId | null;
  /** Já viu os cartões de apresentação (primeira vez que abre o app). */
  onboarded: boolean;
  /** Já fechou o balão com a dica de reconhecimento das notas. */
  tipInputSeen: boolean;
  set: (patch: Partial<Omit<SettingsState, 'set'>>) => void;
}

const DEFAULTS: Omit<SettingsState, 'set'> = {
  notation: 'solfege',
  noteLabels: 'name',
  showKeyLabels: true,
  instrument: 'piano',
  inputSource: 'mic',
  micSensitivity: 0.004,
  micLatency: 0.12,
  fallSpeed: 150,
  volume: 0.8,
  playAccompaniment: true,
  metronome: false,
  viewMode: 'page',
  showKeyboard: true,
  keySize: 'small',
  organManuals: 'two',
  showPedalboard: true,
  colorMode: 'color',
  colors: DEFAULT_COLORS,
  fontChoice: 'serif',
  recent: [],
  avatar: null,
  onboarded: false,
  tipInputSeen: false,
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({ ...DEFAULTS, set: (patch) => set(patch) }),
    {
      name: 'ccb-piano-settings',
      storage: createJSONStorage(() => AsyncStorage),
      version: 7,
      // Mantém as escolhas de quem já usa o app e completa os campos novos.
      // Fonte e destaque que ainda estavam no padrão antigo passam ao padrão
      // novo (serifada e #D81B60). Versões muito antigas voltam aos padrões.
      migrate: (state, version) => {
        if (version < 3) return { ...DEFAULTS } as SettingsState;
        const prev = { ...DEFAULTS, ...(state as Partial<SettingsState>) };
        // Volume e tamanho das teclas agora são fixos (médio e pequenas).
        prev.volume = DEFAULTS.volume;
        prev.keySize = DEFAULTS.keySize;
        // O repertório mudou: os ids dos hinos abertos não existem mais.
        if (version < 7) prev.recent = [];
        if (version < 5) {
          if (prev.fontChoice === 'verdana') prev.fontChoice = 'serif';
          if (prev.colors.accent === '#FF5A1F') prev.colors = { ...prev.colors, accent: DEFAULT_COLORS.accent };
        }
        return prev as SettingsState;
      },
    },
  ),
);
