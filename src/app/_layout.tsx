import { SourceSerif4_400Regular } from '@expo-google-fonts/source-serif-4/400Regular';
import { SourceSerif4_700Bold } from '@expo-google-fonts/source-serif-4/700Bold';
import { useFonts } from 'expo-font';
import * as ScreenOrientation from 'expo-screen-orientation';
import { DarkTheme, ThemeProvider, usePathname } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { synth } from '@/audio/synth';
import { RotateGate } from '@/components/RotateGate';
import { Onboarding } from '@/features/onboarding/Onboarding';
import { useSettings } from '@/store/settings';

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: '#000000', card: '#000000', text: '#FFFFFF', border: '#1A1A1A', primary: '#FFFFFF' },
};

// Substituta da Verdana no Android (ver `font` em src/theme).
const ANDROID_SANS = {
  DejaVuSans: require('../../assets/fonts/DejaVuSans.ttf'),
  'DejaVuSans-Bold': require('../../assets/fonts/DejaVuSans-Bold.ttf'),
};

export default function RootLayout() {
  const instrument = useSettings((s) => s.instrument);
  const volume = useSettings((s) => s.volume);
  const onboarded = useSettings((s) => s.onboarded);
  // Os cartões de apresentação aparecem depois das boas-vindas, na lista.
  const pathname = usePathname();
  // Espera ler os ajustes salvos antes de decidir mostrar a apresentação.
  const hydrated = useSyncExternalStore(
    (cb) => useSettings.persist.onFinishHydration(cb),
    () => useSettings.persist.hasHydrated(),
    () => false,
  );
  const background = useSettings((s) => (s.colorMode === 'color' ? s.colors.background : '#000000'));

  // Fontes opcionais (serifada e OpenDyslexic). Verdana vem do sistema, então
  // o app não espera o carregamento: até lá o texto usa a fonte padrão.
  useFonts({
    SourceSerif4_400Regular,
    SourceSerif4_700Bold,
    OpenDyslexic: require('../../assets/fonts/OpenDyslexic-Regular.ttf'),
    'OpenDyslexic-Bold': require('../../assets/fonts/OpenDyslexic-Bold.ttf'),
    ...(Platform.OS === 'android' ? ANDROID_SANS : {}),
  });

  // O app funciona na horizontal (paisagem).
  useEffect(() => {
    if (Platform.OS !== 'web') {
      void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
    }
  }, []);

  useEffect(() => {
    synth.setInstrument(instrument);
    synth.setVolume(volume);
  }, [instrument, volume]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={theme}>
          <StatusBar style="light" hidden />
          <Stack screenOptions={{ headerShown: false, orientation: 'landscape', contentStyle: { backgroundColor: background }, animation: 'fade' }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="musicas" />
            <Stack.Screen name="perfil" />
            <Stack.Screen name="tocar/[songId]" options={{ gestureEnabled: false }} />
          </Stack>
          {hydrated && !onboarded && pathname === '/musicas' ? <Onboarding /> : null}
          <RotateGate />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
