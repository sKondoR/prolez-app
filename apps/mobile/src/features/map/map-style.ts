import type { Map } from '@maplibre/maplibre-react-native';
import { useQuery } from '@tanstack/react-query';
import type { ComponentProps } from 'react';

import { Colors } from '@/constants/theme';

type MapStyle = ComponentProps<typeof Map>['mapStyle'];
type StyleJson = Exclude<MapStyle, string>;

// OpenFreeMap: бесплатные векторные тайлы OSM без ключа. Свой тайловый сервер — позже (PLAN.md).
// Positron — монохромная подложка без POI; ниже она перекрашивается в бетонную палитру.
// Шрифты стиля: «Noto Sans Regular/Bold/Italic».
export const MAP_STYLE_URL =
  process.env.EXPO_PUBLIC_MAP_STYLE_URL ?? 'https://tiles.openfreemap.org/styles/positron';

export const mapColors = {
  spot: Colors.accent,
  ink: Colors.ink,
  tag: Colors.tag,
  forbidden: Colors.forbidden,
  land: '#F1F2EE',
  block: '#DCDFDA',
  park: '#C6D1C1',
  water: '#9FB2B8',
  waterLabel: '#465A61',
  streetLabel: '#565B58',
} as const;

/** Цвета слоёв Positron по id: светлый бетон, белые улицы, цвет несут только вода и парки. */
const paintOverrides: Record<string, Record<string, unknown>> = {
  background: { 'background-color': mapColors.land },
  park: { 'fill-color': mapColors.park },
  landcover_wood: { 'fill-color': mapColors.park },
  landuse_residential: { 'fill-color': mapColors.land },
  water: { 'fill-color': mapColors.water },
  waterway: { 'line-color': mapColors.water },
  building: { 'fill-color': mapColors.block, 'fill-outline-color': mapColors.block },
  highway_minor: { 'line-color': '#FFFFFF' },
  waterway_line_label: { 'text-color': mapColors.waterLabel },
  water_name_point_label: { 'text-color': mapColors.waterLabel },
  water_name_line_label: { 'text-color': mapColors.waterLabel },
  'highway-name-path': { 'text-color': mapColors.streetLabel },
  'highway-name-minor': { 'text-color': mapColors.streetLabel },
  'highway-name-major': { 'text-color': mapColors.streetLabel },
  label_other: { 'text-color': mapColors.ink },
};

/** UI только на русском: подписи карты берутся из name:ru, а не «латиница + оригинал». */
const russianName = ['coalesce', ['get', 'name:ru'], ['get', 'name:nonlatin'], ['get', 'name']];

export function recolorStyle(style: StyleJson): StyleJson {
  return {
    ...style,
    layers: style.layers.map((layer) => {
      const paint = paintOverrides[layer.id];
      const layout = 'layout' in layer ? (layer.layout as Record<string, unknown>) : undefined;
      const textField = layout?.['text-field'];
      const named = typeof textField !== 'undefined' && JSON.stringify(textField).includes('name');
      return {
        ...layer,
        ...(paint && { paint: { ...('paint' in layer ? layer.paint : {}), ...paint } }),
        ...(named && {
          layout: {
            ...layout,
            'text-field': russianName,
            // Районы — капсом с разрядкой, как подписи на макете карты.
            ...(layer.id === 'label_other' && {
              'text-transform': 'uppercase',
              'text-letter-spacing': 0.1,
              'text-font': ['Noto Sans Bold'],
            }),
          },
        }),
      } as (typeof style.layers)[number];
    }),
  };
}

/**
 * Стиль карты. Если JSON стиля не скачался, отдаём URL: нативный MapLibre возьмёт его из своего кэша.
 */
export function useMapStyle() {
  const query = useQuery({
    queryKey: ['map-style', MAP_STYLE_URL],
    queryFn: async ({ signal }) => {
      const res = await fetch(MAP_STYLE_URL, { signal });
      if (!res.ok) throw new Error(`Map style ${res.status}`);
      return recolorStyle((await res.json()) as StyleJson);
    },
    staleTime: Infinity,
    retry: 1,
  });
  const style: MapStyle | undefined = query.data ?? (query.isError ? MAP_STYLE_URL : undefined);
  return style;
}
