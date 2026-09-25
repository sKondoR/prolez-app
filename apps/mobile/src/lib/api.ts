import { Platform } from 'react-native';
import type { z } from 'zod';

// Эмулятор Android видит хост-машину по 10.0.2.2, а не по localhost.
const defaultApiUrl = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? defaultApiUrl;

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

type QueryValue = string | number | boolean | undefined;

/** GET к API с проверкой ответа по zod-схеме из @prolez/shared. */
export async function apiGet<T extends z.ZodType>(
  path: string,
  schema: T,
  query: Record<string, QueryValue> = {},
  signal?: AbortSignal,
): Promise<z.output<T>> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const qs = params.size > 0 ? `?${params}` : '';
  const res = await fetch(`${API_URL}${path}${qs}`, { signal });
  if (!res.ok) throw new ApiError(res.status, `GET ${path} → ${res.status}`);
  return schema.parse(await res.json());
}
