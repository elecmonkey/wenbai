'use client';

import { create } from 'zustand';

type DashboardState = {
  activeRepoId: number | null;
  activeRecordId: number | null;
  recordDirty: boolean;
  recordSaving: boolean;
  setActiveRepoId: (id: number | null) => void;
  setActiveRecordId: (id: number | null) => void;
  setRecordDirty: (dirty: boolean) => void;
  setRecordSaving: (saving: boolean) => void;
  initialize: (repoId: number | null, recordId: number | null) => void;
  reset: () => void;
};

export const useDashboardStore = create<DashboardState>((set) => ({
  activeRepoId: null,
  activeRecordId: null,
  recordDirty: false,
  recordSaving: false,
  setActiveRepoId: (id) =>
    set((state) => ({
      activeRepoId: id,
      activeRecordId: id === state.activeRepoId ? state.activeRecordId : null,
      recordDirty: id === state.activeRepoId ? state.recordDirty : false,
    })),
  setActiveRecordId: (id) => set({ activeRecordId: id, recordDirty: false }),
  setRecordDirty: (dirty) => set({ recordDirty: dirty }),
  setRecordSaving: (saving) => set({ recordSaving: saving }),
  initialize: (repoId, recordId) =>
    set({
      activeRepoId: repoId,
      activeRecordId: recordId,
      recordDirty: false,
      recordSaving: false,
    }),
  reset: () =>
    set({
      activeRepoId: null,
      activeRecordId: null,
      recordDirty: false,
      recordSaving: false,
    }),
}));
