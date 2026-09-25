import {
  accessKinds,
  disciplines,
  externalPlaceKinds,
  forbiddenZoneCategories,
  objectTypes,
  photoModerationStatuses,
  type ProblemMark,
  problemStatuses,
  surfaces,
} from '@prolez/shared';
import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

// Произвольная геометрия (линии мостов и ж/д, полигоны промзон). Читается и пишется через
// PostGIS-функции в SQL, поэтому в TS достаточно типа GeoJSON-строки.
const anyGeometry = customType<{ data: string; driverData: string }>({
  dataType: () => 'geometry(Geometry, 4326)',
});

// Встроенный geometry() из drizzle-orm теряет SRID в миграции, поэтому точка тоже задана явно.
const point = customType<{ data: string; driverData: string }>({
  dataType: () => 'geometry(Point, 4326)',
});

export const disciplineEnum = pgEnum('discipline', disciplines);
export const problemStatusEnum = pgEnum('problem_status', problemStatuses);
export const objectTypeEnum = pgEnum('object_type', objectTypes);
export const surfaceEnum = pgEnum('surface', surfaces);
export const accessEnum = pgEnum('access_kind', accessKinds);
export const spotStatusEnum = pgEnum('spot_status', ['active', 'hidden']);
export const forbiddenCategoryEnum = pgEnum('forbidden_category', forbiddenZoneCategories);
export const externalKindEnum = pgEnum('external_kind', externalPlaceKinds);
export const photoModerationEnum = pgEnum('photo_moderation', photoModerationStatuses);

export const spots = pgTable(
  'spots',
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
    description: text(),
    location: point().notNull(),
    objectType: objectTypeEnum().notNull(),
    surface: surfaceEnum().notNull(),
    needsPad: boolean().notNull(),
    heightM: real(),
    dryInRain: boolean().notNull().default(false),
    lighting: boolean().notNull().default(false),
    access: accessEnum().notNull().default('always'),
    lastVisitAt: timestamp({ withTimezone: true }),
    status: spotStatusEnum().notNull().default('active'),
    /** Демо-данные для разработки: в продакшен не выгружаются. */
    isDemo: boolean().notNull().default(false),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('spots_location_gist').using('gist', t.location)],
);

export const spotPhotos = pgTable(
  'spot_photos',
  {
    id: uuid().primaryKey().defaultRandom(),
    spotId: uuid()
      .notNull()
      .references(() => spots.id, { onDelete: 'cascade' }),
    /** Ключ объекта в S3. Файл уже без EXIF: он перекодируется перед загрузкой. */
    s3Key: text().notNull(),
    width: integer().notNull(),
    height: integer().notNull(),
    credit: text(),
    /** Автор модерирует фото уже в MVP; отдаются только одобренные. */
    moderation: photoModerationEnum().notNull().default('pending'),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('spot_photos_spot_id_idx').on(t.spotId)],
);

export const problems = pgTable(
  'problems',
  {
    id: uuid().primaryKey().defaultRandom(),
    spotId: uuid()
      .notNull()
      .references(() => spots.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    discipline: disciplineEnum().notNull(),
    /** Категория, заявленная автором. */
    authorGrade: text().notNull(),
    /** Текущая категория: после голосования может отличаться от авторской. */
    grade: text().notNull(),
    status: problemStatusEnum().notNull().default('project'),
    confirmationPoints: integer().notNull().default(0),
    ascentCount: integer().notNull().default(0),
    photoId: uuid().references(() => spotPhotos.id, { onDelete: 'set null' }),
    /** Разметка на фото (старт, ноги, зацепы, топ) в долях кадра. */
    marks: jsonb().$type<ProblemMark[]>().notNull().default([]),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('problems_spot_id_idx').on(t.spotId)],
);

export const forbiddenZones = pgTable(
  'forbidden_zones',
  {
    id: uuid().primaryKey().defaultRandom(),
    category: forbiddenCategoryEnum().notNull(),
    /** Источник и id объекта в нём, например `osm` + `way/123`. */
    source: text().notNull(),
    sourceId: text().notNull(),
    name: text(),
    /** Исходная геометрия объекта. */
    geom: anyGeometry().notNull(),
    /** Объект с буфером FORBIDDEN_ZONE_BUFFER_M: считается при импорте, по нему и проверка, и слой карты. */
    zone: anyGeometry().notNull(),
    importedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('forbidden_zones_zone_gist').using('gist', t.zone),
    uniqueIndex('forbidden_zones_source_uq').on(t.source, t.sourceId),
  ],
);

export const externalPlaces = pgTable('external_places', {
  id: uuid().primaryKey().defaultRandom(),
  kind: externalKindEnum().notNull(),
  name: text().notNull(),
  location: point().notNull(),
  url: text(),
  description: text(),
});
