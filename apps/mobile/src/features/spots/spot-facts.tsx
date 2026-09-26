import type { SpotDetail } from '@prolez/shared';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Icon } from '@/components/icon';
import { Colors, Radius, Spacing } from '@/constants/theme';

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

interface Fact {
  label: string;
  value: string;
  /** Предупреждение — лаймовая точка у значения (например, нужен краш-пад). */
  warn?: boolean;
  /** Отсутствие удобства — значение приглушено. */
  off?: boolean;
}

/** Название спота, под ним диапазон категорий, сетка атрибутов 2×2 и последний визит. */
export function SpotFacts({ spot }: { spot: SpotDetail }) {
  const { t } = useTranslation();

  const surface = t(`spot.surface.${spot.surface}`);
  const disciplines = spot.disciplines.map((d) => t(`discipline.${d}`)).join(' · ');
  const facts: Fact[] = (
    [
      { label: t('spot.fact.object'), value: t(`spot.objectType.${spot.objectType}`) },
      spot.heightM !== null
        ? { label: t('spot.fact.height'), value: t('spot.height', { value: spot.heightM }) }
        : null,
      {
        label: t('spot.fact.underfoot'),
        value: capitalize(t(spot.needsPad ? 'spot.padNeeded' : 'spot.padOptional', { surface })),
        warn: spot.needsPad,
      },
      {
        label: t('spot.fact.evening'),
        value: t(spot.lighting ? 'spot.lighting' : 'spot.noLighting'),
        off: !spot.lighting,
      },
      { label: t('spot.fact.access'), value: t(`spot.access.${spot.access}`) },
      {
        label: t('spot.fact.rain'),
        value: t(spot.dryInRain ? 'spot.dryInRain' : 'spot.wetInRain'),
        off: !spot.dryInRain,
      },
    ] as (Fact | null)[]
  ).filter((f): f is Fact => f !== null);

  return (
    <View>
      <AppText variant="name" accessibilityRole="header">
        {spot.name}
      </AppText>
      {(spot.gradeMin || disciplines !== '') && (
        <View style={styles.meta}>
          {spot.gradeMin && (
            <AppText variant="grade" style={styles.rangeText}>
              {spot.gradeMin === spot.gradeMax
                ? spot.gradeMin
                : `${spot.gradeMin}–${spot.gradeMax}`}
            </AppText>
          )}
          <View style={styles.metaText}>
            {spot.gradeMin && (
              <AppText variant="label">{t('spot.problems', { count: spot.problemCount })}</AppText>
            )}
            {disciplines !== '' && (
              <AppText variant="small" tone="muted">
                {disciplines}
              </AppText>
            )}
          </View>
        </View>
      )}

      <View style={styles.grid}>
        {facts.map((f) => (
          <View key={f.label} style={styles.fact}>
            <AppText variant="caption" tone="muted">
              {f.label}
            </AppText>
            <View style={styles.factValue}>
              {f.warn && <View style={styles.warnDot} />}
              <AppText
                variant="bodyStrong"
                tone={f.off ? 'muted' : 'ink'}
                style={styles.factValueText}
              >
                {f.value}
              </AppText>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.visit}>
        <Icon name={spot.lastVisitAt ? 'check' : 'clock'} size={18} color={Colors.ink2} />
        <AppText variant="small" tone="muted" style={styles.visitText}>
          {spot.lastVisitAt
            ? t('spot.lastVisit', {
                date: new Date(spot.lastVisitAt).toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'long',
                }),
              })
            : t('spot.neverVisited')}
        </AppText>
      </View>

      {spot.description && <AppText style={styles.description}>{spot.description}</AppText>}
    </View>
  );
}

const styles = StyleSheet.create({
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: Spacing.three,
  },
  rangeText: { fontSize: 34, lineHeight: 36 },
  metaText: { flex: 1, gap: Spacing.half },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: Spacing.five },
  fact: {
    // Две колонки с зазором 6.
    width: '49%',
    flexGrow: 1,
    minHeight: 76,
    paddingHorizontal: 14,
    paddingVertical: Spacing.three,
    borderRadius: Radius.tag,
    backgroundColor: Colors.tag,
  },
  factValue: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.one },
  factValueText: { flexShrink: 1 },
  warnDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.ink,
    backgroundColor: Colors.accent,
  },
  visit: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: Spacing.three },
  visitText: { flex: 1 },
  description: { marginTop: Spacing.four },
});
