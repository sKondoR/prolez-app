import type { Map } from '@maplibre/maplibre-react-native';
import type { Bbox } from '@prolez/shared';
import { useQuery } from '@tanstack/react-query';
import { type ComponentProps, useMemo } from 'react';

import { Colors } from '@/constants/theme';

type MapStyle = ComponentProps<typeof Map>['mapStyle'];
type StyleJson = Exclude<MapStyle, string>;

// OpenFreeMap: бесплатные векторные тайлы OSM без ключа. Тайлы кэширует сам MapLibre.
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
  /** За пределами подложки выбранного региона — бетон фона экранов. */
  outside: Colors.ground,
  regionLine: Colors.seam,
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

type Sources = StyleJson['sources'];
type VectorSource = Extract<Sources[string], { type: 'vector' }>;

/**
 * TileJSON источников встраивается в стиль: у встроенного источника работает `bounds`,
 * а стиль целиком лежит в кэше запросов и открывается без сети.
 */
async function inlineTileJson(style: StyleJson, signal: AbortSignal): Promise<StyleJson> {
  const sources: Sources = {};
  const used = new Set(style.layers.map((l) => ('source' in l ? l.source : undefined)));
  for (const [id, source] of Object.entries(style.sources)) {
    // Растровый рельеф Natural Earth в Positron ни одним слоем не используется.
    if (!used.has(id)) continue;
    if (source.type === 'vector' && source.url) {
      const res = await fetch(source.url, { signal });
      if (!res.ok) throw new Error(`TileJSON ${res.status}`);
      const tileJson = (await res.json()) as Pick<
        VectorSource,
        'tiles' | 'minzoom' | 'maxzoom' | 'attribution'
      >;
      sources[id] = {
        type: 'vector',
        tiles: tileJson.tiles,
        minzoom: tileJson.minzoom,
        maxzoom: tileJson.maxzoom,
        attribution: tileJson.attribution,
      };
    } else {
      sources[id] = source;
    }
  }
  return { ...style, sources };
}

/** Весь мир с дыркой по прямоугольнику подложки: за ним — ровный бетон вместо карты. */
function outsideMask([west, south, east, north]: Bbox): GeoJSON.Feature<GeoJSON.Polygon> {
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [-180, -85],
          [180, -85],
          [180, 85],
          [-180, 85],
          [-180, -85],
        ],
        [
          [west, south],
          [west, north],
          [east, north],
          [east, south],
          [west, south],
        ],
      ],
    },
  };
}

/**
 * Подложка только в прямоугольнике выбранного региона: у тайловых источников `bounds`,
 * и MapLibre не запрашивает тайлы за его пределами. Снаружи — маска цвета фона поверх подложки.
 */
export function limitBasemap(style: StyleJson, bbox: Bbox): StyleJson {
  const sources: Sources = { ...style.sources };
  for (const [id, source] of Object.entries(sources)) {
    if (source.type === 'vector' || source.type === 'raster') {
      sources[id] = { ...source, bounds: bbox };
    }
  }
  sources['outside-mask'] = { type: 'geojson', data: outsideMask(bbox) };
  // Маска — поверх всей подложки: тайлы на краю прямоугольника захватывают и соседей,
  // а на мелком масштабе один тайл покрывает полстраны. Слои приложения (контуры регионов,
  // споты) добавляются позже и ложатся поверх маски.
  const layers: StyleJson['layers'] = [
    ...style.layers,
    {
      id: 'outside-mask',
      type: 'fill',
      source: 'outside-mask',
      paint: { 'fill-color': mapColors.outside },
    },
  ];
  return { ...style, sources, layers };
}

/** Первый запуск без сети: стиль ещё не скачан — только фон, контуры регионов и споты. */
const offlineStyle: StyleJson = {
  version: 8,
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  sources: {},
  layers: [{ id: 'background', type: 'background', paint: { 'background-color': mapColors.land } }],
};

/**
 * Стиль карты для выбранного региона. Скачанный стиль хранится в кэше запросов на устройстве;
 * если его нет и сети нет — простой стиль без подложки.
 */
export function useMapStyle(basemap: Bbox): StyleJson | undefined {
  const query = useQuery({
    queryKey: ['map-style', MAP_STYLE_URL],
    queryFn: async ({ signal }) => {
      const res = await fetch(MAP_STYLE_URL, { signal });
      if (!res.ok) throw new Error(`Map style ${res.status}`);
      return recolorStyle(await inlineTileJson((await res.json()) as StyleJson, signal));
    },
    // Адрес тайлов в TileJSON меняется с каждой сборкой OpenFreeMap: раз в сутки обновляем.
    staleTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });
  const style = query.data ?? (query.isError ? offlineStyle : undefined);
  const [west, south, east, north] = basemap;
  return useMemo(
    () => style && limitBasemap(style, [west, south, east, north]),
    [style, west, south, east, north],
  );
}
