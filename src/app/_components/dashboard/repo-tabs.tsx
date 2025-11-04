'use client';

import { useDashboardStore } from '@/app/_stores/dashboard-store';
import { useReposQuery } from '@/app/_queries/repos';
import { SaveStatusIndicator } from './save-status-indicator';

export function RepoTabs() {
  const { data: repos = [], isLoading } = useReposQuery();
  const activeRepoId = useDashboardStore((state) => state.activeRepoId);
  const openRepoIds = useDashboardStore((state) => state.openRepoIds);
  const activateRepoTab = useDashboardStore(
    (state) => state.activateRepoTab,
  );
  const closeRepoTab = useDashboardStore((state) => state.closeRepoTab);
  const requestSave = useDashboardStore((state) => state.requestSave);
  const recordDirty = useDashboardStore((state) => state.recordDirty);
  const recordSaving = useDashboardStore((state) => state.recordSaving);

  const repoMap = new Map(repos.map((repo) => [repo.id, repo]));

  return (
    <header className="border-b border-neutral-200 bg-white px-4">
      <div className="overflow-x-auto scrollbar-thin">
        <div className="inline-flex min-w-full items-center gap-2 py-2 text-sm">
          {isLoading ? (
            <div className="flex h-10 items-center px-3 text-neutral-500">
              加载资料库标签…
            </div>
          ) : openRepoIds.length === 0 ? (
            <div className="flex h-10 items-center rounded border border-dashed border-neutral-200 bg-neutral-50 px-4 text-neutral-500">
              尚未打开任何资料库，请从左侧选择。
            </div>
          ) : (
            openRepoIds.map((repoId) => {
              const repo = repoMap.get(repoId);
              if (!repo) return null;
              const isActive = repoId === activeRepoId;
              return (
                <div
                  key={repoId}
                  className={`flex h-10 min-w-[160px] flex-shrink-0 items-center rounded-t border ${
                    isActive
                      ? 'border-blue-200 bg-blue-50 text-blue-700'
                      : 'border-transparent bg-neutral-50 text-neutral-500 hover:bg-neutral-100'
                  }`}
                >
                  <button
                    onClick={() => void (async () => {
                      if (repoId === activeRepoId) {
                        return;
                      }
                      const saved = await requestSave();
                      if (!saved) return;
                      activateRepoTab(repoId);
                    })()}
                    className="flex min-w-0 flex-1 items-center px-3 text-left"
                  >
                    <span className="truncate">{repo.name}</span>
                  </button>
                  {isActive ? (
                    <SaveStatusIndicator
                      dirty={recordDirty}
                      saving={recordSaving}
                      className="mr-1"
                    />
                  ) : (
                    <span className="mr-1 h-3 w-3 flex-shrink-0 rounded-full bg-emerald-200" aria-hidden />
                  )}
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      void (async () => {
                        if (repoId === activeRepoId) {
                          const saved = await requestSave();
                          if (!saved) return;
                        }
                        closeRepoTab(repoId);
                      })();
                    }}
                    className={`px-2 text-base ${
                      isActive
                        ? 'text-blue-500 hover:text-blue-700'
                        : 'text-neutral-400 hover:text-neutral-600'
                    }`}
                    aria-label={`关闭 ${repo.name}`}
                  >
                    ×
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </header>
  );
}
