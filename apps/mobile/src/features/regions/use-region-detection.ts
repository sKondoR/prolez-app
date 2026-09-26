import * as Location from 'expo-location';
import { useEffect } from 'react';

import { locateRegion } from './queries';
import { useRegionStore } from './region-store';

const POSITION_TIMEOUT_MS = 10_000;
/** Для определения региона годится и старая позиция: регион за час не меняется. */
const LAST_KNOWN_MAX_AGE_MS = 60 * 60 * 1000;

function withTimeout<T>(promise: Promise<T>, ms: number) {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

/**
 * Стартовый регион по положению пользователя. Геопозиция — только мягкий сигнал: регион
 * лишь предлагается, пользователь его меняет. Без разрешения регион остаётся по умолчанию;
 * без сети или позиции попытка повторится при следующем запуске.
 */
export function useRegionDetection() {
  const pending = useRegionStore((s) => s.detection === 'pending');
  const detectedRegion = useRegionStore((s) => s.detectedRegion);

  useEffect(() => {
    if (!pending) return;
    let cancelled = false;

    (async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') return detectedRegion(null, 'done');
      const position =
        (await Location.getLastKnownPositionAsync({ maxAge: LAST_KNOWN_MAX_AGE_MS })) ??
        (await withTimeout(
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }),
          POSITION_TIMEOUT_MS,
        ));
      const { code } = await locateRegion(position.coords.longitude, position.coords.latitude);
      if (!cancelled) detectedRegion(code, 'done');
    })().catch(() => {
      // Нет сети или геопозиции: регион по умолчанию, повтор при следующем запуске.
    });

    return () => {
      cancelled = true;
    };
  }, [pending, detectedRegion]);
}
