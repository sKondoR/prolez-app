import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, Path, Rect } from 'react-native-svg';

import { AppText } from '@/components/app-text';
import { Colors, Fonts, Radius } from '@/constants/theme';

import { HatchPattern, PinShape } from './glyphs';

// Схема из макета (artifacts/design/02/landing.html): квартал, река, мост и ж/д под штриховкой.
const W = 342;
const H = 250;
const RAIL = 'M198 -10 C 200 60, 190 120, 170 250';

const spots = [
  [51, 89],
  [119, 31],
  [253, 217],
  [311, 175],
] as const;

/** Фрагмент карты: где спот создать можно, а где нет. Иллюстрация, не настоящие данные. */
export function LegalMap() {
  const { t } = useTranslation();

  return (
    <View
      style={styles.frame}
      accessible
      accessibilityRole="image"
      accessibilityLabel={t('about.legalMapA11y')}
    >
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`}>
        <Defs>
          <HatchPattern id="map-hatch" />
        </Defs>
        <Rect width={W} height={H} fill="#E3E5E1" />
        <G fill="#D2D5D0">
          <Rect x={12} y={12} width={70} height={46} rx={2} />
          <Rect x={92} y={12} width={56} height={46} rx={2} />
          <Rect x={12} y={68} width={70} height={38} rx={2} />
          <Rect x={92} y={68} width={56} height={38} rx={2} />
          <Rect x={222} y={150} width={54} height={40} rx={2} />
          <Rect x={286} y={150} width={46} height={40} rx={2} />
          <Rect x={222} y={200} width={54} height={40} rx={2} />
          <Rect x={286} y={200} width={46} height={40} rx={2} />
          <Rect x={164} y={12} width={60} height={30} rx={2} />
        </G>
        <Rect x={236} y={14} width={96} height={60} rx={3} fill="#CCD6C8" />
        <Path
          d="M-10 150 C 60 120, 120 150, 180 128 S 300 96, 352 108 L352 136 C 300 126, 240 150, 180 158 S 60 150, -10 180 Z"
          fill="#93A8AF"
        />
        <G stroke="#FFFFFF" strokeWidth={6} fill="none">
          <Path d="M0 63H160M87 0V112M156 0V120M0 112H160" />
          <Path d="M214 250V142M281 250V142M214 195H342" />
        </G>

        {/* мост и его буфер */}
        <Rect
          x={120}
          y={102}
          width={46}
          height={82}
          rx={8}
          transform="rotate(-32 143 143)"
          fill="url(#map-hatch)"
          stroke={Colors.forbidden}
          strokeWidth={1.5}
          strokeDasharray="5 4"
        />
        <Path
          d="M132 118 L 156 170"
          stroke={Colors.ink}
          strokeWidth={7}
          strokeLinecap="square"
          transform="rotate(-6 144 144)"
        />

        {/* ж/д и её буфер */}
        <Path d={RAIL} fill="none" stroke="url(#map-hatch)" strokeWidth={40} />
        <Path
          d={RAIL}
          fill="none"
          stroke={Colors.forbidden}
          strokeWidth={1.5}
          strokeDasharray="5 4"
          transform="translate(-20 0)"
        />
        <Path
          d={RAIL}
          fill="none"
          stroke={Colors.forbidden}
          strokeWidth={1.5}
          strokeDasharray="5 4"
          transform="translate(20 0)"
        />
        <Path d={RAIL} fill="none" stroke={Colors.ink} strokeWidth={3} strokeDasharray="10 6" />

        {spots.map(([x, y]) => (
          <G key={`${x}-${y}`} transform={`translate(${x} ${y}) scale(${30 / 28})`}>
            <PinShape />
          </G>
        ))}

        {/* точка, которую не приняли */}
        <G transform="translate(206 70)">
          <Circle r={13} fill={Colors.tag} stroke={Colors.ink} strokeWidth={2.5} />
          <Path
            d="M-5 -5 5 5M5 -5 -5 5"
            stroke={Colors.ink}
            strokeWidth={2.8}
            strokeLinecap="round"
          />
        </G>
      </Svg>

      {/* Подпись — обычным текстом, чтобы шрифт и масштаб совпадали с остальным экраном. */}
      <View style={styles.rejected}>
        <AppText style={styles.rejectedTitle} tone="onInk">
          {t('about.legalRejected')}
        </AppText>
        <AppText style={styles.rejectedNote}>{t('about.legalRejectedDistance')}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { width: '100%', aspectRatio: W / H, borderRadius: Radius.small, overflow: 'hidden' },
  rejected: {
    position: 'absolute',
    left: `${(224 / W) * 100}%`,
    top: `${(50 / H) * 100}%`,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: Radius.small,
    backgroundColor: Colors.ink,
  },
  rejectedTitle: { fontFamily: Fonts.textBold, fontSize: 12, lineHeight: 15 },
  rejectedNote: { fontFamily: Fonts.text, fontSize: 11, lineHeight: 14, color: '#D9DCD8' },
});
