import { type MarkKind, type ProblemMark, markLimits } from '@prolez/shared';

/** Состояние редактора разметки: метки, история для «Отменить» и текущий инструмент. */
export interface MarkingState {
  marks: ProblemMark[];
  history: { op: 'add' | 'remove'; mark: ProblemMark }[];
  tool: MarkKind;
}

export const emptyMarking: MarkingState = { marks: [], history: [], tool: 'hand' };

const countOf = (marks: readonly ProblemMark[], kind: MarkKind) =>
  marks.filter((m) => m.kind === kind).length;

/**
 * Ставит метку текущим инструментом. Сверх лимита (2 руки, 2 ноги, 1 топ) заменяется самая
 * старая метка этого вида. После второй руки инструмент сам переключается на ноги,
 * после второй ноги — на зацепы: так разметка идёт в естественном порядке.
 */
export function placeMark(state: MarkingState, x: number, y: number): MarkingState {
  const mark: ProblemMark = { kind: state.tool, x: clamp(x), y: clamp(y) };
  let marks = state.marks;
  const history = [...state.history];
  if (countOf(marks, mark.kind) >= markLimits[mark.kind]) {
    const oldest = marks.find((m) => m.kind === mark.kind)!;
    marks = marks.filter((m) => m !== oldest);
    history.push({ op: 'remove', mark: oldest });
  }
  marks = [...marks, mark];
  history.push({ op: 'add', mark });

  let tool = state.tool;
  if (tool === 'hand' && countOf(marks, 'hand') === markLimits.hand) tool = 'foot';
  else if (tool === 'foot' && countOf(marks, 'foot') === markLimits.foot) tool = 'hold';
  return { marks, history, tool };
}

export function removeMark(state: MarkingState, mark: ProblemMark): MarkingState {
  if (!state.marks.includes(mark)) return state;
  return {
    ...state,
    marks: state.marks.filter((m) => m !== mark),
    history: [...state.history, { op: 'remove', mark }],
  };
}

/** Отменяет последнее действие; замена сверх лимита — это два шага истории. */
export function undoMark(state: MarkingState): MarkingState {
  const last = state.history.at(-1);
  if (!last) return state;
  const history = state.history.slice(0, -1);
  const marks =
    last.op === 'add' ? state.marks.filter((m) => m !== last.mark) : [...state.marks, last.mark];
  return { ...state, marks, history };
}

export const selectTool = (state: MarkingState, tool: MarkKind): MarkingState => ({
  ...state,
  tool,
});

export const markCount = countOf;

/** Левая рука старта — та, что левее на фото: её значок отражается зеркально. */
export function isLeftHand(marks: readonly ProblemMark[], mark: ProblemMark): boolean {
  const hands = marks.filter((m) => m.kind === 'hand');
  return (
    hands.length === 2 && mark.kind === 'hand' && mark.x === Math.min(...hands.map((h) => h.x))
  );
}

const clamp = (v: number) => Math.min(1, Math.max(0, Math.round(v * 1000) / 1000));
