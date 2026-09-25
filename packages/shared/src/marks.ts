import { z } from 'zod';

/**
 * Разметка проблемы на фото стены: старт руками, старт ногами, зацепы, финиш (топ).
 * Координаты — доли кадра 0..1 от левого верхнего угла, поэтому не зависят от размера фото на экране.
 */
export const markKinds = ['hand', 'foot', 'hold', 'top'] as const;
export type MarkKind = (typeof markKinds)[number];

export const markLimits: Record<MarkKind, number> = { hand: 2, foot: 2, hold: 20, top: 1 };

export const problemMarkSchema = z.object({
  kind: z.enum(markKinds),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});
export type ProblemMark = z.infer<typeof problemMarkSchema>;

export type MarkingIssue =
  'needHand' | 'needTop' | 'tooManyHands' | 'tooManyFeet' | 'tooManyHolds' | 'tooManyTops';

const tooMany: Record<MarkKind, MarkingIssue> = {
  hand: 'tooManyHands',
  foot: 'tooManyFeet',
  hold: 'tooManyHolds',
  top: 'tooManyTops',
};

/** Что мешает опубликовать разметку. Пустой список — разметка полная. */
export function markingIssues(marks: readonly ProblemMark[]): MarkingIssue[] {
  const count = (kind: MarkKind) => marks.filter((m) => m.kind === kind).length;
  const issues: MarkingIssue[] = [];
  if (count('hand') === 0) issues.push('needHand');
  if (count('top') === 0) issues.push('needTop');
  for (const kind of markKinds) {
    if (count(kind) > markLimits[kind]) issues.push(tooMany[kind]);
  }
  return issues;
}

/** Разметка, которую сервер принимает и хранит: только полная. */
export const problemMarksSchema = z
  .array(problemMarkSchema)
  .refine((marks) => markingIssues(marks).length === 0, 'incomplete problem marking');
