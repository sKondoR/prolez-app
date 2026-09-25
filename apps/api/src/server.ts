import { buildApp } from './app';
import { createDb } from './db/client';
import { loadEnv, s3Config } from './env';
import { createS3PhotoStore } from './storage/photo-store';

const env = loadEnv();
const { db, sql } = createDb(env.DATABASE_URL);
const s3 = s3Config(env);

const app = buildApp(
  {
    db,
    photos: s3 ? createS3PhotoStore(s3) : undefined,
    pingDb: async () => {
      await sql`select 1`;
    },
  },
  { logger: true },
);

const shutdown = async () => {
  await app.close();
  await sql.end();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

await app.listen({ port: env.PORT, host: env.HOST });
