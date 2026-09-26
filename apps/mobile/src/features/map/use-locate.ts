import { type Bbox, bboxContains } from '@prolez/shared';
import * as Location from 'expo-location';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { UserLocationFix } from './spot-map';

const LOCATE_TIMEOUT_MS = 12_000;
/** Позиция не старше минуты годится сразу, без ожидания спутников. */
const LAST_KNOWN_MAX_AGE_MS = 60_000;

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
export function useLocate(notify: (text: string) => void, basemap: Bbox) {
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
      setFix(next);
      setFocus({ lon: next.lon, lat: next.lat, zoom: 15, key: Date.now() });
      // За пределами выбранного региона подложки нет: подсказываем сменить регион.
      if (!bboxContains(basemap, next)) {
        notify(t('map.locate.outside'));
        return;
      }
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
