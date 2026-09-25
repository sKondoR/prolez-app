import Feather from '@expo/vector-icons/Feather';
import type { ComponentProps } from 'react';

import { Colors } from '@/constants/theme';

export type IconName = ComponentProps<typeof Feather>['name'];

/** Один набор иконок с ровным штрихом 2 — Feather, как в макетах. */
export function Icon({
  name,
  size = 24,
  color = Colors.ink,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return <Feather name={name} size={size} color={color} accessibilityElementsHidden />;
}
