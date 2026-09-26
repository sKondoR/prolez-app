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

/** Корпус, руки и ноги фигурки: толстые линии с круглыми концами. */
function Limbs({ lines }: { lines: [d: string, width: number][] }) {
  return lines.map(([d, width]) => (
    <Path
      key={d}
      d={d}
      fill="none"
      stroke={Colors.ink}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ));
}

/** Зацеп: ровный лаймовый круг с обводкой, без эффекта краски. */
function Hold({ cx, cy }: { cx: number; cy: number }) {
  return <Circle cx={cx} cy={cy} r={5} fill={Colors.accent} stroke={Colors.ink} strokeWidth={2} />;
}

const roleFigures = [
  // Скалолаз
  () => (
    <>
      <Limbs
        lines={[
          ['M44 25 L40 46', 11],
          ['M47 26 L56 17 L59 7', 5.5],
          ['M41 28 L30 33 L24 23', 5.5],
          ['M42 47 L54 53 L52 66', 6.5],
          ['M39 48 L35 61 L33 74', 6.5],
        ]}
      />
      <Circle cx={47} cy={15} r={6} fill={Colors.ink} />
      <Hold cx={60} cy={6} />
      <Hold cx={23} cy={22} />
    </>
  ),
  // Паркурщик
  () => (
    <>
      <Rect x={22} y={54} width={44} height={22} fill="#8A8F8B" />
      <Rect
        x={22}
        y={54}
        width={44}
        height={5}
        fill={Colors.accent}
        stroke={Colors.ink}
        strokeWidth={2}
      />
      <Limbs
        lines={[
          ['M54 30 L34 38', 11],
          ['M50 32 L44 44 L40 53', 5.5],
          ['M54 30 L52 43 L50 53', 5.5],
          ['M34 38 L20 30 L8 33', 6.5],
          ['M34 39 L20 42 L10 49', 6.5],
        ]}
      />
      <Circle cx={61} cy={24} r={6} fill={Colors.ink} />
    </>
  ),
  // Ниндзя-атлет
  () => (
    <>
      <Path d="M8 8H72" stroke={Colors.ink} strokeWidth={4} strokeLinecap="round" />
      <Limbs
        lines={[
          ['M40 30 L40 50', 11],
          ['M36 31 L30 20 L30 9', 5.5],
          ['M44 31 L50 20 L50 9', 5.5],
          ['M42 51 L56 54 L52 66', 6.5],
          ['M38 51 L26 56 L30 68', 6.5],
        ]}
      />
      <Circle cx={40} cy={22} r={6} fill={Colors.ink} />
      <Hold cx={30} cy={8} />
      <Hold cx={50} cy={8} />
    </>
  ),
];

/** Пиктограмма роли из лендинга: 0 — скалолаз, 1 — паркурщик, 2 — ниндзя-атлет. */
export function RoleFigure({ index, size = 88 }: { index: number; size?: number }) {
  const Figure = roleFigures[index];
  if (!Figure) return null;
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80">
      <Figure />
    </Svg>
  );
}
