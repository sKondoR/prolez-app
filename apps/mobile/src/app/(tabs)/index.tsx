import {
  DEFAULT_REGION_CODE,
  basemapBbox,
  bboxContains,
  bboxIntersects,
  bboxWithin,
  crags,
  findRegion,
  spotMatchesFilters,
} from '@prolez/shared';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Animated, BackHandler, Linking, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { IconButton } from '@/components/button';
import { Chip } from '@/components/chip';
import { Icon } from '@/components/icon';
import { Snackbar, useSnackbar } from '@/components/snackbar';
import { Colors, Radius, Shadow, Spacing } from '@/constants/theme';
import type { SheetMode } from '@/features/map/map-sheet';
import { activeFilterCount, useMapStore } from '@/features/map/map-store';
import { type MapSpot, bboxCenter, nearestSpot, spotsInView } from '@/features/map/spot-list';
import { SpotMap, type SpotMapProps } from '@/features/map/spot-map';
import { SpotSheet } from '@/features/map/spot-sheet';
import { useLocate } from '@/features/map/use-locate';
import { useRegionCounts, useRegionSpots } from '@/features/regions/queries';
import { useRegionStore } from '@/features/regions/region-store';
import { useRegionDetection } from '@/features/regions/use-region-detection';
import {
  canShowZones,
  useExternalPlaces,
  useForbiddenZones,
  useSpots,
} from '@/features/spots/queries';
import { useOnline } from '@/lib/use-online';

/** Высота ленты чипов с отступами — под ней начинается компас карты. */
const CHIPS_BAND = 62;
/** Мельче этого масштаба другие регионы показывают только счётчик спотов. */
const OTHER_REGION_SPOTS_MIN_ZOOM = 8;
/** Развёрнутый список занимает эту долю экрана карты: сверху остаётся видна карта. */
const LIST_SHARE = 0.62;
/** Масштаб, к которому карта приближает спот, выбранный в списке. */
const SPOT_FOCUS_ZOOM = 15;
/** Высота превью до первого замера: по ней карта выводит метку из-под шторки. */
const PEEK_FALLBACK = 200;

