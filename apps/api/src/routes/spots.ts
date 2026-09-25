import {
  type Discipline,
  type Grade,
  type ProblemMark,
  type SpotDetail,
  type SpotSummary,
  compareGrades,
  grades,
  isGrade,
  spotDetailSchema,
  spotSummarySchema,
  spotsQuerySchema,
} from '@prolez/shared';
import { type SQL, sql } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { Db } from '../db/client';

/** Больше точек на экране карты всё равно не показать осмысленно. */
const MAX_SPOTS_PER_BBOX = 500;

type SpotRow = {
  id: string;
  name: string;
  lon: number;
  lat: number;
  needs_pad: boolean;
  dry_in_rain: boolean;
  disciplines: Discipline[];
  grades: string[];
};

function gradeRange(problemGrades: readonly string[]) {
  const sorted = problemGrades.filter(isGrade).sort(compareGrades);
  return { gradeMin: sorted[0] ?? null, gradeMax: sorted.at(-1) ?? null };
}

function toSummary(row: SpotRow): SpotSummary {
  return {
    id: row.id,
    name: row.name,
    location: { lon: row.lon, lat: row.lat },
    disciplines: row.disciplines,
    needsPad: row.needs_pad,
    dryInRain: row.dry_in_rain,
    ...gradeRange(row.grades),
    problemCount: row.grades.length,
  };
}

/** Категории шкалы в диапазоне [min, max]; границы необязательны. */
function gradesBetween(min: Grade | undefined, max: Grade | undefined): Grade[] {
  return grades.filter(
    (g) =>
      (min === undefined || compareGrades(g, min) >= 0) &&
      (max === undefined || compareGrades(g, max) <= 0),
  );
}

const spotColumns = sql`
  s.id, s.name, ST_X(s.location) AS lon, ST_Y(s.location) AS lat, s.needs_pad, s.dry_in_rain,
  -- ::text: иначе postgres.js вернёт массив enum строкой, если соединение открылось до миграции
  COALESCE(array_agg(DISTINCT p.discipline::text) FILTER (WHERE p.id IS NOT NULL), '{}') AS disciplines,
  COALESCE(array_agg(p.grade) FILTER (WHERE p.id IS NOT NULL), '{}') AS grades`;

export function spotRoutes(db: Db): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(
      '/spots',
      {
        schema: {
          querystring: spotsQuerySchema,
          response: { 200: z.array(spotSummarySchema) },
        },
      },
      async (request) => {
        const { bbox, discipline, gradeMin, gradeMax, dryInRain, needsPad } = request.query;
        const [west, south, east, north] = bbox;

        const where: SQL[] = [
          sql`s.status = 'active'`,
          sql`s.location && ST_MakeEnvelope(${west}, ${south}, ${east}, ${north}, 4326)`,
        ];
        if (dryInRain !== undefined) where.push(sql`s.dry_in_rain = ${dryInRain}`);
        if (needsPad !== undefined) where.push(sql`s.needs_pad = ${needsPad}`);

        // Дисциплина и категории — свойства проблем: спот подходит, если есть хотя бы одна такая проблема.
        if (discipline !== undefined || gradeMin !== undefined || gradeMax !== undefined) {
          const problemWhere: SQL[] = [sql`fp.spot_id = s.id`];
          if (discipline !== undefined) problemWhere.push(sql`fp.discipline = ${discipline}`);
          if (gradeMin !== undefined || gradeMax !== undefined) {
            const allowed = gradesBetween(gradeMin, gradeMax);
            // Drizzle разворачивает массив в список параметров `($1, $2, …)`.
            problemWhere.push(allowed.length > 0 ? sql`fp.grade IN ${allowed}` : sql`FALSE`);
          }
          where.push(
            sql`EXISTS (SELECT 1 FROM problems fp WHERE ${sql.join(problemWhere, sql` AND `)})`,
          );
        }

        const rows = await db.execute<SpotRow>(sql`
          SELECT ${spotColumns}
          FROM spots s
          LEFT JOIN problems p ON p.spot_id = s.id
          WHERE ${sql.join(where, sql` AND `)}
          GROUP BY s.id
          LIMIT ${MAX_SPOTS_PER_BBOX}`);
        return rows.map(toSummary);
      },
    );

    app.get(
      '/spots/:id',
      {
        schema: {
          params: z.object({ id: z.uuid() }),
          response: { 200: spotDetailSchema, 404: z.object({ message: z.string() }) },
        },
      },
      async (request, reply) => {
        const [spot] = await db.execute<
          SpotRow & {
            description: string | null;
            object_type: SpotDetail['objectType'];
            surface: SpotDetail['surface'];
            height_m: number | null;
            lighting: boolean;
            access: SpotDetail['access'];
            last_visit_at: Date | null;
          }
        >(sql`
          SELECT ${spotColumns}, s.description, s.object_type, s.surface, s.height_m, s.lighting,
            s.access, s.last_visit_at
          FROM spots s
          LEFT JOIN problems p ON p.spot_id = s.id
          WHERE s.id = ${request.params.id} AND s.status = 'active'
          GROUP BY s.id`);
        if (!spot) return reply.code(404).send({ message: 'Spot not found' });

        const problems = await db.execute<{
          id: string;
          name: string;
          discipline: Discipline;
          grade: Grade;
          status: SpotDetail['problems'][number]['status'];
          ascent_count: number;
          photo_id: string | null;
          marks: ProblemMark[];
        }>(sql`
          SELECT id, name, discipline, grade, status, ascent_count, photo_id, marks
          FROM problems WHERE spot_id = ${spot.id}`);

        const photos = await db.execute<{
          id: string;
          width: number;
          height: number;
          credit: string | null;
        }>(sql`
          SELECT id, width, height, credit FROM spot_photos
          WHERE spot_id = ${spot.id} AND moderation = 'approved'
          ORDER BY created_at`);
        // Разметка без видимого фото бессмысленна: фото на модерации — как будто его нет.
        const visiblePhotos = new Set(photos.map((ph) => ph.id));

        return {
          ...toSummary(spot),
          description: spot.description,
          objectType: spot.object_type,
          surface: spot.surface,
          heightM: spot.height_m,
          lighting: spot.lighting,
          access: spot.access,
          lastVisitAt: spot.last_visit_at ? new Date(spot.last_visit_at).toISOString() : null,
          photos: photos.map((ph) => ({
            id: ph.id,
            url: `/photos/${ph.id}`,
            width: ph.width,
            height: ph.height,
            credit: ph.credit,
          })),
          problems: problems
            .map((p) => ({
              id: p.id,
              name: p.name,
              discipline: p.discipline,
              grade: p.grade,
              status: p.status,
              ascentCount: p.ascent_count,
              ...(p.photo_id && visiblePhotos.has(p.photo_id)
                ? { photoId: p.photo_id, marks: p.marks }
                : { photoId: null, marks: [] }),
            }))
            .sort((a, b) => compareGrades(a.grade, b.grade)),
        };
      },
    );
  };
}
