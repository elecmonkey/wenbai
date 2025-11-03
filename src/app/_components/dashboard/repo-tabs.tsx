'use client';

import { useDashboardStore } from '@/app/_stores/dashboard-store';
import { useReposQuery } from '@/app/_queries/repos';

export function RepoTabs() {
  const { data: repos = [], isLoading } = useReposQuery();
  const activeRepoId = useDashboardStore((state) => state.activeRepoId);
  const setActiveRepoId = useDashboardStore(
    (state) => state.setActiveRepoId,
  );

  return (
    <header className="border-b border-neutral-200 bg-white px-4">
      <div className="flex items-center gap-2 overflow-x-auto py-3 text-sm">
        {isLoading ? (
          <span className="text-neutral-500">加载仓库标签…</span>
        ) : repos.length === 0 ? (
          <span className="text-neutral-500">
            暂无仓库，请先在左侧创建。
          </span>
        ) : (
          repos.map((repo) => (
            <button
              key={repo.id}
              onClick={() => setActiveRepoId(repo.id)}
              className={`flex items-center gap-2 rounded-t px-3 py-2 transition ${
                repo.id === activeRepoId
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'bg-transparent text-neutral-500 hover:bg-neutral-100'
              }`}
            >
              <span>{repo.name}</span>
              <span className="text-xs text-neutral-400">#{repo.id}</span>
            </button>
          ))
        )}
      </div>
    </header>
  );
}
