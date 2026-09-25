import { markingIssues } from '@prolez/shared';

import {
  emptyMarking,
  isLeftHand,
  markCount,
  placeMark,
  removeMark,
  selectTool,
  undoMark,
} from '@/features/problems/marking';

describe('marking editor', () => {
  it('walks hands → feet → holds as the start gets marked', () => {
    let s = placeMark(emptyMarking, 0.2, 0.6);
    expect(s.tool).toBe('hand');
    s = placeMark(s, 0.3, 0.6);
    expect(s.tool).toBe('foot');
    s = placeMark(placeMark(s, 0.2, 0.9), 0.4, 0.9);
    expect(s.tool).toBe('hold');
    expect(markCount(s.marks, 'hand')).toBe(2);
    expect(markCount(s.marks, 'foot')).toBe(2);
  });

  it('replaces the oldest mark when a kind is at its limit', () => {
    let s = selectTool(emptyMarking, 'top');
    s = placeMark(s, 0.5, 0.1);
    s = placeMark(s, 0.7, 0.2);
    expect(s.marks).toEqual([{ kind: 'top', x: 0.7, y: 0.2 }]);
    // Отмена возвращает прежний топ за два шага: убрать новый, вернуть старый.
    s = undoMark(undoMark(s));
    expect(s.marks).toEqual([{ kind: 'top', x: 0.5, y: 0.1 }]);
  });

  it('removes a tapped mark and undoes the removal', () => {
    let s = placeMark(emptyMarking, 0.2, 0.6);
    const [hand] = s.marks;
    s = removeMark(s, hand!);
    expect(s.marks).toEqual([]);
    expect(undoMark(s).marks).toEqual([hand]);
  });

  it('keeps coordinates inside the frame', () => {
    const s = placeMark(emptyMarking, 1.3, -0.2);
    expect(s.marks[0]).toMatchObject({ x: 1, y: 0 });
  });

  it('produces marking the server accepts once hand and top are set', () => {
    let s = placeMark(emptyMarking, 0.2, 0.6);
    expect(markingIssues(s.marks)).toEqual(['needTop']);
    s = placeMark(selectTool(s, 'top'), 0.5, 0.1);
    expect(markingIssues(s.marks)).toEqual([]);
  });

  it('mirrors the left hand of a two-hand start', () => {
    const s = placeMark(placeMark(emptyMarking, 0.4, 0.6), 0.2, 0.6);
    expect(s.marks.map((m) => isLeftHand(s.marks, m))).toEqual([false, true]);
  });
});
