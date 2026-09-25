/**
 * Демо-данные для разработки. Все споты помечаются is_demo = true: реальные споты автор
 * наполняет сам после проверки на месте. Повторный запуск заменяет демо-данные.
 *
 * Места из исследования (IDEA.md) — реальные, но координаты приблизительные (геокодинг по
 * улице), а атрибуты и проблемы выдуманы. Демо-споты, попавшие в запретные зоны, пропускаются.
 */
import { readFile } from 'node:fs/promises';

import {
  type Discipline,
  type Grade,
  type ProblemMark,
  type SpotDetail,
  compareGrades,
  grades,
  problemStatus,
} from '@prolez/shared';

import sharp from 'sharp';

import { createDb } from '../db/client';
import { loadEnv, s3Config } from '../env';
import { createS3PhotoStore } from '../storage/photo-store';

// Детерминированный генератор: одинаковые сиды при каждом запуске.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260925);
const pick = <T>(list: readonly T[]): T => list[Math.floor(rand() * list.length)]!;

interface SeedSpot {
  name: string;
  description: string | null;
  lon: number;
  lat: number;
  objectType: SpotDetail['objectType'];
  surface: SpotDetail['surface'];
  needsPad: boolean;
  heightM: number;
  dryInRain: boolean;
  lighting: boolean;
  access: SpotDetail['access'];
}

const researchNote =
  'Из исследования (IDEA.md). Координаты приблизительные, атрибуты и трассы — демо.';

const researchSpots: SeedSpot[] = [
  {
    name: 'Ланская ул., 3',
    description: `Уличная стенка для боулдеринга. ${researchNote}`,
    lon: 30.32174,
    lat: 59.99864,
    objectType: 'street_wall',
    surface: 'rubber',
    needsPad: false,
    heightM: 3,
    dryInRain: false,
    lighting: true,
    access: 'always',
  },
  {
    name: 'Набережная Охты (ш. Революции, 63)',
    description: `Уличная стенка для боулдеринга. ${researchNote}`,
    lon: 30.4579,
    lat: 59.96059,
    objectType: 'street_wall',
    surface: 'sand',
    needsPad: false,
    heightM: 3.5,
    dryInRain: false,
    lighting: false,
    access: 'always',
  },
  {
    name: 'Воркаут-зона на пр. Королёва',
    description: `Стенка в воркаут-зоне. ${researchNote}`,
    lon: 30.26304,
    lat: 60.0135,
    objectType: 'street_wall',
    surface: 'rubber',
    needsPad: false,
    heightM: 2.5,
    dryInRain: false,
    lighting: true,
    access: 'always',
  },
  {
    name: 'Кронштадт, «Остров фортов»',
    description: `Не проверено. ${researchNote}`,
    lon: 29.74893,
    lat: 59.99321,
    objectType: 'street_wall',
    surface: 'rubber',
    needsPad: false,
    heightM: 3,
    dryInRain: false,
    lighting: false,
    access: 'daytime',
  },
];

// Центры спальных районов, вокруг которых разбрасываются демо-споты.
const districts: [string, number, number][] = [
  ['Купчино', 30.375, 59.83],
  ['Гражданка', 30.395, 60.02],
  ['Озерки', 30.325, 60.037],
  ['Ржевка', 30.49, 59.97],
  ['Автово', 30.26, 59.866],
  ['Приморский', 30.23, 60.0],
  ['Дыбенко', 30.475, 59.905],
];

const DEMO_SPOT_COUNT = 20;

/** Кандидаты в демо-споты; `{n}` в имени заменяется номером принятого спота. */
function demoCandidates(count: number): SeedSpot[] {
  return Array.from({ length: count }, () => {
    const [district, lon, lat] = pick(districts);
    const objectType = pick(['wall', 'low_wall', 'parapet', 'retaining_wall'] as const);
    const surface = pick(['asphalt', 'tiles', 'concrete', 'ground', 'grass'] as const);
    return {
      name: `Демо-спот {n} (${district})`,
      description: 'Демо-данные для разработки.',
      lon: lon + (rand() - 0.5) * 0.04,
      lat: lat + (rand() - 0.5) * 0.02,
      objectType,
      surface,
      needsPad: surface !== 'grass' && surface !== 'ground',
      heightM: Math.round((2 + rand() * 4) * 10) / 10,
      dryInRain: rand() < 0.25,
      lighting: rand() < 0.5,
      access: pick(['always', 'always', 'gated_yard', 'daytime'] as const),
    };
  });
}

