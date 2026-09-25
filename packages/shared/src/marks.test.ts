import { describe, expect, it } from 'vitest';

import { type ProblemMark, markingIssues, problemMarksSchema } from './marks';

const mark = (kind: ProblemMark['kind'], x = 0.5, y = 0.5): ProblemMark => ({ kind, x, y });

describe('markingIssues', () => {
  it('needs a hand start and exactly one top', () => {
    expect(markingIssues([])).toEqual(['needHand', 'needTop']);
    expect(markingIssues([mark('hand')])).toEqual(['needTop']);
    expect(markingIssues([mark('hand'), mark('top')])).toEqual([]);
  });

  it('allows two hands, two feet and many holds', () => {
    const marks = [
      mark('hand'),
      mark('hand'),
      mark('foot'),
      mark('foot'),
      ...Array.from({ length: 6 }, () => mark('hold')),
      mark('top'),
    ];
    expect(markingIssues(marks)).toEqual([]);
  });

  it('rejects more marks of a kind than the limit', () => {
    expect(markingIssues([mark('hand'), mark('hand'), mark('hand'), mark('top')])).toEqual([
      'tooManyHands',
    ]);
    expect(markingIssues([mark('hand'), mark('top'), mark('top')])).toEqual(['tooManyTops']);
  });
});

describe('problemMarksSchema', () => {
  it('keeps coordinates inside the photo frame', () => {
    expect(problemMarksSchema.safeParse([mark('hand', 1.2, 0.5), mark('top')]).success).toBe(false);
    expect(problemMarksSchema.safeParse([mark('hand', 0, 1), mark('top', 1, 0)]).success).toBe(
      true,
    );
  });

  it('accepts only complete marking', () => {
    expect(problemMarksSchema.safeParse([mark('hand')]).success).toBe(false);
  });
});
