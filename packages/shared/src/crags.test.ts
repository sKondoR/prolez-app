import { describe, expect, it } from 'vitest';

import { crags } from './crags';
import { findRegion } from './regions';
import { bboxContains } from './spot-filters';

describe('crags', () => {
  it('ids are unique', () => {
    expect(new Set(crags.map((c) => c.id)).size).toBe(crags.length);
  });

  it('every crag lies in Leningrad Oblast or Karelia', () => {
    const boxes = ['RU-LEN', 'RU-KR'].map((code) => findRegion(code)!.bbox);
    for (const { name, location: p } of crags) {
      expect(
        boxes.some((box) => bboxContains(box, p)),
        name,
      ).toBe(true);
    }
  });
});
