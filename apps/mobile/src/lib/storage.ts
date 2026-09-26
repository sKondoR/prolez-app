import { createMMKV } from 'react-native-mmkv';
import type { StateStorage } from 'zustand/middleware';

/**
 * Локальное хранилище: кэш запросов и настройки переживают перезапуск, поэтому карта,
 * споты и выбранный регион доступны без сети.
 */
export const storage = createMMKV({ id: 'prolez' });

/** Синхронный адаптер для zustand/persist и persister TanStack Query. */
export const kvStorage: StateStorage & {
  getItem: (key: string) => string | null;
} = {
  getItem: (key) => storage.getString(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => {
    storage.remove(key);
  },
};
