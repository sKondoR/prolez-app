import Svg, { Circle, Defs, Path, Pattern, Rect } from 'react-native-svg';

import { Colors } from '@/constants/theme';

/** Путь креста метки спота в координатах -14..14 — как на карте и в макете. */
const PIN_CROSS = 'M-4.5 -4.5 4.5 4.5M4.5 -4.5 -4.5 4.5';

/** Метка спота: лаймовый круг с крестом. */
export function SpotPin({ size = 28 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="-14 -14 28 28">
      <PinShape />
    </Svg>
  );
}

/** Содержимое метки спота для вставки в чужой `<Svg>` (через `<G transform>`). */
export function PinShape() {
  return (
    <>
      <Circle r={13.5} fill={Colors.accent} opacity={0.28} />
      <Circle r={11} fill={Colors.accent} stroke={Colors.ink} strokeWidth={1.5} />
      <Path d={PIN_CROSS} stroke={Colors.ink} strokeWidth={2.6} strokeLinecap="round" />
    </>
  );
}

/** Штриховка запретной зоны. Кладётся в `<Defs>`, используется как `fill="url(#id)"`. */
export function HatchPattern({ id }: { id: string }) {
  return (
    <Pattern
      id={id}
      width={8}
      height={8}
      patternUnits="userSpaceOnUse"
      patternTransform="rotate(45)"
    >
      <Rect width={8} height={8} fill={Colors.forbidden} fillOpacity={0.2} />
      <Rect width={3} height={8} fill={Colors.forbidden} />
    </Pattern>
  );
}

/** Значок запретной зоны для легенды: заштрихованный прямоугольник с пунктиром. */
export function ForbiddenSwatch({ size = 56 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 56 56">
      <Defs>
        <HatchPattern id="legend-hatch" />
      </Defs>
      <Rect
        x={6}
        y={10}
        width={44}
        height={36}
        rx={4}
        fill="url(#legend-hatch)"
        stroke={Colors.forbidden}
        strokeWidth={2}
        strokeDasharray="5 4"
      />
    </Svg>
  );
}
