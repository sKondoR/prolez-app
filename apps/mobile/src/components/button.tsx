import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components/app-text';
import { Icon, type IconName } from '@/components/icon';
import { Colors, Radius, Spacing } from '@/constants/theme';

const variants = {
  /** Лайм — действие, которое оставляет след: «Пролез!», «Опубликовать». */
  accent: { bg: Colors.accent, pressed: Colors.accentPressed, fg: Colors.ink },
  /** Графит — главное нейтральное действие экрана. */
  ink: { bg: Colors.ink, pressed: '#000000', fg: Colors.tag },
  /** Поле — второстепенное действие внутри листа. */
  field: { bg: Colors.field, pressed: Colors.switchOff, fg: Colors.ink },
} as const;

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: keyof typeof variants;
  icon?: IconName;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  onPress,
  variant = 'accent',
  icon,
  disabled = false,
  style,
}: ButtonProps) {
  const v = variants[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: pressed ? v.pressed : v.bg },
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {icon && <Icon name={icon} size={20} color={v.fg} />}
      <AppText variant="button" style={{ color: v.fg }}>
        {label}
      </AppText>
    </Pressable>
  );
}

/** Квадратная кнопка-иконка 52: на карте — бирка с тенью. */
export function IconButton({
  icon,
  label,
  onPress,
  selected = false,
  style,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        { backgroundColor: selected ? Colors.ink : Colors.tag },
        pressed && styles.pressed,
        style,
      ]}
    >
      <Icon name={icon} color={selected ? Colors.tag : Colors.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 56,
    paddingHorizontal: Spacing.five,
    borderRadius: Radius.tag,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  pressed: { transform: [{ scale: 0.97 }] },
  disabled: { opacity: 0.45 },
  iconButton: {
    width: 52,
    height: 52,
    borderRadius: Radius.tag,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
