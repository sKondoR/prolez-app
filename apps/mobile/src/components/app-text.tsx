import { Text, type TextProps } from 'react-native';

import { Colors, Type, type TypeVariant } from '@/constants/theme';

const tones = { ink: Colors.ink, muted: Colors.ink2, onInk: Colors.tag } as const;

export type AppTextProps = TextProps & {
  variant?: TypeVariant;
  tone?: keyof typeof tones;
};

export function AppText({ variant = 'body', tone = 'ink', style, ...rest }: AppTextProps) {
  return <Text style={[Type[variant], { color: tones[tone] }, style]} {...rest} />;
}
