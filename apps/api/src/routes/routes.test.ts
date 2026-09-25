import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildApp } from '../app';
import { createDb } from '../db/client';
import { createMemoryPhotoStore } from '../storage/photo-store';

// Интеграционные тесты на настоящем PostGIS: запросы с геометрией на моках не проверить.
let container: StartedPostgreSqlContainer;
let db: ReturnType<typeof createDb>;
let app: ReturnType<typeof buildApp>;

const BBOX = '30.2,59.9,30.5,60.1';
let dryBoulderSpotId: string;
let approvedPhotoId: string;
let pendingPhotoId: string;
const photoBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
const marks = [
  { kind: 'hand', x: 0.2, y: 0.6 },
  { kind: 'top', x: 0.5, y: 0.1 },
];

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgis/postgis:17-3.5').start();
  db = createDb(container.getConnectionUri());
  await db.sql`CREATE EXTENSION IF NOT EXISTS postgis`;
  await migrate(db.db, {
    migrationsFolder: new URL('../../drizzle', import.meta.url).pathname.replace(/^\/(\w:)/, '$1'),
  });

  const insertSpot = async (name: string, lon: number, lat: number, dry: boolean, pad: boolean) => {
    const [row] = await db.sql<{ id: string }[]>`
      INSERT INTO spots (name, location, object_type, surface, needs_pad, dry_in_rain)
      VALUES (${name}, ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326), 'wall', 'asphalt', ${pad}, ${dry})
      RETURNING id`;
    return row!.id;
  };
  const insertProblem = (spotId: string, discipline: string, grade: string) => db.sql`
    INSERT INTO problems (spot_id, name, discipline, author_grade, grade)
    VALUES (${spotId}, ${`${discipline} ${grade}`}, ${discipline}, ${grade}, ${grade})`;

  dryBoulderSpotId = await insertSpot('Сухой боулдер', 30.3, 60.0, true, false);
  await insertProblem(dryBoulderSpotId, 'boulder', '6A');
  await insertProblem(dryBoulderSpotId, 'boulder', '5B');
  const leadSpot = await insertSpot('Трудность', 30.4, 59.95, false, true);
  await insertProblem(leadSpot, 'lead', '6C');
  await insertSpot('Без проблем', 30.35, 60.05, false, true);
  await insertSpot('Далеко, вне bbox', 29.0, 61.0, false, false);

  // Запретная зона: линия «моста» с буфером 50 м.
  await db.sql`
    INSERT INTO forbidden_zones (category, source, source_id, name, geom, zone)
    SELECT 'bridge', 'test', 'way/1', 'Тестовый мост', g, ST_Buffer(g::geography, 50)::geometry
    FROM (SELECT ST_SetSRID(ST_MakeLine(ST_MakePoint(30.30, 59.93), ST_MakePoint(30.31, 59.93)), 4326) AS g) t`;

  // Фото: одно одобренное с размеченной проблемой, одно на модерации.
  const photos = createMemoryPhotoStore();
  await photos.put('spots/approved.jpg', photoBytes, 'image/jpeg');
  await photos.put('spots/pending.jpg', photoBytes, 'image/jpeg');
  const insertPhoto = async (key: string, moderation: string) => {
    const [row] = await db.sql<{ id: string }[]>`
      INSERT INTO spot_photos (spot_id, s3_key, width, height, credit, moderation)
      VALUES (${dryBoulderSpotId}, ${key}, 1200, 1800, 'Пример', ${moderation})
      RETURNING id`;
    return row!.id;
  };
  approvedPhotoId = await insertPhoto('spots/approved.jpg', 'approved');
  pendingPhotoId = await insertPhoto('spots/pending.jpg', 'pending');
  await db.sql`
    UPDATE problems SET photo_id = ${approvedPhotoId}, marks = ${JSON.stringify(marks)}::jsonb
    WHERE spot_id = ${dryBoulderSpotId} AND grade = '6A'`;
  await db.sql`
    UPDATE problems SET photo_id = ${pendingPhotoId}, marks = ${JSON.stringify(marks)}::jsonb
    WHERE spot_id = ${dryBoulderSpotId} AND grade = '5B'`;

  app = buildApp({ db: db.db, photos, pingDb: async () => {} });
}, 180_000);

afterAll(async () => {
  await app?.close();
  await db?.sql.end();
  await container?.stop();
});

const getSpots = async (query = '') => {
  const res = await app.inject({ method: 'GET', url: `/spots?bbox=${BBOX}${query}` });
  expect(res.statusCode).toBe(200);
  return (res.json() as { name: string }[]).map((s) => s.name).sort();
};

