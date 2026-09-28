import {
  type Bbox,
  type LonLat,
  type ProblemSummary,
  type SpotSummary,
  bboxContains,
  compareProblems,
} from '@prolez/shared';

/**
 * Спот на карте. Споты выбранного региона приходят целиком, с проблемами; споты за пределами
 * подложки — из `/spots?bbox`, без них.
 */
export type MapSpot = SpotSummary & { problems?: ProblemSummary[] };

const EARTH_RADIUS_M = 6_371_000;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Расстояние по поверхности Земли в метрах (гаверсинус). */
export function distanceM(a: LonLat, b: LonLat): number {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export function bboxCenter([west, south, east, north]: Bbox): LonLat {
  return { lon: (west + east) / 2, lat: (south + north) / 2 };
}

/** Споты в кадре, ближние к центру карты — первыми. Геопозиция в порядке не участвует. */
export function spotsInView<T extends MapSpot>(spots: T[], bbox: Bbox): T[] {
  const center = bboxCenter(bbox);
  return spots
    .filter((s) => bboxContains(bbox, s.location))
    .map((s) => ({ s, d: distanceM(center, s.location) }))
    .sort((a, b) => a.d - b.d)
    .map(({ s }) => s);
}

export function nearestSpot<T extends MapSpot>(spots: T[], point: LonLat): T | undefined {
  let best: T | undefined;
  let bestD = Infinity;
  for (const s of spots) {
    const d = distanceM(point, s.location);
    if (d < bestD) {
      best = s;
      bestD = d;
    }
  }
  return best;
}

/** Проблемы спота в общем порядке: по категории, при равной — подтверждённые первыми. */
export function problemsByGrade(problems: ProblemSummary[]): ProblemSummary[] {
  return [...problems].sort(compareProblems);
}

/**
 * Примерное расстояние для подписи «~400 м от вас». Геопозиция в городе неточная,
 * поэтому до километра — шаг 50 м, дальше — десятые километра.
 */
export function approxDistance(meters: number): { unit: 'm' | 'km'; value: string } {
  if (meters < 950) return { unit: 'm', value: String(Math.max(50, Math.round(meters / 50) * 50)) };
  const km = Math.round(meters / 100) / 10;
  return { unit: 'km', value: (km >= 10 ? Math.round(km) : km).toString().replace('.', ',') };
}
