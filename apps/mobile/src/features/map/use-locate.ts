import * as Location from 'expo-location';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { UserLocationFix } from './spot-map';

/** Границы карты (как maxBounds камеры): за ними нам нечего показать. */
const MAP_BOUNDS = { west: 28.9, south: 59.4, east: 31.4, north: 61.2 };
const LOCATE_TIMEOUT_MS = 12_000;
/** Позиция не старше минуты годится сразу, без ожидания спутников. */
const LAST_KNOWN_MAX_AGE_MS = 60_000;

const inBounds = ({ lon, lat }: { lon: number; lat: number }) =>
  lon >= MAP_BOUNDS.west &&
  lon <= MAP_BOUNDS.east &&
  lat >= MAP_BOUNDS.south &&
  lat <= MAP_BOUNDS.north;

function withTimeout<T>(promise: Promise<T>, ms: number) {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

/**
 * «Моё место». Геопозиция в СПб подавляется и подменяется, поэтому она только показывает,
 * где вы на карте, и никогда ничего не проверяет. Каждый результат сопровождается сообщением.
 */
export function useLocate(notify: (text: string) => void) {
  const { t } = useTranslation();
  const [locating, setLocating] = useState(false);
  const [fix, setFix] = useState<UserLocationFix>();
  const [focus, setFocus] = useState<{ lon: number; lat: number; zoom: number; key: number }>();

  async function locate() {
    if (locating) return;
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        notify(t('map.locate.denied'));
        return;
      }
      if (!(await Location.hasServicesEnabledAsync())) {
        notify(t('map.locate.servicesOff'));
        return;
      }
      const position =
        (await Location.getLastKnownPositionAsync({ maxAge: LAST_KNOWN_MAX_AGE_MS })) ??
        (await withTimeout(
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          LOCATE_TIMEOUT_MS,
        ));
      const next = {
        lon: position.coords.longitude,
        lat: position.coords.latitude,
        accuracy: position.coords.accuracy,
      };
      if (!inBounds(next)) {
        notify(t('map.locate.outside'));
        return;
      }
      setFix(next);
      setFocus({ lon: next.lon, lat: next.lat, zoom: 15, key: Date.now() });
      notify(
        next.accuracy
          ? t('map.locate.found', { meters: Math.round(next.accuracy) })
          : t('map.locate.foundNoAccuracy'),
      );
    } catch {
      notify(t('map.locate.failed'));
    } finally {
      setLocating(false);
    }
  }

  return { locate, locating, fix, focus };
}
