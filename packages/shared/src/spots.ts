import { z } from 'zod';

import { disciplineSchema, gradeSchema } from './grades';
import { problemStatuses } from './ladder';
import { problemMarkSchema } from './marks';

export const lonLatSchema = z.object({
  lon: z.number().min(-180).max(180),
  lat: z.number().min(-90).max(90),
});
export type LonLat = z.infer<typeof lonLatSchema>;

/** bbox в формате `west,south,east,north` — как у MapLibre и GeoJSON. */
export const bboxSchema = z
  .string()
  .transform((value) => value.split(',').map(Number))
  .pipe(
    z
      .tuple([z.number(), z.number(), z.number(), z.number()])
      .refine(([w, s, e, n]) => w < e && s < n, 'bbox must be west,south,east,north'),
  );
export type Bbox = z.infer<typeof bboxSchema>;

const booleanParam = z.enum(['true', 'false']).transform((v) => v === 'true');

/** Фильтры карты. Все необязательны; диапазон категорий применяется к проблемам спота. */
export const spotFiltersSchema = z.object({
  discipline: disciplineSchema.optional(),
  gradeMin: gradeSchema.optional(),
  gradeMax: gradeSchema.optional(),
  needsPad: booleanParam.optional(),
});
export type SpotFiltersQuery = z.input<typeof spotFiltersSchema>;
export type SpotFilters = z.output<typeof spotFiltersSchema>;

export const spotsQuerySchema = spotFiltersSchema.extend({ bbox: bboxSchema });

export const spotSummarySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  location: lonLatSchema,
  disciplines: z.array(disciplineSchema),
  needsPad: z.boolean(),
  gradeMin: gradeSchema.nullable(),
  gradeMax: gradeSchema.nullable(),
  problemCount: z.number().int(),
});
export type SpotSummary = z.infer<typeof spotSummarySchema>;

export const problemSummarySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  discipline: disciplineSchema,
  grade: gradeSchema,
  status: z.enum(problemStatuses),
  ascentCount: z.number().int(),
  /** Фото, на котором размечена проблема; null — разметки на фото нет. */
  photoId: z.uuid().nullable(),
  marks: z.array(problemMarkSchema),
});
export type ProblemSummary = z.infer<typeof problemSummarySchema>;

export const photoModerationStatuses = ['pending', 'approved', 'rejected'] as const;

/** Фото стены. Отдаются только прошедшие модерацию; EXIF удалён. */
export const spotPhotoSchema = z.object({
  id: z.uuid(),
  /** Путь относительно адреса API, например `/photos/<id>`. */
  url: z.string().startsWith('/'),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  /** Подпись источника, если фото не авторское. */
  credit: z.string().nullable(),
});
export type SpotPhoto = z.infer<typeof spotPhotoSchema>;

export const spotDetailSchema = spotSummarySchema.extend({
  /** Адрес, как его написал автор спота. */
  address: z.string().nullable(),
  /** Примечание автора — свободный текст. */
  note: z.string().nullable(),
  lastVisitAt: z.iso.datetime().nullable(),
  photos: z.array(spotPhotoSchema),
  problems: z.array(problemSummarySchema),
});
export type SpotDetail = z.infer<typeof spotDetailSchema>;

export const forbiddenZoneCategories = [
  'heritage',
  'bridge',
  'railway',
  'transport',
  'power',
  'communication',
  'industrial',
  'port',
] as const;
export type ForbiddenZoneCategory = (typeof forbiddenZoneCategories)[number];

/** Буфер вокруг запретного объекта, внутри которого спот создать нельзя. */
export const FORBIDDEN_ZONE_BUFFER_M = 50;
/**
 * Буфер для мелких повсеместных объектов (дворовые ТП, уличные шкафы, мачты не для связи):
 * с 50 м они закрыли бы почти все дворы города. Сам объект и его окрестность всё равно запретны.
 */
export const MINOR_FORBIDDEN_ZONE_BUFFER_M = 10;

export const externalPlaceKinds = ['gym', 'crag'] as const;
export type ExternalPlaceKind = (typeof externalPlaceKinds)[number];

export const externalPlaceSchema = z.object({
  id: z.uuid(),
  kind: z.enum(externalPlaceKinds),
  name: z.string(),
  location: lonLatSchema,
  url: z.url().nullable(),
  description: z.string().nullable(),
});
export type ExternalPlace = z.infer<typeof externalPlaceSchema>;
