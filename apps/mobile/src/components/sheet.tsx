import { type ReactNode, useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radius, Spacing } from '@/constants/theme';

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

/** Модальный нижний лист поверх экрана: затемнение и лист с ручкой, закрытие касанием фона. */
export function Sheet({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const [progress] = useState(() => new Animated.Value(0));
  // Modal остаётся смонтированным, пока доигрывает анимация закрытия.
  const [visible, setVisible] = useState(open);
  if (open && !visible) setVisible(true);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: open ? 1 : 0,
      duration: open ? 380 : 240,
      easing: easeOut,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !open) setVisible(false);
    });
  }, [open, progress]);

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView behavior="padding" style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, { opacity: progress }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={label} />
        </Animated.View>
        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            { paddingBottom: Spacing.five + insets.bottom },
            {
              transform: [
                { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [600, 0] }) },
              ],
            },
          ]}
        >
          <View style={styles.handle} />
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  scrim: { backgroundColor: Colors.scrim },
  sheet: {
    backgroundColor: Colors.tag,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(26, 28, 27, 0.25)',
    marginBottom: 14,
  },
});
