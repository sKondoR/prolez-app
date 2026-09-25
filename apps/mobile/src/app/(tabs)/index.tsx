import type { SpotFilters } from '@prolez/shared';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { IconButton } from '@/components/button';
import { Chip } from '@/components/chip';
import { Icon } from '@/components/icon';
import { Snackbar, useSnackbar } from '@/components/snackbar';
import { Colors, Radius, Shadow, Spacing } from '@/constants/theme';
import { bandRangeLabel } from '@/features/map/grade-bands';
import { activeFilterCount, useMapStore } from '@/features/map/map-store';
import { SpotMap } from '@/features/map/spot-map';
import { useLocate } from '@/features/map/use-locate';
import {
  canShowZones,
  useExternalPlaces,
  useForbiddenZones,
  useSpots,
} from '@/features/spots/queries';

/** Высота ленты чипов с отступами — под ней начинается компас карты. */
const CHIPS_BAND = 62;

export default function MapScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { bbox, filters, layers, setFilters, setViewport } = useMapStore();

  const spots = useSpots(bbox, filters);
  const zones = useForbiddenZones(bbox, layers.forbidden);
  const external = useExternalPlaces(layers.external);
  const filterCount = activeFilterCount(filters);
  const snackbar = useSnackbar();
  const { locate, locating, fix, focus } = useLocate(snackbar.show);
  const toggle = (patch: Partial<SpotFilters>) => setFilters({ ...filters, ...patch });
  const range = bandRangeLabel(filters);

  return (
    <View style={styles.container}>
      <SpotMap
        spots={spots.data ?? []}
        zones={layers.forbidden && canShowZones(bbox) ? zones.data : undefined}
        externalPlaces={layers.external ? (external.data ?? []) : []}
        topInset={insets.top + CHIPS_BAND}
        userLocation={fix}
        focus={focus}
        onSpotPress={(id) => router.push({ pathname: '/spot/[id]', params: { id } })}
        onExternalPress={(place) =>
          Alert.alert(
            place.name,
            [t(`external.${place.kind}`), place.description].filter(Boolean).join('\n'),
            place.url
              ? [
                  { text: t('external.open'), onPress: () => Linking.openURL(place.url!) },
                  { text: 'OK', style: 'cancel' },
                ]
              : undefined,
          )
        }
        onViewportChange={setViewport}
      />

      <SafeAreaView style={styles.top} pointerEvents="box-none" edges={['top']}>
        {/* Лента обрезается краем экрана: видно, что фильтров больше. */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          accessibilityLabel={t('map.filters')}
        >
          <Chip
            onMap
            icon="sliders"
            label={t('map.filters')}
            badge={filterCount}
            onPress={() => router.push('/filters')}
          />
          <Chip
            onMap
            label={t('discipline.boulder')}
            selected={filters.discipline === 'boulder'}
            onPress={() =>
              toggle({ discipline: filters.discipline === 'boulder' ? undefined : 'boulder' })
            }
          />
          {range && <Chip onMap selected label={range} onPress={() => router.push('/filters')} />}
          <Chip
            onMap
            icon="umbrella"
            label={t('filters.dryInRain')}
            selected={filters.dryInRain === true}
            onPress={() => toggle({ dryInRain: filters.dryInRain ? undefined : true })}
          />
          <Chip
            onMap
            label={t('map.noPad')}
            selected={filters.needsPad === false}
            onPress={() => toggle({ needsPad: filters.needsPad === false ? undefined : false })}
          />
        </ScrollView>

        {layers.forbidden && !canShowZones(bbox) && (
          <View style={styles.pill}>
            <View style={styles.zoneKey} />
            <AppText variant="label" tone="onInk">
              {t('map.zoomInForZones')}
            </AppText>
          </View>
        )}

        {spots.isError && (
          <Pressable
            accessibilityRole="button"
            onPress={() => spots.refetch()}
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

      {/* Кнопки по правому краю, над нижней навигацией: центр карты свободен. */}
      <View style={styles.fabs} pointerEvents="box-none">
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
      </View>

      <Snackbar message={snackbar.message} bottom={Spacing.four} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.ground },
  top: { position: 'absolute', top: 0, left: 0, right: 0 },
  chips: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    // Место под тень чипов, иначе ScrollView её обрежет.
    paddingBottom: Spacing.four - Spacing.half,
  },
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 36,
    marginHorizontal: Spacing.three,
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
  fabs: { position: 'absolute', right: Spacing.three, bottom: Spacing.six, gap: Spacing.two },
});
