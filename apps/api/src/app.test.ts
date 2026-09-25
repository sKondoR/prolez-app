import { describe, expect, it } from 'vitest';

import { buildApp } from './app';

describe('GET /health', () => {
  it('reports ok when the database answers', async () => {
    const app = buildApp({ pingDb: async () => {} });
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok', db: 'ok' });
  });

  it('reports degraded when the database is down', async () => {
    const app = buildApp({
      pingDb: async () => {
        throw new Error('connection refused');
      },
    });
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(503);
    expect(res.json()).toEqual({ status: 'degraded', db: 'down' });
  });
});
