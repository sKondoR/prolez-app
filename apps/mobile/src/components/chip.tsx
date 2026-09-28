import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Icon, type IconName } from '@/components/icon';
import { Colors, Radius, Shadow, Size, Spacing, controlHitSlop } from '@/constants/theme';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: IconName;
  /** Число справа — например, сколько фильтров включено. */
  badge?: number;
  /** Чип поверх карты: тень и лаймовое выбранное состояние, как у меток спотов. */
  onMap?: boolean;
  /** Чип сжимается в ряду, длинная подпись обрезается многоточием (название региона). */
  shrink?: boolean;
}

export function Chip({
  label,
  selected = false,
  onPress,
  icon,
  badge,
  onMap = false,
  shrink = false,
}: ChipProps) {
  const selectedBg = onMap ? Colors.accent : Colors.ink;
  const fg = selected && !onMap ? Colors.tag : Colors.ink;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      hitSlop={controlHitSlop}
      style={({ pressed }) => [
        styles.chip,
        shrink && styles.shrink,
        onMap && Shadow.chip,
        selected ? { backgroundColor: selectedBg } : styles.idle,
        !onMap && !selected && styles.edge,
        pressed && styles.pressed,
      ]}
    >
      {icon && <Icon name={icon} size={16} color={fg} />}
      <AppText
        variant="label"
        numberOfLines={1}
        style={[styles.label, shrink && styles.shrink, { color: fg }]}
      >
        {label}
      </AppText>
      {badge !== undefined && badge > 0 && (
        <View style={styles.badge}>
          <AppText variant="caption" tone="onInk" style={styles.badgeText}>
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
    height: Size.control,
    paddingHorizontal: 14,
    borderRadius: Radius.tag,
  },
  shrink: { flexShrink: 1, minWidth: 0 },
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
  badgeText: { lineHeight: 14 },
});
