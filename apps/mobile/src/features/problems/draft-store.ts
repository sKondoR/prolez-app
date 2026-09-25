import type { Grade, ProblemMark } from '@prolez/shared';
import { create } from 'zustand';

/**
 * Черновик размеченной проблемы. Публикация на сервер появится вместе со входом (фаза 3),
 * до тех пор черновик живёт в телефоне. Сохранение между запусками — с MMKV в фазе 2.
 */
export interface ProblemDraft {
  id: string;
  spotId: string;
  photoId: string;
  name: string;
  grade: Grade;
  marks: ProblemMark[];
  createdAt: number;
}

interface DraftState {
  drafts: ProblemDraft[];
  addDraft: (draft: Omit<ProblemDraft, 'id' | 'createdAt'>) => ProblemDraft;
  removeDraft: (id: string) => void;
}

export const useDraftStore = create<DraftState>()((set) => ({
  drafts: [],
  addDraft: (input) => {
    const draft = { ...input, id: `draft-${Date.now()}`, createdAt: Date.now() };
    set((s) => ({ drafts: [...s.drafts, draft] }));
    return draft;
  },
  removeDraft: (id) => set((s) => ({ drafts: s.drafts.filter((d) => d.id !== id) })),
}));
