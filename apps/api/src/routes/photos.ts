import { sql } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { Db } from '../db/client';
import type { PhotoStore } from '../storage/photo-store';

export function photoRoutes(db: Db, store: PhotoStore): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(
      '/photos/:id',
      { schema: { params: z.object({ id: z.uuid() }) } },
      async (request, reply) => {
        // Фото на модерации или у скрытого спота наружу не отдаются.
        const [photo] = await db.execute<{ s3_key: string }>(sql`
          SELECT ph.s3_key FROM spot_photos ph JOIN spots s ON s.id = ph.spot_id
          WHERE ph.id = ${request.params.id} AND ph.moderation = 'approved' AND s.status = 'active'`);
        const file = photo ? await store.get(photo.s3_key) : null;
        if (!file) return reply.code(404).send({ message: 'Photo not found' });
        // Файл по id не меняется: новое фото — новый id. Кэш клиента нужен для офлайна.
        return reply
          .header('content-type', file.contentType)
          .header('cache-control', 'public, max-age=31536000, immutable')
          .send(Buffer.from(file.body));
      },
    );
  };
}
