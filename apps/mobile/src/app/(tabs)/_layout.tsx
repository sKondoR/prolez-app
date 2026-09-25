import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Icon, type IconName } from '@/components/icon';
import { Colors, Fonts, Radius } from '@/constants/theme';

type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const tabs: { name: string; icon: IconName; label: string }[] = [
  { name: 'index', icon: 'map', label: 'tabs.map' },
  { name: 'challenges', icon: 'award', label: 'tabs.challenges' },
  { name: 'profile', icon: 'user', label: 'tabs.profile' },
  { name: 'about', icon: 'info', label: 'tabs.about' },
];

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <NavBar {...props} />}>
      {tabs.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} />
      ))}
    </Tabs>
  );
}

/** Нижняя навигация Material 3 в языке разметки: активный пункт — лаймовая плашка. */
function NavBar({ state, navigation }: BottomTabBarProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: 14 + insets.bottom }]} accessibilityRole="tablist">
      {state.routes.map((route, index) => {
        const tab = tabs.find((x) => x.name === route.name);
        if (!tab) return null;
        const active = state.index === index;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={t(tab.label)}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!active && !event.defaultPrevented) navigation.navigate(route.name);
            }}
            style={styles.item}
          >
            <View style={[styles.pill, active && styles.pillActive]}>
              <Icon name={tab.icon} size={22} color={active ? Colors.ink : Colors.ink2} />
            </View>
            <AppText
              variant="label"
              style={[styles.label, { color: active ? Colors.ink : Colors.ink2 }]}
            >
              {t(tab.label)}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    paddingTop: 10,
    paddingHorizontal: 8,
    backgroundColor: Colors.tag,
    borderTopWidth: 1,
    borderTopColor: Colors.hairline,
  },
  item: { flex: 1, alignItems: 'center', gap: 4, minHeight: 56 },
  pill: {
    width: 60,
    height: 32,
    borderRadius: Radius.tag,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: {
    backgroundColor: Colors.accent,
    borderWidth: 1.5,
    borderColor: 'rgba(26, 28, 27, 0.25)',
  },
  label: { fontFamily: Fonts.textSemiBold, fontSize: 12, lineHeight: 15 },
});
