import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/app-text';
import { Colors, Radius, Spacing } from '@/constants/theme';

import type { SpotMapProps } from './spot-map';

// MapLibre React Native не работает в браузере. Веб-сборка нужна только для разработки,
// поэтому вместо карты — список спотов, чтобы проверять API и карточку спота.
export function SpotMap({ spots, onSpotPress }: SpotMapProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <AppText variant="small" tone="muted" style={styles.notice}>
        {t('map.webFallback')}
      </AppText>
      <FlatList
        data={spots}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable onPress={() => onSpotPress(item.id)} style={styles.row}>
            <View style={styles.rowText}>
              <AppText variant="bodyStrong">{item.name}</AppText>
              <AppText variant="label" tone="muted">
                {item.gradeMin
                  ? t('spot.problems', { count: item.problemCount })
                  : t('spot.noProblems')}
              </AppText>
            </View>
            {item.gradeMin && (
              <AppText variant="grade" style={styles.range}>
                {item.gradeMin === item.gradeMax
                  ? item.gradeMin
                  : `${item.gradeMin}–${item.gradeMax}`}
              </AppText>
            )}
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 120, backgroundColor: Colors.ground },
  notice: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.two },
  list: { padding: Spacing.four, gap: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: 14,
    borderRadius: Radius.tag,
    backgroundColor: Colors.tag,
  },
  rowText: { flex: 1, gap: 2 },
  range: { fontSize: 22, lineHeight: 26 },
});