export default function MapScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { bbox, zoom, filters, layers, resetFilters, setViewport } = useMapStore();
  const { code: regionCode, focusKey, chooseRegion } = useRegionStore();
  useRegionDetection();
  const online = useOnline();

  const region = findRegion(regionCode) ?? findRegion(DEFAULT_REGION_CODE)!;
  const basemap = basemapBbox(region.code) ?? region.bbox;
  const inBasemap = bboxIntersects(bbox, basemap);

  // Споты выбранного региона — целиком из выгрузки (есть и офлайн), фильтры — на клиенте.
  // За пределами подложки — запрос по видимой области, только онлайн.
  const regionSpots = useRegionSpots(region.code);
  const showOtherSpots = zoom >= OTHER_REGION_SPOTS_MIN_ZOOM && !bboxWithin(bbox, basemap);
  const otherSpots = useSpots(bbox, filters, showOtherSpots);
  const spots = useMemo(() => {
    const byId = new Map<string, MapSpot>();
    // Выключенный запрос держит прошлые точки (keepPreviousData) — их не показываем.
    for (const s of showOtherSpots ? (otherSpots.data ?? []) : []) byId.set(s.id, s);
    for (const s of regionSpots.data ?? []) {
      if (spotMatchesFilters(s, filters)) byId.set(s.id, s);
    }
    return [...byId.values()];
  }, [regionSpots.data, otherSpots.data, showOtherSpots, filters]);

  const zonesVisible = layers.forbidden && canShowZones(bbox) && inBasemap;
  const zones = useForbiddenZones(bbox, zonesVisible);
  const external = useExternalPlaces(layers.external);
  // Скальные районы — константа из shared (есть и без сети), скалодромы — с сервера.
  const externalPlaces = useMemo(
    () =>
      layers.external ? [...(external.data ?? []).filter((p) => p.kind !== 'crag'), ...crags] : [],
    [layers.external, external.data],
  );
  const counts = useRegionCounts();
  const filterCount = activeFilterCount(filters);
  const snackbar = useSnackbar();
  const { locate, locating, fix, focus } = useLocate(snackbar.show, basemap);

  // Шторка: свёрнута — счётчик, превью — выбранный спот, список — споты в кадре.
  const [sheetMode, setSheetMode] = useState<SheetMode>('collapsed');
  const [selectedId, setSelectedId] = useState<string>();
  const [screenHeight, setScreenHeight] = useState(0);
  const [sheetVisible] = useState(() => new Animated.Value(0));
  const [sheetRest, setSheetRest] = useState({ collapsed: 0, peek: 0, current: 0 });
  const [spotFocus, setSpotFocus] = useState<SpotMapProps['focus']>();

  const inView = useMemo(() => spotsInView(spots, bbox), [spots, bbox]);
  const selected = spots.find((s) => s.id === selectedId);
  // Выбранный спот пропал с карты (фильтры, смена региона) — выбор снимается.
  if (selectedId && !selected && regionSpots.data) setSelectedId(undefined);
  const hiddenByFilters = useMemo(
    () =>
      (regionSpots.data ?? []).filter(
        (s) => bboxContains(bbox, s.location) && !spotMatchesFilters(s, filters),
      ).length,
    [regionSpots.data, bbox, filters],
  );
  const nearest = inView.length === 0 ? nearestSpot(spots, bboxCenter(bbox)) : undefined;
  const expandedHeight = Math.round(screenHeight * LIST_SHARE);
  const peekClearance = (sheetRest.peek || PEEK_FALLBACK) + Spacing.four;

  const changeSheet = useCallback((mode: SheetMode) => {
    setSheetMode(mode);
    if (mode === 'collapsed') setSelectedId(undefined);
  }, []);
  const selectSpot = (spot: MapSpot) => {
    setSelectedId(spot.id);
    setSheetMode('peek');
    setSpotFocus({
      lon: spot.location.lon,
      lat: spot.location.lat,
      zoom: Math.max(zoom, SPOT_FOCUS_ZOOM),
      key: Date.now(),
      padding: { top: 0, right: 0, left: 0, bottom: peekClearance },
    });
  };
  // Камеру ведёт последнее событие: «Моё место» или выбор спота в списке.
  const cameraFocus = !spotFocus || (focus && focus.key > spotFocus.key) ? focus : spotFocus;

  // Системное «Назад» сначала сворачивает шторку: список → превью → свёрнута.
  useFocusEffect(
    useCallback(() => {
      if (sheetMode === 'collapsed' && !selectedId) return;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        changeSheet(sheetMode === 'list' && selectedId ? 'peek' : 'collapsed');
        return true;
      });
      return () => sub.remove();
    }, [sheetMode, selectedId, changeSheet]),
  );

  return (
    <View style={styles.container} onLayout={(e) => setScreenHeight(e.nativeEvent.layout.height)}>
      <SpotMap
        spots={spots}
        zones={zonesVisible ? zones.data : undefined}
        externalPlaces={externalPlaces}
        topInset={insets.top + CHIPS_BAND}
        userLocation={fix}
        focus={cameraFocus}
        selectedId={selected?.id}
        bottomInset={sheetRest.collapsed}
        peekClearance={peekClearance}
        onSpotPress={(id) => {
          setSelectedId(id);
          setSheetMode('peek');
        }}
        onMapPress={() => {
          if (sheetMode !== 'collapsed' || selectedId) changeSheet('collapsed');
        }}
        onExternalPress={(place) =>
          Alert.alert(
            place.name,
            [t(`external.${place.kind}`), place.description].filter(Boolean).join('\n'),
            // Без своих кнопок Alert подставляет английское «OK».
            [
              ...(place.url
                ? [{ text: t('external.open'), onPress: () => Linking.openURL(place.url!) }]
                : []),
              { text: t('external.close'), style: 'cancel' },
            ],
          )
        }
        onViewportChange={setViewport}
        region={{ code: region.code, bbox: region.bbox, basemap, key: focusKey }}
        regionCounts={counts.data ?? {}}
        onRegionPress={(code) => {
          const next = findRegion(code);
          if (!next) return;
          Alert.alert(t('regions.switchTitle', { name: next.name }), t('regions.switchBody'), [
            { text: t('regions.cancel'), style: 'cancel' },
            { text: t('regions.switch'), onPress: () => chooseRegion(code) },
          ]);
        }}
      />

      <SafeAreaView style={styles.top} pointerEvents="box-none" edges={['top']}>
        {/* Два чипа помещаются и на 360 dp: остальные фильтры — на экране фильтров. */}
        <View style={styles.chips}>
          <Chip
            onMap
            shrink
            icon="map"
            label={region.name}
            onPress={() => router.push('/regions')}
          />
          <Chip
            onMap
            icon="sliders"
            label={t('map.filters')}
            badge={filterCount}
            onPress={() => router.push('/filters')}
          />
        </View>

        {!online && (
          <View style={styles.pill}>
            <Icon name="wifi-off" size={14} color={Colors.tag} />
            <AppText variant="label" tone="onInk">
              {t('map.offline')}
            </AppText>
          </View>
        )}

        {layers.forbidden && inBasemap && !canShowZones(bbox) && (
          <View style={styles.pill}>
            <View style={styles.zoneKey} />
            <AppText variant="label" tone="onInk">
              {t('map.zoomInForZones')}
            </AppText>
          </View>
        )}

        {online && regionSpots.isError && !regionSpots.data && (
          <Pressable
            accessibilityRole="button"
            onPress={() => regionSpots.refetch()}
            style={[styles.pill, styles.errorPill]}
          >
            <AppText variant="label" tone="onInk" style={styles.pillText}>
              {t('map.loadError')}
            </AppText>
            <View style={styles.retry}>
              <Icon name="rotate-cw" size={14} color={Colors.ink} />
              <AppText variant="label">{t('map.retry')}</AppText>
            </View>
          </Pressable>
        )}
      </SafeAreaView>

      {/* Кнопки по правому краю едут над шторкой и прячутся, когда список развёрнут. */}
      <Animated.View
        style={[
          styles.fabs,
          {
            opacity: sheetVisible.interpolate({
              inputRange: [expandedHeight * 0.6, Math.max(expandedHeight * 0.85, 1)],
              outputRange: [1, 0],
              extrapolate: 'clamp',
            }),
            transform: [{ translateY: Animated.multiply(sheetVisible, -1) }],
          },
        ]}
        pointerEvents={sheetMode === 'list' ? 'none' : 'box-none'}
      >
        <IconButton
          icon="layers"
          label={t('layers.title')}
          onPress={() => router.push('/layers')}
          style={Shadow.float}
        />
        <IconButton
          icon="crosshair"
          label={t('map.locate.label')}
          selected={locating}
          onPress={locate}
          style={Shadow.float}
        />
      </Animated.View>

      {expandedHeight > 0 && (
        <SpotSheet
          mode={sheetMode}
          expandedHeight={expandedHeight}
          visible={sheetVisible}
          spots={inView}
          selected={selected}
          userLocation={fix}
          hiddenByFilters={hiddenByFilters}
          nearest={nearest}
          onModeChange={changeSheet}
          onRest={(mode, height) =>
            setSheetRest((prev) =>
              prev.current === height && (mode === 'list' || prev[mode] === height)
                ? prev
                : { ...prev, current: height, ...(mode !== 'list' && { [mode]: height }) },
            )
          }
          onSelect={selectSpot}
          onOpen={(spot) => router.push({ pathname: '/spot/[id]', params: { id: spot.id } })}
          onResetFilters={resetFilters}
        />
      )}

      <Snackbar message={snackbar.message} bottom={sheetRest.current + Spacing.three} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.ground },
  top: { position: 'absolute', top: 0, left: 0, right: 0 },
  chips: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.four - Spacing.half,
  },
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 36,
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.tag,
    backgroundColor: Colors.ink,
    ...Shadow.chip,
  },
  zoneKey: {
    width: 12,
    height: 12,
    borderRadius: 2,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.forbidden,
    backgroundColor: 'rgba(255, 61, 168, 0.3)',
  },
  errorPill: { alignSelf: 'stretch', minHeight: 48, paddingVertical: 6, paddingRight: 6 },
  pillText: { flex: 1 },
  retry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.small,
    backgroundColor: Colors.accent,
  },
  fabs: { position: 'absolute', right: Spacing.four, bottom: Spacing.three, gap: Spacing.two },
});
