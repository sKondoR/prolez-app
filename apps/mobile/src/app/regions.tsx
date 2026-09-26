import { type RegionMeta, regions } from '@prolez/shared';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Icon } from '@/components/icon';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { useRegionCounts } from '@/features/regions/queries';
import { useRegionStore } from '@/features/regions/region-store';

const normalize = (text: string) => text.toLocaleLowerCase('ru').replaceAll('ё', 'е');

type Row = { kind: 'region'; region: RegionMeta; count: number } | { kind: 'empty-header' };

/** Регионы со спотами — сверху по числу спотов, пустые — ниже по алфавиту. */
function buildRows(counts: Record<string, number>, query: string): Row[] {
  const q = normalize(query.trim());
  const matched = regions
    .filter((r) => !q || normalize(r.name).includes(q))
    .map((region) => ({ kind: 'region' as const, region, count: counts[region.code] ?? 0 }));
  const withSpots = matched.filter((r) => r.count > 0).sort((a, b) => b.count - a.count);
  const empty = matched.filter((r) => r.count === 0);
  return [
    ...withSpots,
    ...(empty.length > 0 && withSpots.length > 0 ? [{ kind: 'empty-header' as const }] : []),
    ...empty,
  ];
}

export default function RegionsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const current = useRegionStore((s) => s.code);
  const chooseRegion = useRegionStore((s) => s.chooseRegion);
  const counts = useRegionCounts();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const rows = useMemo(() => buildRows(counts.data ?? {}, query), [counts.data, query]);

  return (
    <View style={styles.sheet}>
      <View style={styles.header}>
        <AppText variant="head" accessibilityRole="header">
          {t('regions.title')}
        </AppText>
        <AppText variant="small" tone="muted">
          {t('regions.hint')}
        </AppText>
        <View style={[styles.field, focused && styles.fieldFocused]}>
          <Icon name="search" size={18} color={Colors.ink2} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={t('regions.search')}
            placeholderTextColor={Colors.ink2}
            cursorColor={Colors.ink}
            selectionColor={Colors.accent}
            accessibilityLabel={t('regions.search')}
            style={styles.input}
          />
        </View>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(row) => (row.kind === 'region' ? row.region.code : row.kind)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.five }}
        ListEmptyComponent={
          <AppText variant="small" tone="muted" style={styles.empty}>
            {t('regions.notFound')}
          </AppText>
        }
        renderItem={({ item }) => {
          if (item.kind === 'empty-header') {
            return (
              <AppText variant="label" tone="muted" style={styles.groupLabel}>
                {t('regions.noSpots')}
              </AppText>
            );
          }
          const selected = item.region.code === current;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => {
                chooseRegion(item.region.code);
                router.back();
              }}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <View style={styles.rowText}>
                <AppText variant="bodyStrong">{item.region.name}</AppText>
                {/* У пустых регионов подпись одна — заголовок группы. */}
                {item.count > 0 && (
                  <AppText variant="label" tone="muted">
                    {t('regions.spots', { count: item.count })}
                  </AppText>
                )}
              </View>
              {selected && (
                <View style={styles.current}>
                  <Icon name="check" size={14} color={Colors.ink} />
                  <AppText variant="label">{t('regions.current')}</AppText>
                </View>
              )}
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: Colors.tag },
  header: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.three,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    height: 52,
    marginTop: Spacing.two,
    paddingHorizontal: 14,
    borderRadius: Radius.tag,
    backgroundColor: Colors.field,
    borderWidth: 2.5,
    borderColor: 'transparent',
  },
  fieldFocused: { borderColor: Colors.ink },
  input: { flex: 1, fontFamily: Fonts.text, fontSize: 16, color: Colors.ink, padding: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 64,
    paddingHorizontal: Spacing.four,
    borderTopWidth: 1,
    borderTopColor: Colors.hairline,
  },
  pressed: { backgroundColor: Colors.field },
  rowText: { flex: 1, gap: 2, paddingVertical: Spacing.two },
  current: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 28,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.small,
    backgroundColor: Colors.accent,
  },
  groupLabel: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.two,
    textTransform: 'uppercase',
  },
  empty: { paddingHorizontal: Spacing.four, paddingTop: Spacing.three },
});
