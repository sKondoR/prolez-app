import { describe, expect, it } from 'vitest';

import { compareGrades, grades, isGrade, nextGrade } from './grades';
import {
  type ClimbedProblem,
  canPublish,
  compareProblems,
  climbingLevel,
  problemStatus,
  publicationCeiling,
  votePoints,
} from './ladder';

describe('grade scale', () => {
  it('orders grades by difficulty', () => {
    expect(compareGrades('6B', '6A')).toBeGreaterThan(0);
    expect(compareGrades('5C', '6A')).toBeLessThan(0);
    expect(grades[0]).toBe('5A');
    expect(grades.at(-1)).toBe('8C');
    expect(grades).toHaveLength(12);
  });

  it('has no plus subgrades at all', () => {
    expect(isGrade('5C+')).toBe(false);
    expect(isGrade('6A+')).toBe(false);
    expect(isGrade('8C+')).toBe(false);
    expect(isGrade('4C')).toBe(false);
    expect(isGrade('9A')).toBe(false);
    expect(isGrade('6a')).toBe(false);
  });

  it('steps one subgrade up and stays at the top', () => {
    expect(nextGrade('6B')).toBe('6C');
    expect(nextGrade('5C')).toBe('6A');
    expect(nextGrade('8C')).toBe('8C');
  });
});

describe('climbingLevel', () => {
  const me = 'me';
  const problem = (grade: ClimbedProblem['grade'], overrides: Partial<ClimbedProblem> = {}) => ({
    grade,
    status: 'confirmed' as const,
    authorId: 'other',
    ...overrides,
  });

  it('is the max grade of confirmed problems by other authors', () => {
    expect(climbingLevel(me, [problem('6A'), problem('6C'), problem('6B')])).toBe('6C');
  });

  it('ignores own and unconfirmed problems', () => {
    const climbed = [
      problem('7A', { authorId: me }),
      problem('7B', { status: 'unconfirmed' }),
      problem('6A'),
    ];
    expect(climbingLevel(me, climbed)).toBe('6A');
  });

  it('is undefined without counted ascents', () => {
    expect(climbingLevel(me, [problem('7A', { authorId: me })])).toBeUndefined();
  });
});

describe('publicationCeiling', () => {
  it('is the discipline starting ceiling without a level', () => {
    expect(publicationCeiling('boulder', undefined)).toBe('6B');
    expect(publicationCeiling('lead', undefined)).toBe('5C');
  });

  it('never drops below the starting ceiling', () => {
    expect(publicationCeiling('boulder', '5A')).toBe('6B');
    expect(publicationCeiling('lead', '5A')).toBe('5C');
  });

  it('is level plus one subgrade, shared across disciplines', () => {
    expect(publicationCeiling('boulder', '6C')).toBe('7A');
    expect(publicationCeiling('lead', '6C')).toBe('7A');
    expect(canPublish('boulder', '6C', '7A')).toBe(true);
    expect(canPublish('lead', '6C', '7B')).toBe(false);
  });
});

describe('confirmation', () => {
  it('gives 3 points when voter level is at least the problem grade', () => {
    expect(votePoints('6B', '6B')).toBe(3);
    expect(votePoints('7A', '6B')).toBe(3);
  });

  it('gives 1 point to weaker voters and voters without a level', () => {
    expect(votePoints('6A', '6B')).toBe(1);
    expect(votePoints(undefined, '6B')).toBe(1);
  });

  it('derives problem status', () => {
    expect(problemStatus(0, 0)).toBe('project');
    expect(problemStatus(2, 2)).toBe('unconfirmed');
    expect(problemStatus(1, 3)).toBe('confirmed');
  });
});

describe('compareProblems', () => {
  it('orders by grade, then confirmed before projects, then by name', () => {
    const problems = [
      { name: 'Трасса 2', grade: '6A', status: 'project' },
      { name: 'Трасса 10', grade: '6A', status: 'confirmed' },
      { name: 'Трасса 3', grade: '5C', status: 'project' },
      { name: 'Трасса 1', grade: '6A', status: 'confirmed' },
      { name: 'Трасса 4', grade: '6A', status: 'unconfirmed' },
    ] as const;
    expect([...problems].sort(compareProblems).map((p) => p.name)).toEqual([
      'Трасса 3',
      'Трасса 1',
      'Трасса 10',
      'Трасса 4',
      'Трасса 2',
    ]);
  });
});
