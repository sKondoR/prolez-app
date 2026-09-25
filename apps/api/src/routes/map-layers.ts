import {
  type ExternalPlace,
  type ForbiddenZoneCategory,
  bboxSchema,
  externalPlaceSchema,
  forbiddenZoneCategories,
  lonLatSchema,
} from '@prolez/shared';
import { sql } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { Db } from '../db/client';

/** Слой запретных зон отдаётся только для «городского» масштаба: на весь город это десятки тысяч полигонов. */
const MAX_ZONE_BBOX_DEGREES = 0.25;
const MAX_ZONES_PER_BBOX = 3000;

const featureCollectionSchema = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(
    z.object({
      type: z.literal('Feature'),
      id: z.string(),
      geometry: z.unknown(),
      properties: z.object({
        category: z.enum(forbiddenZoneCategories),
        name: z.string().nullable(),
      }),
    }),
  ),
});

export function mapLayerRoutes(db: Db): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(
      '/forbidden-zones',
      {
        schema: {
          querystring: z.object({ bbox: bboxSchema }),
          response: {
            200: featureCollectionSchema,
            400: z.object({ message: z.string() }),
          },
        },
      },
      async (request, reply) => {
        const [west, south, east, north] = request.query.bbox;
        if (east - west > MAX_ZONE_BBOX_DEGREES || north - south > MAX_ZONE_BBOX_DEGREES) {
          return reply.code(400).send({ message: 'bbox is too large for forbidden zones layer' });
        }
        // Упрощение пропорционально размеру bbox: на экране разница не видна, а ответ в разы меньше.
        const tolerance = (east - west) / 2000;
        const rows = await db.execute<{
          id: string;
          category: ForbiddenZoneCategory;
          name: string | null;
          geometry: string;
        }>(sql`
          SELECT id, category, name,
            ST_AsGeoJSON(ST_SimplifyPreserveTopology(zone, ${tolerance}), 6) AS geometry
          FROM forbidden_zones
          WHERE zone && ST_MakeEnvelope(${west}, ${south}, ${east}, ${north}, 4326)
          LIMIT ${MAX_ZONES_PER_BBOX}`);

        return {
          type: 'FeatureCollection' as const,
          features: rows.map((r) => ({
            type: 'Feature' as const,
            id: r.id,
            geometry: JSON.parse(r.geometry) as unknown,
            properties: { category: r.category, name: r.name },
          })),
        };
      },
    );

    app.get(
      '/forbidden-zones/check',
      {
        schema: {
          querystring: z.object({
            lon: z.coerce.number().pipe(lonLatSchema.shape.lon),
            lat: z.coerce.number().pipe(lonLatSchema.shape.lat),
          }),
          response: {
            200: z.object({
              allowed: z.boolean(),
              categories: z.array(z.enum(forbiddenZoneCategories)),
            }),
          },
        },
      },
      async (request) => {
        const { lon, lat } = request.query;
        const rows = await db.execute<{ category: ForbiddenZoneCategory }>(sql`
          SELECT DISTINCT category FROM forbidden_zones
          WHERE ST_Intersects(zone, ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326))`);
        const categories = rows.map((r) => r.category);
        return { allowed: categories.length === 0, categories };
      },
    );

    app.get(
      '/external-places',
      { schema: { response: { 200: z.array(externalPlaceSchema) } } },
      async () => {
        const rows = await db.execute<{
          id: string;
          kind: ExternalPlace['kind'];
          name: string;
          lon: number;
          lat: number;
          url: string | null;
          description: string | null;
        }>(sql`
          SELECT id, kind, name, ST_X(location) AS lon, ST_Y(location) AS lat, url, description
          FROM external_places ORDER BY kind, name`);
        return rows.map(({ lon, lat, ...rest }) => ({ ...rest, location: { lon, lat } }));
      },
    );
  };
}
