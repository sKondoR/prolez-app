import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Colors, Radius, Spacing } from '@/constants/theme';

export interface SnackMessage {
  text: string;
  /** Новый id показывает снекбар заново, даже с тем же текстом. */
  id: number;
}

/** Короткое сообщение внизу экрана: графит и лаймовая точка, само скрывается. */
export function Snackbar({ message, bottom }: { message: SnackMessage | null; bottom: number }) {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!message) return;
    progress.setValue(0);
    const anim = Animated.sequence([
      Animated.timing(progress, {
        toValue: 1,
        duration: 320,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
        useNativeDriver: true,
      }),
      Animated.delay(3400),
      Animated.timing(progress, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [message, progress]);

  if (!message) return null;
  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      pointerEvents="none"
      style={[
        styles.snack,
        {
          bottom,
          opacity: progress,
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
          ],
        },
      ]}
    >
      <View style={styles.dot} />
      <AppText variant="small" tone="onInk" style={styles.text}>
        {message.text}
      </AppText>
    </Animated.View>
  );
}

/** Хелпер состояния: `show('текст')` каждый раз даёт новый id. */
export function useSnackbar() {
  const [message, setMessage] = useState<SnackMessage | null>(null);
  return { message, show: (text: string) => setMessage({ text, id: Date.now() }) };
}

const styles = StyleSheet.create({
  snack: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    minHeight: 52,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Radius.tag,
    backgroundColor: Colors.ink,
    elevation: 8,
    shadowColor: Colors.ink,
    shadowOpacity: 0.28,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
  },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.accent },
  text: { flex: 1 },
});
