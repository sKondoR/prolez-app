/**
 * Импорт запретных зон Санкт-Петербурга из OpenStreetMap (Overpass API) в forbidden_zones.
 *
 * Каждая категория загружается отдельным запросом. Все OSM-зоны заменяются целиком в одной
 * транзакции, поэтому повторный запуск идемпотентен. Буфер (50 м или 10 м для мелких объектов,
 * см. zone-buffer.ts) считается в PostGIS через geography — в метрах — и сохраняется в колонку zone.
 *
 * Не покрыто: официальный реестр ОКН (data.mkrf.ru) — в OSM размечена лишь часть объектов.
 */
import type { ForbiddenZoneCategory } from '@prolez/shared';

import type { Feature, Geometry } from 'geojson';
import osmtogeojson from 'osmtogeojson';

import { createDb } from '../db/client';
import { loadEnv } from '../env';
import { cachedOverpass } from './overpass';
import { bufferMeters } from './zone-buffer';

const AREA = 'area["ISO3166-2"="RU-SPE"]["admin_level"="4"]->.spb;';

// Порядок важен: объект, попавший в несколько категорий, получает первую (мост над ж/д — «мост»).
const queries: Record<ForbiddenZoneCategory, string[]> = {
  heritage: ['nwr["ref:okn"](area.spb);', 'nwr["heritage"](area.spb);'],
  bridge: ['way["bridge"]["bridge"!="no"](area.spb);', 'nwr["man_made"="bridge"](area.spb);'],
  railway: [
    'way["railway"~"^(rail|light_rail|narrow_gauge|subway|monorail|funicular)$"](area.spb);',
    'nwr["railway"~"^(station|halt|platform)$"](area.spb);',
    'nwr["landuse"="railway"](area.spb);',
  ],
  // Трамвайные пути сознательно не включены: они идут по улицам и закрыли бы половину города.
  transport: [
    'nwr["public_transport"="station"](area.spb);',
    'nwr["railway"="subway_entrance"](area.spb);',
    'nwr["aeroway"="aerodrome"](area.spb);',
  ],
  power: ['nwr["power"~"^(line|tower|substation|plant)$"](area.spb);'],
  communication: [
    'nwr["man_made"~"^(mast|tower)$"]["tower:type"="communication"](area.spb);',
    'nwr["man_made"="mast"](area.spb);',
    'nwr["telecom"](area.spb);',
  ],
  // Порты раньше промзон: портовые территории в OSM обычно размечены landuse=industrial.
  port: [
    'nwr["landuse"="port"](area.spb);',
    'nwr["industrial"="port"](area.spb);',
    'nwr["harbour"="yes"](area.spb);',
  ],
  industrial: ['nwr["landuse"="industrial"](area.spb);'],
};

interface ZoneRow {
  category: ForbiddenZoneCategory;
  source_id: string;
  name: string | null;
  buffer_m: number;
  geometry: Geometry;
}

async function main() {
  const env = loadEnv();
  const { sql } = createDb(env.DATABASE_URL);
  const seen = new Set<string>();
  const rows: ZoneRow[] = [];

  for (const [category, parts] of Object.entries(queries) as [ForbiddenZoneCategory, string[]][]) {
    console.log(`${category}: загрузка…`);
    const geojson = osmtogeojson(
      await cachedOverpass(
        'overpass',
        category,
        `[out:json][timeout:300];${AREA}(${parts.join('')});out geom;`,
      ),
      {
        flatProperties: true,
      },
    );
    let added = 0;
    for (const feature of geojson.features as Feature<Geometry, Record<string, unknown>>[]) {
      const id = String(feature.id);
      if (!feature.geometry || seen.has(id)) continue;
      seen.add(id);
      const tags = feature.properties ?? {};
      rows.push({
        category,
        source_id: id,
        name: typeof tags.name === 'string' ? tags.name : null,
        buffer_m: bufferMeters(category, tags),
        geometry: feature.geometry,
      });
      added++;
    }
    console.log(`${category}: ${added}`);
  }

  await sql.begin(async (tx) => {
    await tx`DELETE FROM forbidden_zones WHERE source = 'osm'`;
    for (let i = 0; i < rows.length; i += 500) {
      const batch = rows.slice(i, i + 500);
      await tx`
        INSERT INTO forbidden_zones (category, source, source_id, name, geom, zone)
        SELECT x.category::forbidden_category, 'osm', x.source_id, x.name, g.geom,
          ST_Buffer(g.geom::geography, x.buffer_m)::geometry
        FROM jsonb_to_recordset(${JSON.stringify(batch)}::jsonb)
          AS x(category text, source_id text, name text, buffer_m int, geometry jsonb)
        CROSS JOIN LATERAL (
          SELECT ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(x.geometry::text), 4326)) AS geom
        ) g
        ON CONFLICT (source, source_id) DO NOTHING`;
    }
  });

  console.log(`Готово: ${rows.length} зон`);
  await sql.end();
}

await main();
