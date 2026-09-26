import { type Grade, type SpotFilters, compareGrades } from '@prolez/shared';

/** Кнопка фильтра категорий: диапазон шкалы от `min` до `max` включительно. */
export interface GradeBand {
  label: string;
  min: Grade;
  max: Grade;
}

// Фильтр грубее шкалы: пятёрки и восьмёрки целиком, шестёрки и семёрки — по букве.
export const gradeBands: readonly GradeBand[] = [
  { label: '5', min: '5A', max: '5C' },
  { label: '6A', min: '6A', max: '6A' },
  { label: '6B', min: '6B', max: '6B' },
  { label: '6C', min: '6C', max: '6C' },
  { label: '7A', min: '7A', max: '7A' },
  { label: '7B', min: '7B', max: '7B' },
  { label: '7C', min: '7C', max: '7C' },
  { label: '8', min: '8A', max: '8C' },
];

type GradeRange = Pick<SpotFilters, 'gradeMin' | 'gradeMax'>;

/** Индекс кнопки, в которую попадает категория. */
export function bandOf(grade: Grade): number {
  const index = gradeBands.findIndex(
    (b) => compareGrades(grade, b.min) >= 0 && compareGrades(grade, b.max) <= 0,
  );
  // Кнопки покрывают всю шкалу от 5A до 8C без пропусков.
  return index;
}

/** Какие кнопки выделены: от `from` до `to` включительно, или ничего. */
export function selectedBands(range: GradeRange): { from: number; to: number } | undefined {
  const { gradeMin, gradeMax } = range;
  if (!gradeMin && !gradeMax) return undefined;
  return {
    from: gradeMin ? bandOf(gradeMin) : 0,
    to: gradeMax ? bandOf(gradeMax) : gradeBands.length - 1,
  };
}

function rangeOf(from: number, to: number): Required<GradeRange> {
  const [lo, hi] = from <= to ? [from, to] : [to, from];
  return { gradeMin: gradeBands[lo]!.min, gradeMax: gradeBands[hi]!.max };
}

/**
 * Касание кнопки. Первое касание выбирает одну кнопку, второе растягивает диапазон
 * до другой, повторное касание единственной выбранной снимает выбор, касание при
 * выбранном диапазоне начинает новый.
 */
export function pickBand(range: GradeRange, index: number): GradeRange {
  const selected = selectedBands(range);
  if (!selected || selected.from !== selected.to) return rangeOf(index, index);
  if (selected.from === index) return { gradeMin: undefined, gradeMax: undefined };
  return rangeOf(selected.from, index);
}

/** Подпись выбранного диапазона кнопками, например «5 – 6B». */
export function bandRangeLabel(range: GradeRange): string | undefined {
  const selected = selectedBands(range);
  if (!selected) return undefined;
  const from = gradeBands[selected.from]!.label;
  const to = gradeBands[selected.to]!.label;
  return from === to ? from : `${from} – ${to}`;
}
