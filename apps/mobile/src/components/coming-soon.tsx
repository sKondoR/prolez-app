import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Icon, type IconName } from '@/components/icon';
import { Colors, Radius, Spacing } from '@/constants/theme';

export interface ComingSoonSection {
  icon: IconName;
  /** Подзаголовок карточки, когда их на экране несколько. */
  title?: string;
  points: string[];
}

/**
 * Раздел, который появится в следующих фазах (PLAN.md). Экран честно говорит, что будет
 * и по каким правилам, без выдуманных данных.
 */
export function ComingSoon({
  title,
  lead,
  sections,
}: {
  title: string;
  lead: string;
  sections: ComingSoonSection[];
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.six }]}
    >
      <AppText variant="display" accessibilityRole="header">
        {title}
      </AppText>
      <AppText style={styles.lead}>{lead}</AppText>

      {sections.map((section) => (
        <View key={section.title ?? section.icon} style={styles.card}>
          <View style={styles.cardHead}>
            <View style={styles.badge}>
              <Icon name={section.icon} size={20} color={Colors.ink} />
              <AppText variant="label">{t('soon.badge')}</AppText>
            </View>
            {section.title ? (
              <AppText variant="head" accessibilityRole="header">
                {section.title}
              </AppText>
            ) : null}
          </View>
          {section.points.map((point) => (
            <View key={point} style={styles.point}>
              <View style={styles.bullet} />
              <AppText variant="small" style={styles.pointText}>
                {point}
              </AppText>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.ground },
  content: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.six },
  lead: { marginTop: Spacing.three, maxWidth: 520 },
  card: {
    marginTop: Spacing.five,
    padding: Spacing.four,
    gap: Spacing.three,
    borderRadius: Radius.tag,
    backgroundColor: Colors.tag,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    height: 32,
    paddingHorizontal: 10,
    borderRadius: Radius.small,
    backgroundColor: Colors.accent,
  },
  point: { flexDirection: 'row', gap: Spacing.three, alignItems: 'flex-start' },
  bullet: { width: 8, height: 8, marginTop: 6, borderRadius: 1, backgroundColor: Colors.ink },
  pointText: { flex: 1 },
});
