'use client';

import { create } from 'zustand';

type DashboardState = {
  openRepoIds: number[];
  activeRepoId: number | null;
  activeRecordId: number | null;
  recordDirty: boolean;
  recordSaving: boolean;
  openRepoTab: (repoId: number) => void;
  activateRepoTab: (repoId: number) => void;
  closeRepoTab: (repoId: number) => void;
  setActiveRecordId: (id: number | null) => void;
  setRecordDirty: (dirty: boolean) => void;
  setRecordSaving: (saving: boolean) => void;
  initialize: (
    openRepoIds: number[],
    activeRepoId: number | null,
    activeRecordId: number | null,
  ) => void;
  reset: () => void;
};

export const useDashboardStore = create<DashboardState>()((set, get) => ({
  openRepoIds: [],
  activeRepoId: null,
  activeRecordId: null,
  recordDirty: false,
  recordSaving: false,
  openRepoTab: (repoId) =>
    set((state) => {
      if (state.openRepoIds.includes(repoId)) {
        if (state.activeRepoId === repoId) {
          return state;
        }
        return {
          openRepoIds: state.openRepoIds,
          activeRepoId: repoId,
          activeRecordId: null,
          recordDirty: false,
        };
      }

      const nextOpen = [...state.openRepoIds];
      if (state.activeRepoId !== null) {
        const activeIndex = nextOpen.indexOf(state.activeRepoId);
        if (activeIndex !== -1) {
          nextOpen.splice(activeIndex + 1, 0, repoId);
        } else {
          nextOpen.push(repoId);
        }
      } else {
        nextOpen.push(repoId);
      }

      return {
        openRepoIds: nextOpen,
        activeRepoId: repoId,
        activeRecordId: null,
        recordDirty: false,
      };
    }),
  activateRepoTab: (repoId) =>
    set((state) => {
      if (!state.openRepoIds.includes(repoId)) {
        return state;
      }
      if (state.activeRepoId === repoId) {
        return state;
      }
      return {
        openRepoIds: state.openRepoIds,
        activeRepoId: repoId,
        activeRecordId: null,
        recordDirty: false,
      };
    }),
  closeRepoTab: (repoId) => {
    const state = get();
    if (!state.openRepoIds.includes(repoId)) {
      return;
    }
    const closeIndex = state.openRepoIds.indexOf(repoId);
    const nextOpen = state.openRepoIds.filter((id) => id !== repoId);
    const closingActive = state.activeRepoId === repoId;

    let nextActive = state.activeRepoId;
    if (closingActive) {
      nextActive = nextOpen[closeIndex] ?? nextOpen[closeIndex - 1] ?? null;
    }

    set({
      openRepoIds: nextOpen,
      activeRepoId: nextActive,
      activeRecordId: closingActive ? null : state.activeRecordId,
      recordDirty: closingActive ? false : state.recordDirty,
    });
  },
  setActiveRecordId: (id) => set({ activeRecordId: id, recordDirty: false }),
  setRecordDirty: (dirty) => set({ recordDirty: dirty }),
  setRecordSaving: (saving) => set({ recordSaving: saving }),
  initialize: (openRepoIds, activeRepoId, activeRecordId) =>
    set({
      openRepoIds,
      activeRepoId,
      activeRecordId,
      recordDirty: false,
      recordSaving: false,
    }),
  reset: () =>
    set({
      openRepoIds: [],
      activeRepoId: null,
      activeRecordId: null,
      recordDirty: false,
      recordSaving: false,
    }),
}));
