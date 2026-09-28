import type { SpotDetail } from '@prolez/shared';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Icon } from '@/components/icon';
import { Colors, Radius, Spacing } from '@/constants/theme';

interface Fact {
  label: string;
  value: string;
  /** Предупреждение — лаймовая точка у значения (нужен краш-пад). */
  warn?: boolean;
  /** Свободный текст на всю ширину: набирается обычным, а не жирным. */
  text?: boolean;
}

/** Название спота, под ним диапазон категорий, плитки «Адрес», «Краш-пад», «Примечание» и последний визит. */
export function SpotFacts({ spot }: { spot: SpotDetail }) {
  const { t } = useTranslation();

  const disciplines = spot.disciplines.map((d) => t(`discipline.${d}`)).join(' · ');
  const facts: Fact[] = (
    [
      spot.address ? { label: t('spot.fact.address'), value: spot.address } : null,
      {
        label: t('spot.fact.pad'),
        value: t(spot.needsPad ? 'spot.padNeeded' : 'spot.padOptional'),
        warn: spot.needsPad,
      },
      spot.note ? { label: t('spot.fact.note'), value: spot.note, text: true } : null,
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
          <View key={f.label} style={[styles.fact, f.text && styles.factWide]}>
            <AppText variant="caption" tone="muted">
              {f.label}
            </AppText>
            <View style={styles.factValue}>
              {f.warn && <View style={styles.warnDot} />}
              <AppText variant={f.text ? 'body' : 'bodyStrong'} style={styles.factValueText}>
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
  factWide: { width: '100%' },
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
});
