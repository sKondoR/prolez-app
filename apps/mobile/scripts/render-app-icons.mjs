// Рендерит иконки приложения и splash из метки спота: лаймовый круг с графитовой обводкой,
// графитовый крест и лаймовый ореол (DESIGN.md → «Метки на карте», artifacts/design/03/mark-24.html).
// sharp стоит в apps/api и поднят в корневой node_modules (node-linker=hoisted).
//
//   node apps/mobile/scripts/render-app-icons.mjs   (из prolez-app/)
//
// После рендера нативные ресурсы обновляет `npx expo prebuild -p android`.

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const GROUND = '#D3D6D2'; // Colors.ground, бетон
const LIME = '#E6FF2E';
const INK = '#1A1C1B';

// Метка в поле 100 × 100: круг — центр 50,50, радиус 44. Обводка и ореол — в пропорции
// метки на карте (круг 12, обводка 1.5, ореол 16).
const R = 44;
const HALO = (16 / 12) * R;
const OUTLINE = (1.5 / 12) * R;
const CROSS = 'M34 34 L66 66 M66 34 L34 66';

/** Метка с ореолом, вписанная так, что ореол занимает `haloRadius` px от центра холста `size`. */
function mark(size, haloRadius) {
  const k = haloRadius / HALO;
  const c = size / 2;
  return `<g transform="translate(${c} ${c}) scale(${k}) translate(-50 -50)">
    <circle cx="50" cy="50" r="${HALO}" fill="${LIME}" opacity="0.32"/>
    <circle cx="50" cy="50" r="${R}" fill="${LIME}" stroke="${INK}" stroke-width="${OUTLINE}"/>
    <path d="${CROSS}" stroke="${INK}" stroke-width="10" stroke-linecap="round"/>
  </g>`;
}

/** Силуэт для тематических иконок Android: диск с вырезанным крестом, без ореола. */
function monochrome(size, haloRadius) {
  const k = haloRadius / HALO;
  const c = size / 2;
  return `<defs><mask id="m">
    <rect width="100" height="100" fill="white"/>
    <path d="${CROSS}" stroke="black" stroke-width="10" stroke-linecap="round"/>
  </mask></defs>
  <g transform="translate(${c} ${c}) scale(${k}) translate(-50 -50)">
    <circle cx="50" cy="50" r="${R + OUTLINE / 2}" fill="white" mask="url(#m)"/>
  </g>`;
}

const canvas = (size, body, background) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${background ? `<rect width="${size}" height="${size}" fill="${background}"/>` : ''}
  ${body}
</svg>`;

// Адаптивная иконка: холст 108 dp, безопасный круг 66 dp — ореол вписан в него.
const ADAPTIVE = 1024;
const adaptiveHalo = (ADAPTIVE * 33) / 108;

const files = {
  // Общая иконка (iOS, RuStore, веб-манифест): бетон под меткой.
  'icon.png': canvas(1024, mark(1024, 1024 * 0.36), GROUND),
  'android-icon-background.png': canvas(ADAPTIVE, '', GROUND),
  'android-icon-foreground.png': canvas(ADAPTIVE, mark(ADAPTIVE, adaptiveHalo)),
  'android-icon-monochrome.png': canvas(ADAPTIVE, monochrome(ADAPTIVE, adaptiveHalo)),
  // Splash: метка на прозрачном, фон бетона задаёт expo-splash-screen в app.json.
  'splash-icon.png': canvas(1024, mark(1024, 512)),
  'favicon.png': canvas(48, mark(48, 24)),
};

const out = join(dirname(fileURLToPath(import.meta.url)), '../assets/images');
for (const [name, svg] of Object.entries(files)) {
  const file = join(out, name);
  await sharp(Buffer.from(svg)).png().toFile(file);
  console.log(file);
}
