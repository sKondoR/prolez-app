import '@/i18n';

import { Onest_400Regular } from '@expo-google-fonts/onest/400Regular';
import { Onest_500Medium } from '@expo-google-fonts/onest/500Medium';
import { Onest_600SemiBold } from '@expo-google-fonts/onest/600SemiBold';
import { Onest_700Bold } from '@expo-google-fonts/onest/700Bold';
import { SairaStencilOne_400Regular } from '@expo-google-fonts/saira-stencil-one/400Regular';
import { Unbounded_700Bold } from '@expo-google-fonts/unbounded/700Bold';
import { Unbounded_800ExtraBold } from '@expo-google-fonts/unbounded/800ExtraBold';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { Colors, Radius } from '@/constants/theme';
import { createQueryClient, persistOptions } from '@/lib/query-client';

void SplashScreen.preventAutoHideAsync();

// Тема только светлая: бетон и графит — это и есть бренд, тёмной подложки карты нет.
const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.ink,
    background: Colors.ground,
    card: Colors.tag,
    text: Colors.ink,
    border: Colors.hairline,
  },
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Unbounded_700Bold,
    Unbounded_800ExtraBold,
    Onest_400Regular,
    Onest_500Medium,
    Onest_600SemiBold,
    Onest_700Bold,
    SairaStencilOne_400Regular,
  });
  const [queryClient] = useState(createQueryClient);
  // Шрифты лежат в бандле; если загрузка всё же упала, показываем интерфейс системным шрифтом.
  const ready = fontsLoaded || fontError !== null;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      <ThemeProvider value={navigationTheme}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ contentStyle: { backgroundColor: Colors.ground } }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          {/* Спот — полноэкранный: фото стены с разметкой занимает весь верх. */}
          <Stack.Screen name="spot/[id]" options={{ headerShown: false }} />
          <Stack.Screen
            name="filters"
            options={{
              presentation: 'formSheet',
              sheetAllowedDetents: [0.85],
              sheetGrabberVisible: true,
              sheetCornerRadius: Radius.sheet,
              headerShown: false,
              contentStyle: { backgroundColor: Colors.tag },
            }}
          />
          <Stack.Screen
            name="regions"
            options={{
              presentation: 'formSheet',
              sheetAllowedDetents: [0.85],
              sheetGrabberVisible: true,
              sheetCornerRadius: Radius.sheet,
              headerShown: false,
              contentStyle: { backgroundColor: Colors.tag },
            }}
          />
          <Stack.Screen
            name="layers"
            options={{
              presentation: 'formSheet',
              sheetAllowedDetents: 'fitToContents',
              sheetGrabberVisible: true,
              sheetCornerRadius: Radius.sheet,
              headerShown: false,
              contentStyle: { backgroundColor: Colors.tag },
            }}
          />
        </Stack>
      </ThemeProvider>
    </PersistQueryClientProvider>
  );
}
