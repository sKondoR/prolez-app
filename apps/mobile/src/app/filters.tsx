import type { Discipline, SpotFilters } from '@prolez/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { bandRangeLabel, gradeBands, pickBand, selectedBands } from '@/features/map/grade-bands';
import { useMapStore } from '@/features/map/map-store';

export default function FiltersScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const stored = useMapStore((s) => s.filters);
  const setFilters = useMapStore((s) => s.setFilters);
  // Черновик: применяется только по кнопке «Показать».
  const [draft, setDraft] = useState<SpotFilters>(stored);
  const update = (patch: Partial<SpotFilters>) => setDraft((d) => ({ ...d, ...patch }));

  const bands = selectedBands(draft);
  const rangeLabel = bandRangeLabel(draft) ?? t('filters.anyGrade');

  return (
    <View style={styles.sheet}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="head" accessibilityRole="header">
          {t('filters.title')}
        </AppText>

        <Section title={t('filters.discipline')}>
          <Segmented
            options={[
              { label: t('filters.any'), selected: !draft.discipline },
              ...(['boulder', 'lead'] as Discipline[]).map((d) => ({
                label: t(`discipline.${d}`),
                selected: draft.discipline === d,
              })),
            ]}
            onSelect={(i) =>
              update({ discipline: i === 0 ? undefined : (['boulder', 'lead'] as const)[i - 1] })
            }
          />
        </Section>

        <Section title={t('filters.grades')} aside={rangeLabel}>
          <View style={styles.grades}>
            {gradeBands.map((band, i) => {
              const on = !!bands && i >= bands.from && i <= bands.to;
              const edge = !!bands && (i === bands.from || i === bands.to);
              return (
                <Pressable
                  key={band.label}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() => update(pickBand(draft, i))}
                  style={[styles.grade, on && (edge ? styles.gradeEdge : styles.gradeIn)]}
                >
                  <AppText
                    variant="grade"
                    style={[styles.gradeText, { color: edge ? Colors.tag : Colors.ink }]}
                  >
                    {band.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
          <AppText variant="label" tone="muted">
            {t('filters.gradesHint')}
          </AppText>
        </Section>

        <Section title={t('filters.needsPad')}>
          <Segmented
            options={[
              { label: t('filters.padAny'), selected: draft.needsPad === undefined },
              { label: t('filters.padNeeded'), selected: draft.needsPad === true },
              { label: t('filters.padNotNeeded'), selected: draft.needsPad === false },
            ]}
            onSelect={(i) => update({ needsPad: [undefined, true, false][i] })}
          />
        </Section>

        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <AppText variant="bodyStrong">{t('filters.dryInRain')}</AppText>
            <AppText variant="label" tone="muted">
              {t('filters.dryInRainHint')}
            </AppText>
          </View>
          <Switch
            accessibilityLabel={t('filters.dryInRain')}
            value={draft.dryInRain === true}
            onValueChange={(v) => update({ dryInRain: v || undefined })}
            trackColor={{ false: Colors.switchOff, true: Colors.ink }}
            thumbColor={Colors.tag}
          />
        </View>
      </ScrollView>

      <View style={[styles.actions, { paddingBottom: Spacing.four + insets.bottom }]}>
        <Button variant="field" label={t('filters.reset')} onPress={() => setDraft({})} />
        <Button
          variant="ink"
          label={t('filters.apply')}
          style={styles.apply}
          onPress={() => {
            setFilters(draft);
            router.back();
          }}
        />
      </View>
    </View>
  );
}

function Section({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <AppText variant="label" tone="muted">
          {title}
        </AppText>
        {aside && <AppText variant="label">{aside}</AppText>}
      </View>
      {children}
    </View>
  );
}

function Segmented({
  options,
  onSelect,
}: {
  options: { label: string; selected: boolean }[];
  onSelect: (index: number) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((o, i) => (
        <Pressable
          key={o.label}
          accessibilityRole="button"
          accessibilityState={{ selected: o.selected }}
          onPress={() => onSelect(i)}
          style={[styles.segment, o.selected && styles.segmentOn]}
        >
          <AppText variant="label" style={[styles.segmentText, o.selected && styles.onInk]}>
            {o.label}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: Colors.tag },
  content: { paddingHorizontal: Spacing.four, paddingTop: Spacing.five, gap: Spacing.five },
  section: { gap: Spacing.two },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between' },
  segmented: { flexDirection: 'row', gap: 6 },
  segment: {
    flex: 1,
    height: 48,
    borderRadius: Radius.tag,
    backgroundColor: Colors.field,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentOn: { backgroundColor: Colors.ink },
  segmentText: { fontSize: 14, lineHeight: 18 },
  onInk: { color: Colors.tag },
  grades: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  grade: {
    // 3 колонки: (ширина − 2 зазора по 6) / 3 ≈ 32% на экране 390.
    width: '32%',
    height: 48,
    borderRadius: Radius.tag,
    backgroundColor: Colors.field,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeIn: { backgroundColor: Colors.accent },
  gradeEdge: { backgroundColor: Colors.ink },
  gradeText: { ...Type.grade, fontSize: 18, lineHeight: 22 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  switchText: { flex: 1, gap: 2 },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    backgroundColor: Colors.tag,
    borderTopWidth: 1,
    borderTopColor: Colors.hairline,
  },
  apply: { flex: 1 },
});
