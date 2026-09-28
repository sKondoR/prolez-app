import {
  type Discipline,
  type Grade,
  compareGrades,
  maxGrade,
  nextGrade,
  startingCeiling,
} from './grades';

export const problemStatuses = ['project', 'unconfirmed', 'confirmed'] as const;
export type ProblemStatus = (typeof problemStatuses)[number];

const statusOrder: Record<ProblemStatus, number> = { confirmed: 0, unconfirmed: 1, project: 2 };

/**
 * Порядок проблем спота везде (карточка, шторка карты): по возрастанию категории,
 * при равной — сначала подтверждённые, потом неподтверждённые и проекты, дальше по названию.
 */
export function compareProblems(
  a: { grade: Grade; status: ProblemStatus; name: string },
  b: { grade: Grade; status: ProblemStatus; name: string },
): number {
  return (
    compareGrades(a.grade, b.grade) ||
    statusOrder[a.status] - statusOrder[b.status] ||
    a.name.localeCompare(b.name, 'ru', { numeric: true })
  );
}

/** Сколько очков нужно для подтверждения категории. */
export const CONFIRMATION_THRESHOLD = 3;
const STRONG_VOTE_POINTS = 3;
const WEAK_VOTE_POINTS = 1;

export interface ClimbedProblem {
  grade: Grade;
  status: ProblemStatus;
  authorId: string;
}

/**
 * Уровень = максимальная категория чужой подтверждённой проблемы, которую пролез пользователь.
 * Боулдеринг и трудность — одна лестница. Свои проблемы не засчитываются никак.
 * `undefined` — уровня ещё нет.
 */
export function climbingLevel(
  userId: string,
  climbed: readonly ClimbedProblem[],
): Grade | undefined {
  return maxGrade(
    climbed.filter((p) => p.status === 'confirmed' && p.authorId !== userId).map((p) => p.grade),
  );
}

/** Потолок публикации = уровень + 1 подкатегория, но не ниже стартового для дисциплины. */
export function publicationCeiling(discipline: Discipline, level: Grade | undefined): Grade {
  const start = startingCeiling[discipline];
  if (level === undefined) return start;
  const next = nextGrade(level);
  return compareGrades(next, start) > 0 ? next : start;
}

export function canPublish(
  discipline: Discipline,
  level: Grade | undefined,
  grade: Grade,
): boolean {
  return compareGrades(grade, publicationCeiling(discipline, level)) <= 0;
}

/**
 * Очки голоса пролезшего: уровень не ниже категории проблемы — 3, ниже (или уровня нет) — 1.
 */
export function votePoints(voterLevel: Grade | undefined, problemGrade: Grade): number {
  if (voterLevel !== undefined && compareGrades(voterLevel, problemGrade) >= 0) {
    return STRONG_VOTE_POINTS;
  }
  return WEAK_VOTE_POINTS;
}

/**
 * Статус проблемы по числу пролазов и набранным очкам:
 * никто не пролез (включая автора) — проект; набрано 3 очка — подтверждена.
 */
export function problemStatus(ascentCount: number, confirmationPoints: number): ProblemStatus {
  if (ascentCount === 0) return 'project';
  return confirmationPoints >= CONFIRMATION_THRESHOLD ? 'confirmed' : 'unconfirmed';
}
