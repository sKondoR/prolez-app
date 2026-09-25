import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Icon, type IconName } from '@/components/icon';
import { Colors, Radius, Shadow, Spacing } from '@/constants/theme';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: IconName;
  /** Число справа — например, сколько фильтров включено. */
  badge?: number;
  /** Чип поверх карты: тень и лаймовое выбранное состояние, как у меток спотов. */
  onMap?: boolean;
}

export function Chip({ label, selected = false, onPress, icon, badge, onMap = false }: ChipProps) {
  const selectedBg = onMap ? Colors.accent : Colors.ink;
  const fg = selected && !onMap ? Colors.tag : Colors.ink;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        onMap && Shadow.chip,
        selected ? { backgroundColor: selectedBg } : styles.idle,
        !onMap && !selected && styles.edge,
        pressed && styles.pressed,
      ]}
    >
      {icon && <Icon name={icon} size={16} color={fg} />}
      <AppText variant="label" style={[styles.label, { color: fg }]}>
        {label}
      </AppText>
      {badge !== undefined && badge > 0 && (
        <View style={styles.badge}>
          <AppText variant="label" tone="onInk" style={styles.badgeText}>
            {badge}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: Radius.tag,
  },
  idle: { backgroundColor: Colors.tag },
  edge: { borderWidth: 1.5, borderColor: Colors.chipEdge },
  pressed: { transform: [{ scale: 0.97 }] },
  label: { fontSize: 14, lineHeight: 18 },
  badge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: Radius.small,
    backgroundColor: Colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 12, lineHeight: 14 },
});
