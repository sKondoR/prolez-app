import { z } from 'zod';

export const disciplines = ['boulder', 'lead'] as const;
export const disciplineSchema = z.enum(disciplines);
export type Discipline = z.infer<typeof disciplineSchema>;

// Одна французская шкала для боулдеринга и трудности, без плюсов: 4A … 9C.
// Порядок в массиве и есть порядок сложности: индекс — «ступень лестницы».
export const grades = [
  ...[4, 5, 6, 7, 8, 9].flatMap((n) => ['A', 'B', 'C'].map((l) => `${n}${l}`)),
] as const;

export type Grade = (typeof grades)[number];
export const gradeSchema = z.enum(grades);

/** Стартовый потолок публикации по дисциплине: ниже него потолок не опускается. */
export const startingCeiling: Record<Discipline, Grade> = {
  boulder: '6B',
  lead: '5C',
};

export function isGrade(value: string): value is Grade {
  return (grades as readonly string[]).includes(value);
}

export function gradeIndex(grade: Grade): number {
  const index = grades.indexOf(grade);
  if (index === -1) {
    throw new RangeError(`Unknown grade: ${grade}`);
  }
  return index;
}

export function compareGrades(a: Grade, b: Grade): number {
  return gradeIndex(a) - gradeIndex(b);
}

/** Следующая подкатегория; на вершине шкалы возвращает её же. */
export function nextGrade(grade: Grade): Grade {
  return grades[Math.min(gradeIndex(grade) + 1, grades.length - 1)]!;
}

export function maxGrade(list: readonly Grade[]): Grade | undefined {
  return list.reduce<Grade | undefined>(
    (max, g) => (max === undefined || compareGrades(g, max) > 0 ? g : max),
    undefined,
  );
}
