import {
  Camera,
  type CameraRef,
  GeoJSONSource,
  type GeoJSONSourceRef,
  Layer,
  Map,
} from '@maplibre/maplibre-react-native';
import {
  type Bbox,
  type ExternalPlace,
  type SpotSummary,
  bboxContains,
  regions,
} from '@prolez/shared';
import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/theme';
import regionShapes from '@/features/regions/region-shapes.json';

import { installMapLogHandler } from './map-logs';
import { mapColors, useMapStyle } from './map-style';

installMapLogHandler();

export interface SpotMapProps {
  spots: SpotSummary[];
  zones: GeoJSON.FeatureCollection | undefined;
  externalPlaces: ExternalPlace[];
  onSpotPress: (spotId: string) => void;
  onExternalPress: (place: ExternalPlace) => void;
  onViewportChange: (bbox: Bbox, zoom: number) => void;
  /** Отступ сверху под плавающие чипы: туда уходит компас. */
  topInset?: number;
  /** Где пользователь по данным телефона — только мягкий сигнал, точность бывает плохой. */
  userLocation?: UserLocationFix;
  /** Новый `key` плавно переводит камеру в точку. */
  focus?: { lon: number; lat: number; zoom: number; key: number };
  /** Выбранный регион: его прямоугольник, прямоугольник подложки и `key` для перелёта камеры. */
  region: { code: string; bbox: Bbox; basemap: Bbox; key: number };
  /** Число спотов по регионам: счётчики на мелком масштабе. */
  regionCounts: Record<string, number>;
  /** Тап по другому региону на простом фоне. */
  onRegionPress: (code: string) => void;
}

/** Счётчики и названия регионов видны, пока карта мельче города. */
const REGION_LABEL_MAX_ZOOM = 8;
const REGION_PADDING = { top: 120, right: 24, bottom: 120, left: 24 };

export interface UserLocationFix {
  lon: number;
  lat: number;
  /** Радиус точности в метрах. */
  accuracy: number | null;
}

const point = (lon: number, lat: number): GeoJSON.Point => ({
  type: 'Point',
  coordinates: [lon, lat],
});

