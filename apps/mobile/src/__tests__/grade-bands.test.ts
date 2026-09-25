import { bandOf, bandRangeLabel, gradeBands, pickBand } from '@/features/map/grade-bands';

const idx = (label: string) => gradeBands.findIndex((b) => b.label === label);

describe('grade bands', () => {
  it('covers the scale from 4A without gaps', () => {
    expect(gradeBands.map((b) => b.label)).toEqual([
      '4',
      '5',
      '6A',
      '6B',
      '6C',
      '7A',
      '7B',
      '7C',
      '8',
    ]);
    expect(bandOf('4B')).toBe(idx('4'));
    expect(bandOf('6A')).toBe(idx('6A'));
    expect(bandOf('7C')).toBe(idx('7C'));
    expect(bandOf('9A')).toBe(idx('8'));
  });

  it('first tap selects one band with all its grades', () => {
    expect(pickBand({}, idx('6B'))).toEqual({ gradeMin: '6B', gradeMax: '6B' });
    expect(pickBand({}, idx('5'))).toEqual({ gradeMin: '5A', gradeMax: '5C' });
  });

  it('second tap stretches the range in either direction', () => {
    const one = pickBand({}, idx('6B'));
    expect(pickBand(one, idx('7A'))).toEqual({ gradeMin: '6B', gradeMax: '7A' });
    expect(pickBand(one, idx('4'))).toEqual({ gradeMin: '4A', gradeMax: '6B' });
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
