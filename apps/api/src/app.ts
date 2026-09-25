import cors from '@fastify/cors';
import Fastify from 'fastify';
import {
  type ZodTypeProvider,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { Db } from './db/client';
import { mapLayerRoutes } from './routes/map-layers';
import { photoRoutes } from './routes/photos';
import { spotRoutes } from './routes/spots';
import type { PhotoStore } from './storage/photo-store';

export interface AppDeps {
  /** Проверка доступности БД для /health; бросает исключение, если БД недоступна. */
  pingDb: () => Promise<void>;
  /** Без БД поднимается только /health — так его можно тестировать изолированно. */
  db?: Db;
  /** Без хранилища фото маршрут /photos не поднимается. */
  photos?: PhotoStore;
}

export function buildApp(deps: AppDeps, opts: { logger?: boolean } = {}) {
  const app = Fastify({ logger: opts.logger ?? false }).withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  // Мобильному приложению CORS не нужен; он нужен веб-сборке Expo в режиме разработки.
  app.register(cors, { origin: true, methods: ['GET'] });

  app.get(
    '/health',
    {
      schema: {
        response: {
          200: z.object({ status: z.literal('ok'), db: z.literal('ok') }),
          503: z.object({ status: z.literal('degraded'), db: z.literal('down') }),
        },
      },
    },
    async (request, reply) => {
      try {
        await deps.pingDb();
        return { status: 'ok', db: 'ok' } as const;
      } catch (err) {
        request.log.error(err, 'database ping failed');
        return reply.code(503).send({ status: 'degraded', db: 'down' });
      }
    },
  );

  if (deps.db) {
    app.register(spotRoutes(deps.db));
    app.register(mapLayerRoutes(deps.db));
    if (deps.photos) app.register(photoRoutes(deps.db, deps.photos));
  }

  return app;
}
