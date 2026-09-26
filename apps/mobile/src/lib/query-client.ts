import NetInfo from '@react-native-community/netinfo';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { type Query, QueryClient, onlineManager } from '@tanstack/react-query';
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client';

import { kvStorage } from './storage';

const DAY = 24 * 60 * 60 * 1000;
/** Сколько живёт сохранённый кэш: отключения интернета бывают днями. */
const PERSIST_MAX_AGE = 30 * DAY;

// Сеть — по данным телефона, а не по событиям браузера (их в React Native нет).
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => setOnline(state.isConnected !== false)),
);

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        retry: 2,
        // gcTime не меньше срока хранения, иначе запрос уйдёт из кэша раньше, чем его сохранят.
        gcTime: PERSIST_MAX_AGE,
        // Запрос пробуется даже без сети: ответ может прийти из кэша, а ошибка не прячет кэш.
        networkMode: 'offlineFirst',
      },
    },
  });
}

/**
 * Сохраняются только запросы, нужные без сети. Споты по bbox (другие регионы) не сохраняются:
 * их много, а без подложки они офлайн всё равно бесполезны.
 */
const PERSISTED_KEYS = new Set([
  'map-style',
  'regions',
  'region-spots',
  'spot',
  'forbidden-zones',
  'external-places',
]);

const shouldPersist = (query: Query) =>
  query.state.status === 'success' && PERSISTED_KEYS.has(String(query.queryKey[0]));

export const persistOptions: Omit<PersistQueryClientOptions, 'queryClient'> = {
  persister: createSyncStoragePersister({
    storage: kvStorage,
    key: 'query-cache',
    // Кэш сериализуется целиком: при частых сдвигах карты пишем не чаще раза в пару секунд.
    throttleTime: 2_000,
  }),
  maxAge: PERSIST_MAX_AGE,
  // Смена формата данных — новая строка, и старый кэш не восстанавливается.
  buster: 'regions-v1',
  dehydrateOptions: { shouldDehydrateQuery: shouldPersist },
};
