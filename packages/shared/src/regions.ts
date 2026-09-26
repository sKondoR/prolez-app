import { z } from 'zod';

import { regionsData } from './regions.data';
import type { Bbox } from './spots';

/**
 * Регион — субъект РФ (код ISO 3166-2). Прямоугольники и точки подписи сгенерированы из OSM
 * скриптом apps/api/src/scripts/import-regions.ts и лежат в regions.data.ts.
 */
export interface RegionMeta {
  code: string;
  name: string;
  /** `west,south,east,north` — прямоугольник контура. */
  bbox: Bbox;
  /** Точка внутри контура для подписи и счётчика спотов: `[lon, lat]`. */
  label: [number, number];
}

export const regions = regionsData;

/** Регион по умолчанию: без геопозиции, без сети и без разрешения на геопозицию. */
export const DEFAULT_REGION_CODE = 'RU-SPE';

/**
 * Города федерального значения окружены областью: споты горожан за городом лежат в ней,
 * поэтому подложка города берёт и прямоугольник области.
 */
const basemapCompanions: Record<string, string> = {
  'RU-SPE': 'RU-LEN',
  'RU-MOW': 'RU-MOS',
};

export function findRegion(code: string): RegionMeta | undefined {
  return regions.find((r) => r.code === code);
}

export function unionBbox(a: Bbox, b: Bbox): Bbox {
  return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];
}

export function bboxIntersects(a: Bbox, b: Bbox): boolean {
  return a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
}

/** `inner` целиком внутри `outer`. */
export function bboxWithin(inner: Bbox, outer: Bbox): boolean {
  return (
    inner[0] >= outer[0] && inner[1] >= outer[1] && inner[2] <= outer[2] && inner[3] <= outer[3]
  );
}

/** Регион вместе с областью-спутником: их споты грузятся вместе, как и подложка. */
export function regionFamily(code: string): string[] {
  const companion = basemapCompanions[code];
  return companion ? [code, companion] : [code];
}

/** Прямоугольник, внутри которого для выбранного региона грузится подложка карты. */
export function basemapBbox(code: string): Bbox | undefined {
  const region = findRegion(code);
  if (!region) return undefined;
  const companion = basemapCompanions[code] && findRegion(basemapCompanions[code]);
  return companion ? unionBbox(region.bbox, companion.bbox) : region.bbox;
}

export const regionCodeSchema = z.string().regex(/^RU-[A-Z]{2,3}$/);

export const regionSummarySchema = z.object({
  code: regionCodeSchema,
  spotCount: z.number().int(),
});
export type RegionSummary = z.infer<typeof regionSummarySchema>;

export const regionLocateSchema = z.object({ code: regionCodeSchema.nullable() });
