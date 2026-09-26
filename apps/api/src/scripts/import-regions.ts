/**
 * Импорт регионов (субъектов РФ) из OpenStreetMap: `admin_level=4` с кодом ISO 3166-2 `RU-*`.
 *
 * 1. Контуры, упрощённые до ~50 м, заменяют таблицу regions: по ним сервер определяет регион
 *    по точке (/regions/locate) и считает споты региона.
 * 2. Генерируются два файла для клиента:
 *    - packages/shared/src/regions.data.ts — код, название, прямоугольник и точка подписи;
 *    - apps/mobile/src/features/regions/region-shapes.json — сильно упрощённые контуры для фона
 *      карты вне выбранного региона. Упрощает mapshaper: у соседей остаётся общая граница, без щелей.
 *
 * Повторный запуск берёт ответы Overpass из кэша (.cache/regions), --refresh — скачать заново.
 */
import { writeFile } from 'node:fs/promises';

import type { Feature, FeatureCollection, Geometry } from 'geojson';
import mapshaper from 'mapshaper';
import osmtogeojson from 'osmtogeojson';

import { createDb } from '../db/client';
import { loadEnv } from '../env';
import { cachedOverpass } from './overpass';

const LIST_QUERY =
  '[out:json][timeout:120];rel["boundary"="administrative"]["admin_level"="4"]["ISO3166-2"~"^RU-"];out tags;';
/** Точность контура в БД: ~50 м хватает, чтобы отличить город от окружающей области. */
const DB_SIMPLIFY_DEGREES = 0.0005;
/** Доля точек, которую mapshaper оставляет в контурах для бандла. */
const BUNDLE_SIMPLIFY = '3%';

const SHARED_DATA = new URL('../../../../packages/shared/src/regions.data.ts', import.meta.url);
const MOBILE_SHAPES = new URL(
  '../../../mobile/src/features/regions/region-shapes.json',
  import.meta.url,
);

interface OsmRelation {
  id: number;
  tags: Record<string, string>;
}

async function loadRegion(relation: OsmRelation) {
  const code = relation.tags['ISO3166-2']!;
  const data = await cachedOverpass(
    'regions',
    code,
    `[out:json][timeout:280];rel(${relation.id});out geom;`,
  );
  const geojson = osmtogeojson(data) as FeatureCollection;
  const feature = geojson.features.find((f) => f.id === `relation/${relation.id}`);
  const type = feature?.geometry?.type;
  if (!feature || (type !== 'Polygon' && type !== 'MultiPolygon')) {
    throw new Error(`${code}: контур не собрался (${type ?? 'нет геометрии'})`);
  }
  return {
    code,
    name: relation.tags['name:ru'] ?? relation.tags.name!,
    geometry: feature.geometry,
  };
}

async function main() {
  const env = loadEnv();
  const { sql } = createDb(env.DATABASE_URL);

  const list = (await cachedOverpass('regions', '_list', LIST_QUERY)) as {
    elements: OsmRelation[];
  };
  const regions: Awaited<ReturnType<typeof loadRegion>>[] = [];
  for (const relation of list.elements) {
    const region = await loadRegion(relation);
    console.log(`${region.code} ${region.name}`);
    regions.push(region);
  }

  await sql.begin(async (tx) => {
    await tx`DELETE FROM regions`;
    for (const r of regions) {
      await tx`
        INSERT INTO regions (code, name, geom)
        SELECT ${r.code}, ${r.name},
          ST_Multi(ST_CollectionExtract(ST_MakeValid(
            ST_SimplifyPreserveTopology(
              ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(r.geometry)}), 4326),
              ${DB_SIMPLIFY_DEGREES}
            )), 3))`;
    }
  });

  // Чукотка пересекает 180-й меридиан: прямоугольник и точку подписи считаем в долготах 0..360,
  // иначе прямоугольник растянется на весь мир.
  const meta = await sql<
    { code: string; name: string; bbox: number[]; label: number[]; geometry: string }[]
  >`
    SELECT code, name,
      ARRAY[ST_XMin(e), ST_YMin(e), ST_XMax(e), ST_YMax(e)] AS bbox,
      ARRAY[ST_X(l), ST_Y(l)] AS label,
      ST_AsGeoJSON(geom, 4) AS geometry
    FROM (
      SELECT code, name, geom, crosses,
        ST_Envelope(CASE WHEN crosses THEN ST_ShiftLongitude(geom) ELSE geom END) AS e,
        ST_PointOnSurface(CASE WHEN crosses THEN ST_ShiftLongitude(geom) ELSE geom END) AS l
      FROM (SELECT *, ST_XMax(geom) - ST_XMin(geom) > 180 AS crosses FROM regions) r
    ) t
    ORDER BY code`;

  const round = (v: number) => Math.round(v * 1000) / 1000;
  const toLon = (v: number) => (v > 180 ? v - 360 : v);
  const entries = meta
    .map((r) => ({
      code: r.code,
      name: r.name,
      // Подложка не бывает шире ±180°: восточный хвост за меридианом останется без неё.
      bbox: [
        round(r.bbox[0]!),
        round(r.bbox[1]!),
        round(Math.min(r.bbox[2]!, 180)),
        round(r.bbox[3]!),
      ],
      label: [round(toLon(r.label[0]!)), round(r.label[1]!)],
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'));

  await writeFile(
    SHARED_DATA,
    [
      '// Сгенерировано apps/api/src/scripts/import-regions.ts из OSM — не редактировать вручную.',
      "import type { RegionMeta } from './regions';",
      '',
      `export const regionsData: readonly RegionMeta[] = ${JSON.stringify(entries, null, 2)};`,
      '',
    ].join('\n'),
  );

  const collection: FeatureCollection = {
    type: 'FeatureCollection',
    features: meta.map((r): Feature => ({
      type: 'Feature',
      properties: { code: r.code },
      geometry: JSON.parse(r.geometry) as Geometry,
    })),
  };
  const output = await mapshaper.applyCommands(
    `-i in.json -simplify ${BUNDLE_SIMPLIFY} keep-shapes -o out.json precision=0.001`,
    { 'in.json': collection },
  );
  const shapes = output['out.json']!.toString();
  await writeFile(MOBILE_SHAPES, shapes);

  console.log(
    `Готово: ${entries.length} регионов, контуры для бандла — ${Math.round(shapes.length / 1024)} КБ`,
  );
  await sql.end();
}

await main();
