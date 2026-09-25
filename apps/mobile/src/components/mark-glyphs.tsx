import Svg, { G, Path } from 'react-native-svg';

/** Значки старта для разметки на фото — те же, что в макете (artifacts/design/02/spot.html). */
export function HandGlyph({
  size = 24,
  color,
  mirrored = false,
}: {
  size?: number;
  color: string;
  mirrored?: boolean;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={mirrored ? { transform: [{ scaleX: -1 }] } : undefined}
    >
      <G fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M18 11V6a2 2 0 0 0-4 0" />
        <Path d="M14 10V4a2 2 0 0 0-4 0v2" />
        <Path d="M10 10.5V6a2 2 0 0 0-4 0v8" />
        <Path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-6-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
      </G>
    </Svg>
  );
}

export function FootGlyph({ size = 22, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill={color}
        d="M2.5 17.2c0-1.9 1.2-3 3.1-3.4l4.6-1c.9-.2 1.6-.8 2-1.6l1.6-3.4c.3-.6.9-1 1.6-1h1.7c.8 0 1.4.6 1.5 1.4l.3 2.2c.1.6.5 1 1 1.2 1.5.5 2.1 1.7 2.1 3.2v2.4c0 .8-.6 1.4-1.4 1.4H3.9c-.8 0-1.4-.6-1.4-1.4z"
      />
    </Svg>
  );
}
