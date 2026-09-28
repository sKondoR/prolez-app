import { grades } from '@prolez/shared';

import { bandOf, bandRangeLabel, gradeBands, pickBand } from '@/features/map/grade-bands';

const idx = (label: string) => gradeBands.findIndex((b) => b.label === label);

describe('grade bands', () => {
  it('covers the whole scale 5A … 8C without gaps', () => {
    expect(gradeBands.map((b) => b.label)).toEqual(['5', '6A', '6B', '6C', '7A', '7B', '7C', '8']);
    expect(bandOf('5B')).toBe(idx('5'));
    expect(bandOf('6A')).toBe(idx('6A'));
    expect(bandOf('7C')).toBe(idx('7C'));
    expect(bandOf('8C')).toBe(idx('8'));
    for (const g of grades) expect(bandOf(g)).toBeGreaterThanOrEqual(0);
  });

  it('first tap selects one band with all its grades', () => {
    expect(pickBand({}, idx('6B'))).toEqual({ gradeMin: '6B', gradeMax: '6B' });
    expect(pickBand({}, idx('5'))).toEqual({ gradeMin: '5A', gradeMax: '5C' });
  });

  it('second tap stretches the range in either direction', () => {
    const one = pickBand({}, idx('6B'));
    expect(pickBand(one, idx('7A'))).toEqual({ gradeMin: '6B', gradeMax: '7A' });
    expect(pickBand(one, idx('5'))).toEqual({ gradeMin: '5A', gradeMax: '6B' });
  });

  it('tapping the only selected band clears it, tapping during a range starts over', () => {
    const one = pickBand({}, idx('6B'));
    expect(pickBand(one, idx('6B'))).toEqual({ gradeMin: undefined, gradeMax: undefined });
    const range = pickBand(one, idx('7A'));
    expect(pickBand(range, idx('5'))).toEqual({ gradeMin: '5A', gradeMax: '5C' });
  });

  it('labels the range by bands, including filters saved as single grades', () => {
    expect(bandRangeLabel({})).toBeUndefined();
    expect(bandRangeLabel({ gradeMin: '6B', gradeMax: '6B' })).toBe('6B');
    expect(bandRangeLabel({ gradeMin: '5A', gradeMax: '7C' })).toBe('5 – 7C');
    expect(bandRangeLabel({ gradeMin: '6A' })).toBe('6A – 8');
  });
});
