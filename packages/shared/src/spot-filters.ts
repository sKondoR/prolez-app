import { type Grade, compareGrades, grades } from './grades';
import type { Bbox, LonLat, SpotDetail, SpotFilters } from './spots';

/** Категории шкалы в диапазоне [min, max]; границы необязательны. */
export function gradesBetween(min: Grade | undefined, max: Grade | undefined): Grade[] {
  return grades.filter(
    (g) =>
      (min === undefined || compareGrades(g, min) >= 0) &&
      (max === undefined || compareGrades(g, max) <= 0),
  );
}

/**
 * Подходит ли спот под фильтры карты. Та же логика, что в SQL у `GET /spots`: дисциплина и
 * категории — свойства проблем, спот подходит, если есть хотя бы одна такая проблема.
 * Клиент фильтрует ею споты выбранного региона, в том числе офлайн.
 */
export function spotMatchesFilters(spot: SpotDetail, filters: SpotFilters): boolean {
  const { discipline, gradeMin, gradeMax, needsPad } = filters;
  if (needsPad !== undefined && spot.needsPad !== needsPad) return false;
  if (discipline === undefined && gradeMin === undefined && gradeMax === undefined) return true;
  const allowed = new Set<Grade>(gradesBetween(gradeMin, gradeMax));
  return spot.problems.some(
    (p) => (discipline === undefined || p.discipline === discipline) && allowed.has(p.grade),
  );
}

export function bboxContains([west, south, east, north]: Bbox, { lon, lat }: LonLat): boolean {
  return lon >= west && lon <= east && lat >= south && lat <= north;
}
