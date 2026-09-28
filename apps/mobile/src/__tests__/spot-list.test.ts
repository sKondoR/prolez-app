import type { ProblemSummary } from '@prolez/shared';

import {
  type MapSpot,
  approxDistance,
  distanceM,
  nearestSpot,
  problemsByGrade,
  spotsInView,
} from '@/features/map/spot-list';

const spot = (id: string, lon: number, lat: number): MapSpot => ({
  id,
  name: id,
  location: { lon, lat },
  disciplines: ['boulder'],
  needsPad: false,
  gradeMin: null,
  gradeMax: null,
  problemCount: 0,
});

const problem = (
  grade: ProblemSummary['grade'],
  status: ProblemSummary['status'],
): ProblemSummary => ({
  id: `${grade}-${status}`,
  name: grade,
  discipline: 'boulder',
  grade,
  status,
  ascentCount: 0,
  photoId: null,
  marks: [],
});

describe('spot list', () => {
  it('measures distance in meters', () => {
    // Градус широты — около 111 км.
    expect(distanceM({ lon: 30, lat: 59 }, { lon: 30, lat: 60 })).toBeCloseTo(111_195, -2);
  });

  it('keeps spots in view, nearest to the map center first', () => {
    const bbox = [30, 59, 31, 60] as const;
    const spots = [spot('edge', 30.05, 59.05), spot('center', 30.5, 59.5), spot('out', 32, 59.5)];
    expect(spotsInView(spots, [...bbox]).map((s) => s.id)).toEqual(['center', 'edge']);
  });

  it('finds the nearest spot', () => {
    const spots = [spot('far', 31, 60), spot('near', 30.1, 59.1)];
    expect(nearestSpot(spots, { lon: 30, lat: 59 })?.id).toBe('near');
    expect(nearestSpot([], { lon: 30, lat: 59 })).toBeUndefined();
  });

  it('orders problems by grade, confirmed first within a grade', () => {
    const sorted = problemsByGrade([
      problem('6B', 'project'),
      problem('5C', 'confirmed'),
      problem('6A', 'project'),
      problem('6A', 'confirmed'),
    ]);
    expect(sorted.map((p) => p.id)).toEqual([
      '5C-confirmed',
      '6A-confirmed',
      '6A-project',
      '6B-project',
    ]);
  });

  it('rounds distance for the soft «from you» hint', () => {
    expect(approxDistance(12)).toEqual({ unit: 'm', value: '50' });
    expect(approxDistance(376)).toEqual({ unit: 'm', value: '400' });
    expect(approxDistance(1240)).toEqual({ unit: 'km', value: '1,2' });
    expect(approxDistance(15_400)).toEqual({ unit: 'km', value: '15' });
  });
});
