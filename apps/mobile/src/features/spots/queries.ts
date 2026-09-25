import {
  type Bbox,
  type SpotFilters,
  externalPlaceSchema,
  spotDetailSchema,
  spotSummarySchema,
} from '@prolez/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { apiGet } from '@/lib/api';

/** Сервер отдаёт слой запретных зон только для bbox не больше 0,25° (см. apps/api map-layers). */
const MAX_ZONE_BBOX_DEGREES = 0.25;

const zonesSchema = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(z.custom<GeoJSON.Feature>()),
});

export function useSpots(bbox: Bbox, filters: SpotFilters) {
  return useQuery({
    queryKey: ['spots', bbox, filters],
    queryFn: ({ signal }) =>
      apiGet('/spots', z.array(spotSummarySchema), { bbox: bbox.join(','), ...filters }, signal),
    // При сдвиге карты старые точки остаются на экране, пока грузятся новые.
    placeholderData: keepPreviousData,
  });
}

export function useSpot(id: string) {
  return useQuery({
    queryKey: ['spot', id],
    queryFn: ({ signal }) => apiGet(`/spots/${id}`, spotDetailSchema, {}, signal),
  });
}

export function canShowZones([w, s, e, n]: Bbox) {
  return e - w <= MAX_ZONE_BBOX_DEGREES && n - s <= MAX_ZONE_BBOX_DEGREES;
}

export function useForbiddenZones(bbox: Bbox, enabled: boolean) {
  return useQuery({
    queryKey: ['forbidden-zones', bbox],
    queryFn: ({ signal }) =>
      apiGet('/forbidden-zones', zonesSchema, { bbox: bbox.join(',') }, signal),
    enabled: enabled && canShowZones(bbox),
    placeholderData: keepPreviousData,
    staleTime: 24 * 60 * 60 * 1000,
  });
}

export function useExternalPlaces(enabled: boolean) {
  return useQuery({
    queryKey: ['external-places'],
    queryFn: ({ signal }) => apiGet('/external-places', z.array(externalPlaceSchema), {}, signal),
    enabled,
    staleTime: 24 * 60 * 60 * 1000,
  });
}
