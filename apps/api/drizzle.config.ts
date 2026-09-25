import { defineConfig } from 'drizzle-kit';

try {
  process.loadEnvFile();
} catch {
  // .env необязателен: в CI и на сервере переменные задаются окружением
}

export default defineConfig({
  dialect: 'postgresql',
  casing: 'snake_case',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL! },
  extensionsFilters: ['postgis'],
});
