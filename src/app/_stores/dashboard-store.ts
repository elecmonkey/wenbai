'use client';

import { create } from 'zustand';

const REPO_SIDEBAR_WIDTH_KEY = 'wenbai-repo-sidebar-width';
const RECORD_LIST_WIDTH_KEY = 'wenbai-record-list-width';

const DEFAULT_REPO_SIDEBAR_WIDTH = 256; // w-64
const DEFAULT_RECORD_LIST_WIDTH = 320; // w-80

const getInitialWidth = (key: string, defaultWidth: number): number => {
  if (typeof window === 'undefined') {
    return defaultWidth;
  }
  const stored = localStorage.getItem(key);
  if (!stored) return defaultWidth;
  const parsed = Number.parseInt(stored, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultWidth;
};

type DashboardState = {
  openRepoIds: number[];
  activeRepoId: number | null;
  activeRecordId: number | null;
  recordDirty: boolean;
  recordSaving: boolean;
  repoSidebarWidth: number;
  recordListWidth: number;
  openRepoTab: (repoId: number) => void;
  activateRepoTab: (repoId: number) => void;
  closeRepoTab: (repoId: number) => void;
  setActiveRecordId: (id: number | null) => void;
  setRecordDirty: (dirty: boolean) => void;
  setRecordSaving: (saving: boolean) => void;
  setRepoSidebarWidth: (width: number) => void;
  setRecordListWidth: (width: number) => void;
  initialize: (
    openRepoIds: number[],
    activeRepoId: number | null,
    activeRecordId: number | null,
  ) => void;
  reset: () => void;
  registerSaveHandler: (handler: (() => Promise<boolean>) | null) => void;
  requestSave: () => Promise<boolean>;
  saveHandler: (() => Promise<boolean>) | null;
};

export const useDashboardStore = create<DashboardState>()((set, get) => ({
  openRepoIds: [],
  activeRepoId: null,
  activeRecordId: null,
  recordDirty: false,
  recordSaving: false,
  saveHandler: null,
  repoSidebarWidth: getInitialWidth(REPO_SIDEBAR_WIDTH_KEY, DEFAULT_REPO_SIDEBAR_WIDTH),
  recordListWidth: getInitialWidth(RECORD_LIST_WIDTH_KEY, DEFAULT_RECORD_LIST_WIDTH),
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
  setRepoSidebarWidth: (width) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(REPO_SIDEBAR_WIDTH_KEY, width.toString());
    }
    set({ repoSidebarWidth: width });
  },
  setRecordListWidth: (width) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(RECORD_LIST_WIDTH_KEY, width.toString());
    }
    set({ recordListWidth: width });
  },
  initialize: (openRepoIds, activeRepoId, activeRecordId) =>
    set({
      openRepoIds,
      activeRepoId,
      activeRecordId,
      recordDirty: false,
      recordSaving: false,
      saveHandler: null,
    }),
  reset: () =>
    set({
      openRepoIds: [],
      activeRepoId: null,
      activeRecordId: null,
      recordDirty: false,
      recordSaving: false,
      saveHandler: null,
    }),
  registerSaveHandler: (handler) => set({ saveHandler: handler }),
  requestSave: async () => {
    const handler = get().saveHandler;
    if (!handler) {
      return true;
    }
    try {
      return await handler();
    } catch (error) {
      console.error('保存当前条目失败', error);
      return false;
    }
  },
}));
