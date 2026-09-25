import {
  Camera,
  type CameraRef,
  GeoJSONSource,
  type GeoJSONSourceRef,
  Layer,
  Map,
} from '@maplibre/maplibre-react-native';
import type { Bbox, ExternalPlace, SpotSummary } from '@prolez/shared';
import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/theme';

import { installMapLogHandler } from './map-logs';
import { mapColors, useMapStyle } from './map-style';
import { SPB_CENTER } from './map-store';

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
}

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
}: SpotMapProps) {
  const mapStyle = useMapStyle();
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
      <Camera
        ref={camera}
        initialViewState={{ center: SPB_CENTER, zoom: 10 }}
        maxBounds={[28.9, 59.4, 31.4, 61.2]}
      />

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