describe('GET /spots', () => {
  it('returns spots inside bbox only', async () => {
    expect(await getSpots()).toEqual(['Без проблем', 'Сухой боулдер', 'Трудность']);
  });

  it('filters by spot attributes', async () => {
    expect(await getSpots('&dryInRain=true')).toEqual(['Сухой боулдер']);
    expect(await getSpots('&needsPad=true')).toEqual(['Без проблем', 'Трудность']);
  });

  it('filters by discipline and grade range of problems', async () => {
    expect(await getSpots('&discipline=lead')).toEqual(['Трудность']);
    expect(await getSpots('&gradeMin=6A&gradeMax=6B')).toEqual(['Сухой боулдер']);
    expect(await getSpots('&discipline=boulder&gradeMin=6C')).toEqual([]);
  });

  it('summarises grades on the one shared scale', async () => {
    const res = await app.inject({ method: 'GET', url: `/spots?bbox=${BBOX}&dryInRain=true` });
    expect(res.json()[0]).toMatchObject({ gradeMin: '5B', gradeMax: '6A', problemCount: 2 });
  });

  it('rejects malformed bbox and unknown grades', async () => {
    expect((await app.inject({ method: 'GET', url: '/spots?bbox=1,2,3' })).statusCode).toBe(400);
    expect(
      (await app.inject({ method: 'GET', url: `/spots?bbox=${BBOX}&gradeMin=6a` })).statusCode,
    ).toBe(400);
  });
});

describe('GET /spots/:id', () => {
  it('returns detail with problems sorted by grade', async () => {
    const res = await app.inject({ method: 'GET', url: `/spots/${dryBoulderSpotId}` });
    expect(res.statusCode).toBe(200);
    expect(res.json().problems.map((p: { grade: string }) => p.grade)).toEqual(['5B', '6A']);
  });

  it('returns approved photos and marks only on visible photos', async () => {
    const res = await app.inject({ method: 'GET', url: `/spots/${dryBoulderSpotId}` });
    const body = res.json();
    expect(body.photos).toEqual([
      {
        id: approvedPhotoId,
        url: `/photos/${approvedPhotoId}`,
        width: 1200,
        height: 1800,
        credit: 'Пример',
      },
    ]);
    const byGrade = Object.fromEntries(body.problems.map((p: { grade: string }) => [p.grade, p]));
    expect(byGrade['6A']).toMatchObject({ photoId: approvedPhotoId, marks });
    // Проблема на фото с модерации отдаётся без разметки.
    expect(byGrade['5B']).toMatchObject({ photoId: null, marks: [] });
  });

  it('returns 404 for unknown spot', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/spots/00000000-0000-4000-8000-000000000000',
    });
    expect(res.statusCode).toBe(404);
  });
});

describe('GET /photos/:id', () => {
  it('serves an approved photo with long cache', async () => {
    const res = await app.inject({ method: 'GET', url: `/photos/${approvedPhotoId}` });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('image/jpeg');
    expect(res.headers['cache-control']).toContain('immutable');
    expect(new Uint8Array(res.rawPayload)).toEqual(photoBytes);
  });

  it('hides photos awaiting moderation', async () => {
    const res = await app.inject({ method: 'GET', url: `/photos/${pendingPhotoId}` });
    expect(res.statusCode).toBe(404);
  });
});

describe('forbidden zones', () => {
  it('blocks points within 50 m of a bridge and allows points farther away', async () => {
    // 1e-4° широты ≈ 11 м, 7e-4° ≈ 78 м.
    const near = await app.inject({
      method: 'GET',
      url: '/forbidden-zones/check?lon=30.305&lat=59.9304',
    });
    expect(near.json()).toEqual({ allowed: false, categories: ['bridge'] });
    const far = await app.inject({
      method: 'GET',
      url: '/forbidden-zones/check?lon=30.305&lat=59.9307',
    });
    expect(far.json()).toEqual({ allowed: true, categories: [] });
  });

  it('serves the zones layer for a city-scale bbox and refuses a huge one', async () => {
    const layer = await app.inject({
      method: 'GET',
      url: '/forbidden-zones?bbox=30.25,59.9,30.35,59.95',
    });
    expect(layer.json().features).toHaveLength(1);
    expect(layer.json().features[0].properties).toEqual({
      category: 'bridge',
      name: 'Тестовый мост',
    });
    const huge = await app.inject({ method: 'GET', url: '/forbidden-zones?bbox=29,59,31,61' });
    expect(huge.statusCode).toBe(400);
  });
});