export function SpotMap({
  spots,
  zones,
  externalPlaces,
  onSpotPress,
  onExternalPress,
  onViewportChange,
  topInset = 0,
  userLocation,
  focus,
  region,
  regionCounts,
  onRegionPress,
}: SpotMapProps) {
  const mapStyle = useMapStyle(region.basemap);
  const camera = useRef<CameraRef>(null);
  const spotSource = useRef<GeoJSONSourceRef>(null);

  const spotFeatures = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: spots.map((s) => ({
        type: 'Feature',
        id: s.id,
        geometry: point(s.location.lon, s.location.lat),
        properties: { id: s.id, dryInRain: s.dryInRain },
      })),
    }),
    [spots],
  );

  const externalFeatures = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: externalPlaces.map((p) => ({
        type: 'Feature',
        id: p.id,
        geometry: point(p.location.lon, p.location.lat),
        properties: { id: p.id, kind: p.kind, name: p.name },
      })),
    }),
    [externalPlaces],
  );

  const regionLabels = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: regions.map((r) => ({
        type: 'Feature',
        id: r.code,
        geometry: point(r.label[0], r.label[1]),
        properties: {
          code: r.code,
          name: r.name,
          spotCount: regionCounts[r.code] ?? 0,
          selected: r.code === region.code,
          // На подложке регионы подписывает сама карта — своя подпись только на пустом фоне.
          onBasemap: bboxContains(region.basemap, { lon: r.label[0], lat: r.label[1] }),
        },
      })),
    }),
    [regionCounts, region.code, region.basemap],
  );

  // Регион сменился — камера переводится на его прямоугольник.
  const { bbox: regionBbox, key: regionKey } = region;
  useEffect(() => {
    if (regionKey === 0) return;
    camera.current?.fitBounds(regionBbox, { padding: REGION_PADDING, duration: 800 });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- перелёт только по смене key
  }, [regionKey]);

  useEffect(() => {
    if (!focus) return;
    camera.current?.easeTo({ center: [focus.lon, focus.lat], zoom: focus.zoom, duration: 600 });
  }, [focus]);

  const userFeature = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: userLocation
        ? [
            {
              type: 'Feature',
              geometry: point(userLocation.lon, userLocation.lat),
              properties: {},
            },
          ]
        : [],
    }),
    [userLocation],
  );

  // Пока стиль грузится, держим фон карты, чтобы не мигать белым.
  if (!mapStyle) return <View style={styles.placeholder} />;

  return (
    <Map
      style={styles.map}
      mapStyle={mapStyle}
      compass
      compassPosition={{ top: topInset, right: 12 }}
      attributionPosition={{ bottom: 8, left: 8 }}
      logo={false}
      onRegionDidChange={({ nativeEvent }) =>
        onViewportChange(nativeEvent.bounds, nativeEvent.zoom)
      }
    >
      {/* Без maxBounds: карта непрерывная, но подложка грузится только в регионе (map-style). */}
      <Camera ref={camera} initialViewState={{ bounds: region.bbox, padding: REGION_PADDING }} />

      {/* Контуры регионов из бандла: ориентир на бетонном фоне за пределами подложки. */}
      <GeoJSONSource
        id="regions"
        data={regionShapes as GeoJSON.FeatureCollection}
        onPress={(event) => {
          const code = event.nativeEvent.features[0]?.properties?.code;
          if (typeof code === 'string' && code !== region.code) onRegionPress(code);
        }}
      >
        {/* Почти прозрачная заливка ловит тапы по региону. */}
        <Layer
          type="fill"
          id="region-hit"
          paint={{ 'fill-color': mapColors.ink, 'fill-opacity': 0.01 }}
        />
        <Layer
          type="line"
          id="region-outline"
          paint={{
            'line-color': mapColors.regionLine,
            'line-width': 1,
            // Контуры упрощены для бандла: на городском масштабе они спорили бы с подложкой.
            'line-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0.6, 9, 0],
          }}
        />
      </GeoJSONSource>

      <GeoJSONSource id="region-labels" data={regionLabels}>
        <Layer
          type="symbol"
          id="region-name"
          maxzoom={REGION_LABEL_MAX_ZOOM}
          filter={['!', ['get', 'onBasemap']]}
          layout={{
            'text-field': ['get', 'name'],
            'text-font': ['Noto Sans Bold'],
            'text-size': 11,
            'text-transform': 'uppercase',
            'text-letter-spacing': 0.08,
            'text-max-width': 8,
            'text-offset': [0, 1.6],
            'text-anchor': 'top',
          }}
          paint={{
            'text-color': mapColors.ink,
            'text-opacity': 0.7,
            'text-halo-color': mapColors.outside,
            'text-halo-width': 1.5,
          }}
        />
        <Layer
          type="circle"
          id="region-count-dot"
          maxzoom={REGION_LABEL_MAX_ZOOM}
          filter={['all', ['>', ['get', 'spotCount'], 0], ['!', ['get', 'selected']]]}
          paint={{
            'circle-radius': 15,
            'circle-color': mapColors.ink,
            'circle-stroke-color': mapColors.spot,
            'circle-stroke-width': 2,
          }}
        />
        <Layer
          type="symbol"
          id="region-count"
          maxzoom={REGION_LABEL_MAX_ZOOM}
          filter={['all', ['>', ['get', 'spotCount'], 0], ['!', ['get', 'selected']]]}
          layout={{
            'text-field': ['to-string', ['get', 'spotCount']],
            'text-font': ['Noto Sans Bold'],
            'text-size': 12,
            'text-allow-overlap': true,
          }}
          paint={{ 'text-color': mapColors.tag }}
        />
      </GeoJSONSource>

      {zones && (
        <GeoJSONSource id="forbidden-zones" data={zones}>
          <Layer
            type="fill"
            id="forbidden-fill"
            paint={{ 'fill-color': mapColors.forbidden, 'fill-opacity': 0.18 }}
          />
          <Layer
            type="line"
            id="forbidden-outline"
            paint={{
              'line-color': mapColors.forbidden,
              'line-width': 1.5,
              'line-dasharray': [3, 2.5],
            }}
          />
        </GeoJSONSource>
      )}

      {/* «Вы здесь» — графитовая точка с бледным ореолом: не спутать с лаймовыми спотами. */}
      <GeoJSONSource id="user-location" data={userFeature}>
        <Layer
          type="circle"
          id="user-halo"
          paint={{ 'circle-radius': 20, 'circle-color': mapColors.ink, 'circle-opacity': 0.14 }}
        />
        <Layer
          type="circle"
          id="user-dot"
          paint={{
            'circle-radius': 7,
            'circle-color': mapColors.ink,
            'circle-stroke-color': mapColors.tag,
            'circle-stroke-width': 3,
          }}
        />
      </GeoJSONSource>

      <GeoJSONSource
        id="external-places"
        data={externalFeatures}
        onPress={(event) => {
          event.stopPropagation();
          const id = event.nativeEvent.features[0]?.properties?.id;
          const place = externalPlaces.find((p) => p.id === id);
          if (place) onExternalPress(place);
        }}
      >
        <Layer
          type="circle"
          id="external-circle"
          paint={{
            'circle-radius': 10,
            'circle-color': mapColors.ink,
            'circle-stroke-color': mapColors.tag,
            'circle-stroke-width': 2,
          }}
        />
        <Layer
          type="symbol"
          id="external-label"
          minzoom={13}
          layout={{
            'text-field': ['get', 'name'],
            'text-font': ['Noto Sans Bold'],
            'text-size': 11,
            'text-offset': [0, 1.5],
            'text-anchor': 'top',
            'text-max-width': 9,
          }}
          paint={{
            'text-color': mapColors.ink,
            'text-halo-color': mapColors.land,
            'text-halo-width': 1.5,
          }}
        />
      </GeoJSONSource>

      <GeoJSONSource
        id="spots"
        ref={spotSource}
        data={spotFeatures}
        cluster
        clusterRadius={40}
        clusterMaxZoom={14}
        onPress={async (event) => {
          event.stopPropagation();
          const feature = event.nativeEvent.features[0];
          if (!feature) return;
          const props = feature.properties ?? {};
          if (props.cluster && feature.geometry.type === 'Point') {
            const zoom = await spotSource.current?.getClusterExpansionZoom(props.cluster_id);
            const [lon, lat] = feature.geometry.coordinates;
            camera.current?.easeTo({ center: [lon!, lat!], zoom: zoom ?? 14, duration: 400 });
          } else if (typeof props.id === 'string') {
            onSpotPress(props.id);
          }
        }}
      >
        <Layer
          type="circle"
          id="spot-clusters"
          filter={['has', 'point_count']}
          paint={{
            'circle-color': mapColors.ink,
            'circle-radius': ['step', ['get', 'point_count'], 17, 10, 20, 30, 24],
          }}
        />
        <Layer
          type="symbol"
          id="spot-cluster-count"
          filter={['has', 'point_count']}
          layout={{
            'text-field': ['get', 'point_count_abbreviated'],
            'text-size': 13,
            'text-font': ['Noto Sans Bold'],
          }}
          paint={{ 'text-color': mapColors.tag }}
        />
        {/* Метка спота — лаймовая краска с графитовым крестом, как отметка баллончиком. */}
        <Layer
          type="circle"
          id="spot-halo"
          filter={['!', ['has', 'point_count']]}
          paint={{ 'circle-radius': 16, 'circle-color': mapColors.spot, 'circle-opacity': 0.32 }}
        />
        <Layer
          type="circle"
          id="spot-point"
          filter={['!', ['has', 'point_count']]}
          paint={{
            'circle-radius': 12,
            'circle-color': mapColors.spot,
            'circle-stroke-color': mapColors.ink,
            'circle-stroke-width': 1.5,
          }}
        />
        <Layer
          type="symbol"
          id="spot-cross"
          filter={['!', ['has', 'point_count']]}
          layout={{
            'text-field': '×',
            'text-font': ['Noto Sans Bold'],
            'text-size': 20,
            'text-allow-overlap': true,
            'text-ignore-placement': true,
          }}
          paint={{ 'text-color': mapColors.ink }}
        />
      </GeoJSONSource>
    </Map>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
  placeholder: { flex: 1, backgroundColor: Colors.ground },
});
