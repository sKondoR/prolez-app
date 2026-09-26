import {
  type SpotDetail,
  regionLocateSchema,
  regionSummarySchema,
  spotDetailSchema,
} from '@prolez/shared';
import { type QueryClient, useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { apiGet } from '@/lib/api';

/** Число спотов по регионам — для счётчиков на карте и списка регионов. */
export function useRegionCounts() {
  return useQuery({
    queryKey: ['regions'],
    queryFn: async ({ signal }) => {
      const list = await apiGet('/regions', z.array(regionSummarySchema), {}, signal);
      return Object.fromEntries(list.map((r) => [r.code, r.spotCount])) as Record<string, number>;
    },
    staleTime: 60 * 60 * 1000,
  });
}

/**
 * Все споты выбранного региона полными карточками. Запрос сохраняется в кэше на устройстве,
 * поэтому споты, проблемы и разметка открываются без сети.
 */
export function useRegionSpots(code: string) {
  return useQuery({
    queryKey: ['region-spots', code],
    queryFn: ({ signal }) =>
      apiGet(`/regions/${code}/spots`, z.array(spotDetailSchema), {}, signal),
    staleTime: 10 * 60 * 1000,
  });
}

/** Карточка спота из выгрузки региона — чтобы экран спота открывался офлайн. */
export function findCachedSpot(client: QueryClient, id: string) {
  for (const query of client.getQueryCache().findAll({ queryKey: ['region-spots'] })) {
    const spot = (query.state.data as SpotDetail[] | undefined)?.find((s) => s.id === id);
    if (spot) return { spot, updatedAt: query.state.dataUpdatedAt };
  }
  return undefined;
}

export function locateRegion(lon: number, lat: number) {
  return apiGet('/regions/locate', regionLocateSchema, { lon, lat });
}
