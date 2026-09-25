import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Icon } from '@/components/icon';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useMapStore } from '@/features/map/map-store';

type LayerKey = 'forbidden' | 'external';

export default function LayersScreen() {
  const { t } = useTranslation();
  const layers = useMapStore((s) => s.layers);
  const toggleLayer = useMapStore((s) => s.toggleLayer);

  return (
    <ScrollView style={styles.sheet} contentContainerStyle={styles.content}>
      <AppText variant="head" accessibilityRole="header" style={styles.title}>
        {t('layers.title')}
      </AppText>
      {(['forbidden', 'external'] as LayerKey[]).map((key, i) => (
        <View key={key} style={[styles.row, i > 0 && styles.divider]}>
          {key === 'forbidden' ? (
            <View style={styles.zoneKey} />
          ) : (
            <View style={styles.gymKey}>
              <Icon name="trending-up" size={18} color={Colors.tag} />
            </View>
          )}
          <View style={styles.text}>
            <AppText variant="bodyStrong">{t(`layers.${key}`)}</AppText>
            <AppText variant="label" tone="muted">
              {t(`layers.${key}Hint`)}
            </AppText>
          </View>
          <Switch
            accessibilityLabel={t(`layers.${key}`)}
            value={layers[key]}
            onValueChange={() => toggleLayer(key)}
            trackColor={{ false: Colors.switchOff, true: Colors.ink }}
            thumbColor={Colors.tag}
          />
        </View>
      ))}
      {!layers.forbidden && (
        <AppText variant="small" tone="muted" style={styles.note}>
          {t('layers.forbiddenOff')}
        </AppText>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sheet: { backgroundColor: Colors.tag },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.five,
  },
  title: { marginBottom: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: 68 },
  divider: { borderTopWidth: 1, borderTopColor: Colors.hairline },
  text: { flex: 1, gap: 2, paddingVertical: Spacing.two },
  zoneKey: {
    width: 32,
    height: 26,
    borderRadius: Radius.small,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.forbidden,
    backgroundColor: 'rgba(255, 61, 168, 0.22)',
  },
  gymKey: {
    width: 32,
    height: 32,
    borderRadius: Radius.tag,
    backgroundColor: Colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: { marginTop: Spacing.two },
});
