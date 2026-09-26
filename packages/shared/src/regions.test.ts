import { describe, expect, it } from 'vitest';

import {
  basemapBbox,
  bboxIntersects,
  bboxWithin,
  regionFamily,
  regions,
  unionBbox,
} from './regions';

describe('regions', () => {
  it('extends a federal city basemap to the surrounding oblast', () => {
    const spb = regions.find((r) => r.code === 'RU-SPE')!;
    const len = regions.find((r) => r.code === 'RU-LEN')!;
    expect(basemapBbox('RU-SPE')).toEqual(unionBbox(spb.bbox, len.bbox));
    expect(basemapBbox('RU-LEN')).toEqual(len.bbox);
  });

  it('returns undefined for an unknown region', () => {
    expect(basemapBbox('RU-XXX')).toBeUndefined();
  });

  it('keeps every bbox within ±180° and ordered', () => {
    for (const r of regions) {
      const [w, s, e, n] = r.bbox;
      expect(w).toBeLessThan(e);
      expect(s).toBeLessThan(n);
      expect(w).toBeGreaterThanOrEqual(-180);
      expect(e).toBeLessThanOrEqual(180);
    }
  });

  it('detects bbox intersection', () => {
    expect(bboxIntersects([0, 0, 2, 2], [1, 1, 3, 3])).toBe(true);
    expect(bboxIntersects([0, 0, 1, 1], [2, 2, 3, 3])).toBe(false);
  });

  it('detects a bbox inside another', () => {
    expect(bboxWithin([1, 1, 2, 2], [0, 0, 3, 3])).toBe(true);
    expect(bboxWithin([1, 1, 4, 2], [0, 0, 3, 3])).toBe(false);
  });

  it('loads a federal city together with its oblast', () => {
    expect(regionFamily('RU-SPE')).toEqual(['RU-SPE', 'RU-LEN']);
    expect(regionFamily('RU-TA')).toEqual(['RU-TA']);
  });
});
