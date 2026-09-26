import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

interface QueueItem {
  grade: string;
  name: string;
  meta: string;
}

/**
 * Пример очереди отметок «Пролез!». Когда блок показан, «появляется сеть» и отметки
 * уходят по одной — как в макете. Данные — примеры из текстов, не настоящая очередь.
 */
export function OfflineQueue({ active }: { active: boolean }) {
  const { t } = useTranslation();
  const items = t('about.queue', { returnObjects: true }) as QueueItem[];
  const count = items.length;
  const [sent, setSent] = useState(0);

  useEffect(() => {
    if (!active) return;
    const timers = Array.from({ length: count }, (_, i) =>
      setTimeout(() => setSent(i + 1), 1400 + i * 650),
    );
    return () => timers.forEach(clearTimeout);
  }, [active, count]);

  return (
    <View style={styles.list}>
      {items.map((item, i) => {
        const done = i < sent;
        return (
          <View key={item.name} style={styles.row}>
            <View style={styles.grade}>
              <AppText variant="grade" style={styles.gradeText}>
                {item.grade}
              </AppText>
            </View>
            <View style={styles.body}>
              <AppText variant="bodyStrong" style={styles.name}>
                {item.name}
              </AppText>
              <AppText variant="label" tone="muted" style={styles.meta}>
                {item.meta}
              </AppText>
            </View>
            <View style={styles.status} accessibilityLiveRegion="polite">
              <View style={[styles.dot, done && styles.dotDone]} />
              <AppText variant="caption" style={styles.statusText}>
                {t(done ? 'about.queueSent' : 'about.queueWaiting')}
              </AppText>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { marginTop: Spacing.five, gap: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 60,
    paddingVertical: Spacing.two,
    paddingLeft: Spacing.two,
    paddingRight: 14,
    borderRadius: Radius.tag,
    backgroundColor: Colors.tag,
  },
  grade: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
  },
  gradeText: { fontSize: 15, lineHeight: 18 },
  body: { flex: 1 },
  name: { fontSize: 15 },
  meta: { fontFamily: Fonts.text },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, borderWidth: 2, borderColor: Colors.ink },
  dotDone: { backgroundColor: Colors.ink },
  statusText: { fontFamily: Fonts.textBold },
});
