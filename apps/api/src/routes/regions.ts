import {
  lonLatSchema,
  regionCodeSchema,
  regionFamily,
  regionLocateSchema,
  regionSummarySchema,
  spotDetailSchema,
} from '@prolez/shared';
import { sql } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { Db } from '../db/client';
import { loadSpotDetails } from './spots';

export function regionRoutes(db: Db): FastifyPluginAsyncZod {
  return async (app) => {
    // Число спотов по регионам — для счётчиков на карте и в списке регионов.
    app.get(
      '/regions',
      { schema: { response: { 200: z.array(regionSummarySchema) } } },
      async () => {
        const rows = await db.execute<{ code: string; spot_count: number }>(sql`
          SELECT r.code, COUNT(s.id)::int AS spot_count
          FROM regions r
          LEFT JOIN spots s ON s.status = 'active' AND ST_Intersects(r.geom, s.location)
          GROUP BY r.code
          ORDER BY r.code`);
        return rows.map((r) => ({ code: r.code, spotCount: r.spot_count }));
      },
    );

    // Стартовый регион по точке. Геопозиция — мягкий сигнал: ошибка лишь предлагает не тот
    // регион, и пользователь его сменит. Точка вне всех регионов (море, заграница) — null.
    app.get(
      '/regions/locate',
      {
        schema: {
          querystring: z.object({
            lon: z.coerce.number().pipe(lonLatSchema.shape.lon),
            lat: z.coerce.number().pipe(lonLatSchema.shape.lat),
          }),
          response: { 200: regionLocateSchema },
        },
      },
      async (request) => {
        const { lon, lat } = request.query;
        const [row] = await db.execute<{ code: string }>(sql`
          SELECT code FROM regions
          WHERE ST_Intersects(geom, ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326))
          ORDER BY ST_Area(geom)
          LIMIT 1`);
        return { code: row?.code ?? null };
      },
    );

    // Все споты региона (с областью-спутником) полными карточками: клиент кладёт их в кэш,
    // и карта с карточками спотов работают без сети.
    app.get(
      '/regions/:code/spots',
      {
        schema: {
          params: z.object({ code: regionCodeSchema }),
          response: { 200: z.array(spotDetailSchema) },
        },
      },
      async (request) => {
        const codes = regionFamily(request.params.code);
        return loadSpotDetails(
          db,
          sql`EXISTS (SELECT 1 FROM regions r WHERE r.code IN ${codes} AND ST_Intersects(r.geom, s.location))`,
        );
      },
    );
  };
}
