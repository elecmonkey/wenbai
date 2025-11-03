'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { useDashboardStore } from '@/app/_stores/dashboard-store';
import {
  useCreateRepoMutation,
  useDeleteRepoMutation,
  useRenameRepoMutation,
  useReposQuery,
} from '@/app/_queries/repos';
import { ApiError } from '@/lib/api-client';

export function RepoSidebar() {
  const { data: repos = [], isLoading } = useReposQuery();
  const createRepo = useCreateRepoMutation();
  const renameRepo = useRenameRepoMutation();
  const deleteRepo = useDeleteRepoMutation();

  const activeRepoId = useDashboardStore((state) => state.activeRepoId);
  const setActiveRepoId = useDashboardStore(
    (state) => state.setActiveRepoId,
  );

  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const [menuState, setMenuState] = useState<{
    repoId: number;
    anchor: { x: number; y: number };
  } | null>(null);

  const contextRepo = useMemo(
    () => repos.find((repo) => repo.id === menuState?.repoId) ?? null,
    [menuState?.repoId, repos],
  );

  useEffect(() => {
    if (isLoading) return;
    if (!repos.length) {
      if (activeRepoId !== null) {
        setActiveRepoId(null);
      }
      return;
    }
    if (!repos.some((repo) => repo.id === activeRepoId)) {
      setActiveRepoId(repos[0].id);
    }
  }, [repos, isLoading, activeRepoId, setActiveRepoId]);

  useEffect(() => {
    if (!menuState) return;

    const dismiss = () => setMenuState(null);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuState(null);
      }
    };

    window.addEventListener('click', dismiss);
    window.addEventListener('contextmenu', dismiss);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('click', dismiss);
      window.removeEventListener('contextmenu', dismiss);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuState]);

  const handleCreateRepo = async () => {
    const input = window.prompt('请输入新仓库名称');
    if (!input) return;
    const trimmed = input.trim();
    if (!trimmed) return;

    if (repos.some((repo) => repo.name === trimmed)) {
      window.alert('仓库名称已存在');
      return;
    }

    try {
      const result = await createRepo.mutateAsync(trimmed);
      if (result?.id) {
        setActiveRepoId(result.id);
      }
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : '创建仓库失败，请稍后再试。';
      window.alert(message);
    }
  };

  const handleRenameRepo = async (repoId: number, currentName: string) => {
    const input = window.prompt('请输入新的仓库名称', currentName);
    if (!input) return;
    const trimmed = input.trim();
    if (!trimmed || trimmed === currentName) return;

    if (
      repos.some(
        (repo) => repo.name === trimmed && repo.id !== repoId,
      )
    ) {
      window.alert('仓库名称已存在');
      return;
    }

    try {
      await renameRepo.mutateAsync({ id: repoId, name: trimmed });
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : '重命名失败，请稍后再试。';
      window.alert(message);
    }
  };

  const handleDeleteRepo = async (repoId: number, repoName: string) => {
    const confirmed = window.confirm(
      `确定要删除仓库“${repoName}”吗？此操作会删除其所有条目。`,
    );
    if (!confirmed) return;

    try {
      await deleteRepo.mutateAsync(repoId);
      if (activeRepoId === repoId) {
        setActiveRepoId(null);
      }
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : '删除仓库失败，请稍后再试。';
      window.alert(message);
    }
  };

  const openContextMenu = (event: MouseEvent<HTMLButtonElement>, repoId: number) => {
    event.preventDefault();
    event.stopPropagation();
    const sidebarRect = sidebarRef.current?.getBoundingClientRect();
    const anchor = sidebarRect
      ? {
          x: event.clientX - sidebarRect.left,
          y: event.clientY - sidebarRect.top,
        }
      : { x: event.clientX, y: event.clientY };
    setMenuState({ repoId, anchor });
  };

  const handleRenameAction = () => {
    if (!menuState || !contextRepo) return;
    setMenuState(null);
    void handleRenameRepo(menuState.repoId, contextRepo.name);
  };

  const handleDeleteAction = () => {
    if (!menuState || !contextRepo) return;
    setMenuState(null);
    void handleDeleteRepo(menuState.repoId, contextRepo.name);
  };

  return (
    <aside
      ref={sidebarRef}
      className="relative flex w-64 flex-col border-r border-neutral-200 bg-white"
    >
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-4">
        <h1 className="text-base font-semibold text-neutral-800">
          文白对译资料库
        </h1>
        <button
          onClick={handleCreateRepo}
          disabled={createRepo.isPending}
          className="rounded bg-blue-600 px-2 py-1 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-200"
        >
          ＋
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3">
        {isLoading ? (
          <div className="px-2 py-4 text-sm text-neutral-500">
            正在加载仓库…
          </div>
        ) : repos.length === 0 ? (
          <div className="px-2 py-4 text-sm text-neutral-500">
            暂无仓库，请先创建。
          </div>
        ) : (
          <ul className="space-y-1 text-sm">
            {repos.map((repo) => (
              <li key={repo.id}>
                <button
                  onClick={() => setActiveRepoId(repo.id)}
                  onContextMenu={(event) => openContextMenu(event, repo.id)}
                  className={`flex w-full items-center rounded px-3 py-2 text-left transition ${
                    repo.id === activeRepoId
                      ? 'bg-blue-50 text-blue-700'
                      : 'hover:bg-neutral-100'
                  }`}
                >
                  <span className="truncate">{repo.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-neutral-200 px-4 py-3 text-xs text-neutral-500">
        仓库总数：{repos.length}
      </div>

      {menuState && contextRepo && (
        <div
          style={{
            top: menuState.anchor.y,
            left: menuState.anchor.x,
          }}
          className="absolute z-20 w-40 overflow-hidden rounded border border-neutral-200 bg-white shadow-lg"
        >
          <button
            onClick={handleRenameAction}
            disabled={renameRepo.isPending}
            className="flex w-full items-center px-3 py-2 text-left text-sm text-neutral-700 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:text-neutral-400"
          >
            重命名
          </button>
          <button
            onClick={handleDeleteAction}
            disabled={deleteRepo.isPending}
            className="flex w-full items-center px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-red-300"
          >
            删除
          </button>
        </div>
      )}
    </aside>
  );
}
