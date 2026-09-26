import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { Animated, Easing, PanResponder, StyleSheet, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';

export type SheetMode = 'collapsed' | 'peek' | 'list';

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
/** Сдвиг пальцем или скорость броска, после которых лист переходит в соседнее положение. */
const DRAG_DISTANCE = 40;
const FLING_VELOCITY = 0.5;

/**
 * Постоянный нижний лист над картой (Material 3 standard bottom sheet): карта под ним
 * остаётся живой. Высота свёрнутого листа и превью — по содержимому, списка — `expandedHeight`.
 * Тянут лист за `grip`; тело (`children`) прокручивается само.
 */
export function MapSheet({
  mode,
  expandedHeight,
  visible,
  onDrag,
  onRest,
  grip,
  children,
}: {
  mode: SheetMode;
  expandedHeight: number;
  /** Видимая высота листа: по ней едут кнопки карты. Анимируется на нативном драйвере. */
  visible: Animated.Value;
  onDrag: (direction: 'up' | 'down') => void;
  /** Лист встал в положение: его видимая высота. */
  onRest?: (mode: SheetMode, height: number) => void;
  grip: ReactNode;
  children?: ReactNode;
}) {
  const [contentHeight, setContentHeight] = useState(0);
  const target = mode === 'list' ? expandedHeight : contentHeight;

  useEffect(() => {
    if (target <= 0) return;
    Animated.timing(visible, {
      toValue: target,
      duration: 320,
      easing: easeOut,
      useNativeDriver: true,
    }).start();
    onRest?.(mode, target);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onRest — колбэк родителя
  }, [target, mode, visible]);

  // Положение пальца живёт в смещении Animated.Value, а не в замыкании: обработчик
  // пересоздаётся при каждом рендере и не теряет жест посередине.
  const pan = useMemo(() => {
    const settle = () => {
      visible.flattenOffset();
      Animated.timing(visible, {
        toValue: target,
        duration: 240,
        easing: easeOut,
        useNativeDriver: true,
      }).start();
    };
    return PanResponder.create({
      // Касание без сдвига достаётся кнопкам внутри ручки; вертикальный сдвиг — листу.
      onMoveShouldSetPanResponderCapture: (_, g) =>
        Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderGrant: () => {
        visible.stopAnimation();
        visible.extractOffset();
      },
      onPanResponderMove: (_, g) => visible.setValue(-g.dy),
      onPanResponderRelease: (_, g) => {
        // Если положение не сменится, лист вернётся на место; если сменится — эффект перебьёт.
        settle();
        if (g.dy < -DRAG_DISTANCE || g.vy < -FLING_VELOCITY) onDrag('up');
        else if (g.dy > DRAG_DISTANCE || g.vy > FLING_VELOCITY) onDrag('down');
      },
      onPanResponderTerminate: settle,
    });
  }, [visible, target, onDrag]);

  // Палец может увести лист за края — на экране он упирается в них.
  const shown = visible.interpolate({
    inputRange: [0, Math.max(expandedHeight, 1)],
    outputRange: [0, Math.max(expandedHeight, 1)],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      style={[
        styles.sheet,
        {
          height: expandedHeight,
          transform: [{ translateY: Animated.subtract(expandedHeight, shown) }],
        },
      ]}
    >
      <View
        style={mode === 'list' && styles.fill}
        onLayout={(e) => {
          if (mode !== 'list') setContentHeight(Math.ceil(e.nativeEvent.layout.height));
        }}
      >
        <View {...pan.panHandlers}>
          <View style={styles.handle} />
          {grip}
        </View>
        {children}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.tag,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    // Тень вверх, на карту: лист парит над ней, а снизу стыкуется с навигацией.
    elevation: 10,
    shadowColor: Colors.ink,
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
  },
  fill: { flex: 1 },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(26, 28, 27, 0.25)',
    marginTop: Spacing.two,
    marginBottom: Spacing.one,
  },
});
