import { describe, expect, it } from 'vitest';

import { bboxContains, gradesBetween, spotMatchesFilters } from './spot-filters';
import type { SpotDetail } from './spots';

let seq = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;

const problem = (discipline: 'boulder' | 'lead', grade: '5B' | '6A' | '6C') => ({
  id: uuid(),
  name: grade,
  discipline,
  grade,
  status: 'project' as const,
  ascentCount: 0,
  photoId: null,
  marks: [],
});

const spot = (overrides: Partial<SpotDetail> = {}): SpotDetail => ({
  id: uuid(),
  name: 'Спот',
  location: { lon: 30.3, lat: 60 },
  disciplines: ['boulder'],
  needsPad: false,
  gradeMin: '5B',
  gradeMax: '6A',
  problemCount: 2,
  address: null,
  note: null,
  lastVisitAt: null,
  photos: [],
  problems: [problem('boulder', '5B'), problem('boulder', '6A')],
  ...overrides,
});

describe('spotMatchesFilters', () => {
  it('matches everything without filters', () => {
    expect(spotMatchesFilters(spot({ problems: [] }), {})).toBe(true);
  });

  it('checks spot attributes', () => {
    expect(spotMatchesFilters(spot(), { needsPad: false })).toBe(true);
    expect(spotMatchesFilters(spot(), { needsPad: true })).toBe(false);
  });

  it('needs one problem that fits discipline and grade range together', () => {
    const mixed = spot({ problems: [problem('boulder', '5B'), problem('lead', '6C')] });
    expect(spotMatchesFilters(mixed, { discipline: 'lead', gradeMin: '6B' })).toBe(true);
    expect(spotMatchesFilters(mixed, { discipline: 'boulder', gradeMin: '6B' })).toBe(false);
    expect(spotMatchesFilters(mixed, { gradeMax: '5C' })).toBe(true);
  });

  it('never matches a problem filter on a spot without problems', () => {
    expect(spotMatchesFilters(spot({ problems: [] }), { discipline: 'boulder' })).toBe(false);
  });
});

describe('helpers', () => {
  it('lists grades in an inclusive range', () => {
    expect(gradesBetween('6A', '6C')).toEqual(['6A', '6B', '6C']);
    expect(gradesBetween(undefined, '5B')).toEqual(['5A', '5B']);
  });

  it('checks a point against a bbox', () => {
    expect(bboxContains([30, 59, 31, 60], { lon: 30.5, lat: 59.5 })).toBe(true);
    expect(bboxContains([30, 59, 31, 60], { lon: 29, lat: 59.5 })).toBe(false);
  });
});
