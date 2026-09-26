import { DEFAULT_REGION_CODE } from '@prolez/shared';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { kvStorage } from '@/lib/storage';

/**
 * Автоопределение региона по геопозиции:
 * - `pending` — ещё не удалось (нет сети, геопозиции) — пробуем при следующем запуске;
 * - `done` — определили, пользователь отказал в геопозиции или выбрал регион сам.
 */
export type RegionDetection = 'pending' | 'done';

interface RegionState {
  /** Выбранный регион: пока не определён — регион по умолчанию (СПб). */
  code: string;
  detection: RegionDetection;
  /** Смена `key` переводит камеру на выбранный регион. */
  focusKey: number;
  /** Регион, выбранный пользователем, — автоопределение больше не вмешивается. */
  chooseRegion: (code: string) => void;
  /** Результат автоопределения; не перебивает ручной выбор. */
  detectedRegion: (code: string | null, detection: RegionDetection) => void;
}

export const useRegionStore = create<RegionState>()(
  persist(
    (set, get) => ({
      code: DEFAULT_REGION_CODE,
      detection: 'pending',
      focusKey: 0,
      chooseRegion: (code) => set({ code, detection: 'done', focusKey: get().focusKey + 1 }),
      detectedRegion: (code, detection) => {
        if (get().detection === 'done') return;
        if (code && code !== get().code) {
          set({ code, detection, focusKey: get().focusKey + 1 });
        } else {
          set({ detection });
        }
      },
    }),
    {
      name: 'region',
      storage: createJSONStorage(() => kvStorage),
      partialize: ({ code, detection }) => ({ code, detection }),
    },
  ),
);
