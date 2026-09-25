import {
  FORBIDDEN_ZONE_BUFFER_M,
  type ForbiddenZoneCategory,
  MINOR_FORBIDDEN_ZONE_BUFFER_M,
} from '@prolez/shared';

/** Напряжение, начиная с которого подстанция считается крупной (питающий центр, а не дворовая ТП). */
const MAJOR_SUBSTATION_VOLTAGE = 35_000;

function maxVoltage(value: unknown): number {
  if (typeof value !== 'string') return 0;
  return Math.max(0, ...value.split(';').map(Number).filter(Number.isFinite));
}

/** Буфер вокруг OSM-объекта по его категории и тегам. */
export function bufferMeters(
  category: ForbiddenZoneCategory,
  tags: Record<string, unknown>,
): number {
  if (category === 'power') {
    if (tags.man_made === 'street_cabinet') return MINOR_FORBIDDEN_ZONE_BUFFER_M;
    if (tags.power === 'substation') {
      const minor =
        tags.substation === 'minor_distribution' ||
        (tags.substation === undefined && maxVoltage(tags.voltage) < MAJOR_SUBSTATION_VOLTAGE);
      if (minor) return MINOR_FORBIDDEN_ZONE_BUFFER_M;
    }
  }
  if (
    category === 'communication' &&
    tags.man_made === 'mast' &&
    tags['tower:type'] !== 'communication'
  ) {
    return MINOR_FORBIDDEN_ZONE_BUFFER_M;
  }
  return FORBIDDEN_ZONE_BUFFER_M;
}
