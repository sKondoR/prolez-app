import type { Grade, ProblemStatus } from '@prolez/shared';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { GradeMark } from '@/components/grade-mark';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';

export interface ProblemRowData {
  key: string;
  name: string;
  grade: Grade;
  status: ProblemStatus;
  subtitle: string;
  /** Номер на фото; нет номера — проблема не размечена на фото. */
  n?: number;
  draft?: boolean;
}

export function ProblemList({
  rows,
  selectedKey,
  onSelect,
}: {
  rows: ProblemRowData[];
  selectedKey: string | undefined;
  onSelect: (key: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.list}>
      {rows.map((row) => {
        const selectable = row.n !== undefined;
        const selected = selectable && row.key === selectedKey;
        return (
          <Pressable
            key={row.key}
            disabled={!selectable}
            accessibilityRole={selectable ? 'button' : undefined}
            accessibilityState={selectable ? { selected } : undefined}
            accessibilityHint={selectable ? t('marking.showOnPhoto') : undefined}
            onPress={() => onSelect(row.key)}
            style={[styles.row, selected && styles.rowSelected]}
          >
            <GradeMark grade={row.grade} status={row.status} size={60} />
            <View style={styles.text}>
              <View style={styles.titleLine}>
                {row.n !== undefined && (
                  <View style={[styles.n, selected && styles.nSelected]}>
                    <AppText
                      variant="grade"
                      style={[styles.nText, selected && styles.nTextSelected]}
                    >
                      {row.n}
                    </AppText>
                  </View>
                )}
                <AppText variant="bodyStrong" style={styles.name}>
                  {row.name}
                </AppText>
              </View>
              <AppText variant="label" tone="muted">
                {row.subtitle}
              </AppText>
            </View>
            {row.draft && (
              <View style={styles.draft}>
                <AppText variant="label" style={styles.draftText}>
                  {t('marking.draftBadge')}
                </AppText>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 10,
    paddingRight: 14,
    borderRadius: Radius.tag,
    backgroundColor: Colors.tag,
    // Прозрачная рамка держит размер строки, когда выбранная получает графитовую.
    borderWidth: 2.5,
    borderColor: 'transparent',
  },
  rowSelected: { borderColor: Colors.ink },
  text: { flex: 1, gap: Spacing.one },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  name: { flexShrink: 1 },
  n: {
    width: 22,
    height: 22,
    borderRadius: Radius.small,
    backgroundColor: Colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nSelected: { backgroundColor: Colors.accent },
  nText: { ...Type.grade, fontSize: 14, lineHeight: 17, color: Colors.tag },
  nTextSelected: { color: Colors.ink },
  draft: {
    height: 28,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.small,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.ink,
    justifyContent: 'center',
  },
  draftText: { fontSize: 12, lineHeight: 15 },
});