const boulderRange = grades.filter(
  (g) => compareGrades(g, '5A') >= 0 && compareGrades(g, '7A') <= 0,
);
const leadRange = grades.filter((g) => compareGrades(g, '5A') >= 0 && compareGrades(g, '6B') <= 0);

function demoProblems(spotIndex: number) {
  const count = 1 + Math.floor(rand() * 5);
  return Array.from({ length: count }, (_, i) => {
    const discipline: Discipline = rand() < 0.85 ? 'boulder' : 'lead';
    const grade: Grade = pick(discipline === 'boulder' ? boulderRange : leadRange);
    const ascentCount = rand() < 0.2 ? 0 : Math.floor(rand() * 8);
    const points = ascentCount === 0 ? 0 : Math.min(ascentCount * 2, 6);
    return {
      name: `Демо-трасса ${spotIndex + 1}.${i + 1}`,
      discipline,
      grade,
      ascentCount,
      points,
      status: problemStatus(ascentCount, points),
    };
  });
}

const externalPlaces = [
  {
    kind: 'gym' as const,
    name: 'Скалодром «Луч» (летняя уличная стенка)',
    lon: 30.27767,
    lat: 59.96992,
    description: 'Платная летняя уличная стенка, пр. Динамо, 44Б. Координаты приблизительные.',
  },
  {
    kind: 'crag' as const,
    name: 'Треугольное озеро',
    lon: 29.03815,
    lat: 60.81495,
    description: 'Загородный скальный район, Выборгский район ЛО.',
  },
  {
    kind: 'crag' as const,
    name: 'Приозерск',
    lon: 30.12485,
    lat: 61.03853,
    description: 'Загородные скальные районы в окрестностях Приозерска.',
  },
];

// Демо-фото стены с разметкой (фото — Pexels, трассы выдуманы). Координаты меток — доли кадра.
const DEMO_PHOTO = new URL('./seed-assets/demo-wall.jpg', import.meta.url);
const DEMO_PHOTO_KEY = 'demo/wall-1.jpg';
const m = (kind: ProblemMark['kind'], x: number, y: number): ProblemMark => ({ kind, x, y });
const photoProblems = [
  {
    name: 'Ступени',
    grade: '5C' as Grade,
    ascentCount: 9,
    points: 6,
    marks: [
      m('hand', 0.1, 0.672),
      m('hand', 0.23, 0.672),
      m('foot', 0.2, 0.94),
      m('foot', 0.38, 0.94),
      m('hold', 0.2, 0.405),
      m('top', 0.46, 0.205),
    ],
  },
  {
    name: 'Выбоины',
    grade: '6B' as Grade,
    ascentCount: 1,
    points: 1,
    marks: [
      m('hand', 0.42, 0.41),
      m('hand', 0.53, 0.41),
      m('foot', 0.38, 0.94),
      m('foot', 0.62, 0.95),
      m('hold', 0.68, 0.4),
      m('hold', 0.74, 0.3),
      m('top', 0.89, 0.205),
    ],
  },
  {
    name: 'Ниша',
    grade: '6C' as Grade,
    ascentCount: 0,
    points: 0,
    marks: [
      m('hand', 0.77, 0.765),
      m('hand', 0.86, 0.765),
      m('foot', 0.62, 0.95),
      m('foot', 0.9, 0.95),
      m('hold', 0.68, 0.4),
      m('hold', 0.5, 0.41),
      m('top', 0.46, 0.205),
    ],
  },
];

/**
 * Перекодирует фото: sharp по умолчанию не переносит EXIF, XMP и геометки в результат.
 * Тот же путь пройдут и пользовательские фото (фаза 4).
 */
async function preparePhoto(file: URL) {
  const { data, info } = await sharp(await readFile(file))
    .rotate()
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });
  return { data: new Uint8Array(data), width: info.width, height: info.height };
}

