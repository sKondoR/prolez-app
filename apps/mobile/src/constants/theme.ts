// Визуальная система «Разметка баллончиком» (artifacts/design/02): серый бетон, графит,
// флуоресцентный лайм. Цвет — всегда поле, текст на нём — графит. Тема только светлая.

import type { TextStyle, ViewStyle } from 'react-native';

export const Colors = {
  /** Фон экранов. */
  ground: '#D3D6D2',
  /** Бирка: всё, что читается или нажимается поверх фона. */
  tag: '#F4F5F1',
  /** Поле управления внутри бирки или листа (сегменты, счётчики, квадратные кнопки). */
  field: '#E6E8E4',
  ink: '#1A1C1B',
  /** Вторичный текст: 9.6:1 на бирке, 7.5:1 на фоне. */
  ink2: '#3B3F3D',
  accent: '#E6FF2E',
  accentPressed: '#D2EA10',
  /** Запретные зоны — только поле или обводка. */
  forbidden: '#FF3DA8',
  /** Тот же розовый для иконок и текста на светлом: 5.1:1 на бирке. */
  forbiddenInk: '#C81E7E',
  switchOff: '#C9CCC8',
  /** Бетонная плита и шов между плитами — подложки иллюстраций. */
  concrete: '#A5AAA6',
  seam: '#7A7F7B',
  hairline: 'rgba(26, 28, 27, 0.12)',
  /** Бледная обводка чипа на бирке. */
  chipEdge: 'rgba(26, 28, 27, 0.18)',
  scrim: 'rgba(26, 28, 27, 0.4)',
} as const;

export const Radius = {
  /** Бирки, кнопки, чипы — одна прямоугольная форма маркировочной ленты. */
  tag: 4,
  small: 3,
  sheet: 14,
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 24,
  six: 32,
} as const;

export const Fonts = {
  display: 'Unbounded_800ExtraBold',
  displayBold: 'Unbounded_700Bold',
  text: 'Onest_400Regular',
  textMedium: 'Onest_500Medium',
  textSemiBold: 'Onest_600SemiBold',
  textBold: 'Onest_700Bold',
  stencil: 'SairaStencilOne_400Regular',
} as const;

/**
 * Шкала текста. На Android у подключённых шрифтов вес задаётся начертанием (fontFamily),
 * поэтому fontWeight здесь не используется.
 */
export const Type = {
  /** Заголовок экрана: капс, плотный трекинг. */
  display: {
    fontFamily: Fonts.display,
    fontSize: 28,
    lineHeight: 30,
    letterSpacing: -0.8,
    textTransform: 'uppercase',
  },
  /**
   * Имя собственное места (спот, скалодром): без капса и на всю ширину строки. Капсом
   * длинные адреса Петербурга рвутся посреди слова.
   */
  name: { fontFamily: Fonts.displayBold, fontSize: 24, lineHeight: 28, letterSpacing: -0.5 },
  head: { fontFamily: Fonts.displayBold, fontSize: 20, lineHeight: 23, letterSpacing: -0.4 },
  title: { fontFamily: Fonts.textBold, fontSize: 17, lineHeight: 21 },
  body: { fontFamily: Fonts.text, fontSize: 16, lineHeight: 23 },
  bodyStrong: { fontFamily: Fonts.textBold, fontSize: 16, lineHeight: 20 },
  small: { fontFamily: Fonts.textMedium, fontSize: 14, lineHeight: 19 },
  label: { fontFamily: Fonts.textSemiBold, fontSize: 13, lineHeight: 16, letterSpacing: 0.1 },
  /** Подпись поля, бейдж, кредит фото — мельче метки, тот же вес. */
  caption: { fontFamily: Fonts.textSemiBold, fontSize: 12, lineHeight: 15, letterSpacing: 0.1 },
  button: {
    fontFamily: Fonts.displayBold,
    fontSize: 15,
    lineHeight: 18,
    letterSpacing: 0.15,
    textTransform: 'uppercase',
  },
  /** Категория — трафаретом, как краска по шаблону. */
  grade: { fontFamily: Fonts.stencil, letterSpacing: -0.2 },
} as const satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof Type;

/** Тень только у того, что парит над картой. */
export const Shadow = {
  float: {
    elevation: 6,
    shadowColor: Colors.ink,
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
  },
  chip: {
    elevation: 3,
    shadowColor: Colors.ink,
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
} as const satisfies Record<string, ViewStyle>;
