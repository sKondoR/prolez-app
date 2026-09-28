// Рендерит метки внешнего слоя карты (скальный район, скалодром) в PNG @3x для MapLibre.
// Геометрия — из макета artifacts/design/03/mark-24.html, правила — DESIGN.md → «Метки на карте».
// sharp стоит в apps/api и поднят в корневой node_modules (node-linker=hoisted).
//
//   node apps/mobile/scripts/render-map-marks.mjs   (из prolez-app/)

import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const TAG = '#F4F5F1';
const GREY = '#555A57'; // Colors.externalGrey

// Метка 32 dp: круг радиусом 12 с обводкой 1.5 и ореол 16 — как у спота. Рендер в 3x.
const SCALE = 3;
const SIZE = 32 * SCALE;
const CIRCLE = 12 * SCALE;
const STROKE = 1.5 * SCALE;

// Силуэты в поле 100 × 100, круг — центр 50,50, радиус 44; низ обрезан кругом.
const glyphs = {
  // Два пика без снега; нижний поднят, чтобы силуэт не был острым.
  crag: `<g clip-path="url(#c)"><path d="M2 100 L29 46 L40 60 L60 28 L100 100 Z" fill="${GREY}"/></g>`,
  // Зацеп на болту: округлый слепок, белое кольцо и шляпка болта.
  gym: `<path d="M18 64 C14 50 24 40 38 42 C46 28 68 24 79 37 C89 49 82 68 66 71 C54 80 30 79 18 64 Z" fill="${GREY}"/>
    <circle cx="56" cy="52" r="7.5" fill="${TAG}"/>
    <circle cx="56" cy="52" r="3.2" fill="${GREY}"/>`,
};

function svg(glyph) {
  const k = CIRCLE / 44;
  const c = SIZE / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <defs><clipPath id="c"><circle cx="50" cy="50" r="44"/></clipPath></defs>
  <circle cx="${c}" cy="${c}" r="${c}" fill="${TAG}" opacity="0.7"/>
  <g transform="translate(${c} ${c}) scale(${k}) translate(-50 -50)">
    <circle cx="50" cy="50" r="44" fill="${TAG}"/>
    ${glyph}
    <circle cx="50" cy="50" r="44" fill="none" stroke="${GREY}" stroke-width="${STROKE / k}"/>
  </g>
</svg>`;
}

const out = join(dirname(fileURLToPath(import.meta.url)), '../assets/images/map');
mkdirSync(out, { recursive: true });
for (const [kind, glyph] of Object.entries(glyphs)) {
  const file = join(out, `external-${kind}@3x.png`);
  await sharp(Buffer.from(svg(glyph)))
    .png()
    .toFile(file);
  console.log(file);
}