async function main() {
  const env = loadEnv();
  const { sql } = createDb(env.DATABASE_URL);
  const s3 = s3Config(env);
  const photo = s3 ? await preparePhoto(DEMO_PHOTO) : undefined;
  if (s3 && photo) {
    const store = createS3PhotoStore(s3);
    await store.ensureBucket();
    await store.put(DEMO_PHOTO_KEY, photo.data, 'image/jpeg');
  } else {
    console.warn('S3 не настроен (S3_ENDPOINT и ключи в .env) — демо-фото стены пропущено.');
  }

  await sql.begin(async (tx) => {
    await tx`DELETE FROM spots WHERE is_demo`;
    await tx`DELETE FROM external_places`;

    let demoInserted = 0;
    let skipped = 0;
    const candidates = [...researchSpots, ...demoCandidates(DEMO_SPOT_COUNT * 5)];
    for (const [index, candidate] of candidates.entries()) {
      const isResearch = index < researchSpots.length;
      if (!isResearch && demoInserted >= DEMO_SPOT_COUNT) break;
      const [blocked] = await tx`
        SELECT 1 FROM forbidden_zones
        WHERE ST_Intersects(zone, ST_SetSRID(ST_MakePoint(${candidate.lon}, ${candidate.lat}), 4326))
        LIMIT 1`;
      if (blocked && !isResearch) {
        skipped++;
        continue;
      }
      const spot = isResearch
        ? candidate
        : { ...candidate, name: candidate.name.replace('{n}', String(++demoInserted)) };
      const [row] = await tx<{ id: string }[]>`
        INSERT INTO spots (name, description, location, object_type, surface, needs_pad, height_m,
          dry_in_rain, lighting, access, last_visit_at, is_demo)
        VALUES (${spot.name}, ${spot.description},
          ST_SetSRID(ST_MakePoint(${spot.lon}, ${spot.lat}), 4326), ${spot.objectType},
          ${spot.surface}, ${spot.needsPad}, ${spot.heightM}, ${spot.dryInRain}, ${spot.lighting},
          ${spot.access}, now() - ${`${Math.floor(rand() * 60)} days`}::interval, true)
        RETURNING id`;
      for (const p of demoProblems(index)) {
        await tx`
          INSERT INTO problems (spot_id, name, discipline, author_grade, grade, status,
            confirmation_points, ascent_count)
          VALUES (${row!.id}, ${p.name}, ${p.discipline}, ${p.grade}, ${p.grade}, ${p.status},
            ${p.points}, ${p.ascentCount})`;
      }
    }

    // Фото с разметкой — у первого демо-спота на стене: заменяем его случайные трассы трассами с фото.
    if (photo) {
      const [wallSpot] = await tx<{ id: string }[]>`
        SELECT id FROM spots
        WHERE is_demo AND name LIKE 'Демо-спот%' AND object_type IN ('wall', 'retaining_wall')
        ORDER BY created_at, name LIMIT 1`;
      if (wallSpot) {
        await tx`DELETE FROM problems WHERE spot_id = ${wallSpot.id}`;
        await tx`UPDATE spots SET needs_pad = true, surface = 'asphalt' WHERE id = ${wallSpot.id}`;
        const [ph] = await tx<{ id: string }[]>`
          INSERT INTO spot_photos (spot_id, s3_key, width, height, credit, moderation)
          VALUES (${wallSpot.id}, ${DEMO_PHOTO_KEY}, ${photo.width}, ${photo.height},
            'Фото стены: Pexels, пример', 'approved')
          RETURNING id`;
        for (const p of photoProblems) {
          await tx`
            INSERT INTO problems (spot_id, name, discipline, author_grade, grade, status,
              confirmation_points, ascent_count, photo_id, marks)
            VALUES (${wallSpot.id}, ${p.name}, 'boulder', ${p.grade}, ${p.grade},
              ${problemStatus(p.ascentCount, p.points)}, ${p.points}, ${p.ascentCount}, ${ph!.id},
              ${JSON.stringify(p.marks)}::jsonb)`;
        }
        console.log(`Фото с разметкой: спот ${wallSpot.id}`);
      }
    }

    for (const place of externalPlaces) {
      await tx`
        INSERT INTO external_places (kind, name, location, url, description)
        VALUES (${place.kind}, ${place.name}, ST_SetSRID(ST_MakePoint(${place.lon}, ${place.lat}), 4326),
          NULL, ${place.description})`;
    }
    console.log(
      `Споты: ${researchSpots.length} из исследования + ${demoInserted} демо, пропущено в запретных зонах: ${skipped}`,
    );
  });

  await sql.end();
}

await main();
