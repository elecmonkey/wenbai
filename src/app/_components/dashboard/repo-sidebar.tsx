'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { useDashboardStore } from '@/app/_stores/dashboard-store';
import { useAuthStore } from '@/app/_stores/auth-store';
import {
  useCreateRepoMutation,
  useDeleteRepoMutation,
  useRenameRepoMutation,
  useReposQuery,
} from '@/app/_queries/repos';
import { ApiError } from '@/lib/api-client';
import { DisabledHintButton } from './disabled-hint-button';
import { IconRefresh } from '@/app/_components/icons/icon-refresh';

export function RepoSidebar() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: detecting client-side mount for hydration-safe width
    setMounted(true);
  }, []);

  const {
    data: repos = [],
    isLoading,
    isFetching,
    refetch: refetchRepos,
  } = useReposQuery();
  const createRepo = useCreateRepoMutation();
  const renameRepo = useRenameRepoMutation();
  const deleteRepo = useDeleteRepoMutation();

  const activeRepoId = useDashboardStore((state) => state.activeRepoId);
  const openRepoIds = useDashboardStore((state) => state.openRepoIds);
  const openRepoTab = useDashboardStore((state) => state.openRepoTab);
  const closeRepoTab = useDashboardStore((state) => state.closeRepoTab);
  const requestSave = useDashboardStore((state) => state.requestSave);
  const repoSidebarWidth = useDashboardStore((state) => state.repoSidebarWidth);
  const isAuthenticated = useAuthStore((state) => state.user !== null);
  const requireAuth = useAuthStore((state) => state.requireAuth);
  const handleUnauthorized = useAuthStore((state) => state.handleUnauthorized);

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
    if (isLoading || isFetching) return;
    const validIds = new Set(repos.map((repo) => repo.id));

    openRepoIds.forEach((id) => {
      if (!validIds.has(id)) {
        closeRepoTab(id);
      }
    });

    if (activeRepoId !== null && !validIds.has(activeRepoId)) {
      closeRepoTab(activeRepoId);
    }
  }, [repos, isLoading, isFetching, openRepoIds, activeRepoId, closeRepoTab]);

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

  const performCreateRepo = async (name: string) => {
    const result = await createRepo.mutateAsync(name);
    if (result?.id) {
      const saved = await requestSave();
      if (!saved) {
        return;
      }
      openRepoTab(result.id);
    }
  };

  const handleCreateRepo = async () => {
    if (!isAuthenticated) {
      return;
    }

    const input = window.prompt('请输入新资料库名称');
    if (!input) return;
    const trimmed = input.trim();
    if (!trimmed) return;

    if (repos.some((repo) => repo.name === trimmed)) {
      window.alert('资料库名称已存在');
      return;
    }

    try {
      await performCreateRepo(trimmed);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        handleUnauthorized(async () => {
          await performCreateRepo(trimmed);
        });
        return;
      }

      const message =
        error instanceof ApiError
          ? error.message
          : '创建资料库失败，请稍后再试。';
      window.alert(message);
    }
  };

  const performRenameRepo = async (repoId: number, nextName: string) => {
    const saved = await requestSave();
    if (!saved) return;
    await renameRepo.mutateAsync({ id: repoId, name: nextName });
  };

  const handleRenameRepo = async (repoId: number, currentName: string) => {
    const authed = await requireAuth();
    if (!authed) return;

    const input = window.prompt('请输入新的资料库名称', currentName);
    if (!input) return;
    const trimmed = input.trim();
    if (!trimmed || trimmed === currentName) return;

    if (
      repos.some(
        (repo) => repo.name === trimmed && repo.id !== repoId,
      )
    ) {
      window.alert('资料库名称已存在');
      return;
    }

    try {
      await performRenameRepo(repoId, trimmed);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        handleUnauthorized(async () => {
          await performRenameRepo(repoId, trimmed);
        });
        return;
      }

      const message =
        error instanceof ApiError
          ? error.message
          : '重命名失败，请稍后再试。';
      window.alert(message);
    }
  };

  const performDeleteRepo = async (repoId: number) => {
    if (repoId === activeRepoId) {
      const saved = await requestSave();
      if (!saved) return;
    }
    await deleteRepo.mutateAsync(repoId);
    closeRepoTab(repoId);
  };

  const handleDeleteRepo = async (repoId: number, repoName: string) => {
    const authed = await requireAuth();
    if (!authed) return;

    const confirmed = window.confirm(
      `确定要删除资料库“${repoName}”吗？此操作会删除其所有条目。`,
    );
    if (!confirmed) return;

    try {
      await performDeleteRepo(repoId);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        handleUnauthorized(async () => {
          await performDeleteRepo(repoId);
        });
        return;
      }

      const message =
        error instanceof ApiError
          ? error.message
          : '删除资料库失败，请稍后再试。';
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
      style={{ width: mounted ? repoSidebarWidth : 256 }}
      className="relative flex shrink-0 flex-col border-r border-neutral-200 bg-white"
    >
      <div className="flex items-center justify-between px-4 py-4">
        <h1 className="text-base font-semibold text-neutral-800">
          WENBAI
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              void refetchRepos();
            }}
            disabled={isLoading || isFetching}
            className="flex h-8 w-8 items-center justify-center rounded border border-neutral-300 text-neutral-600 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:text-neutral-400"
            aria-label="刷新资料库列表"
          >
            <IconRefresh />
          </button>
        <DisabledHintButton
          onClick={handleCreateRepo}
          disabled={createRepo.isPending || !isAuthenticated}
          disabledHint={!isAuthenticated ? '请登录后创建资料库' : undefined}
          hintPlacement="bottom"
          className="rounded bg-blue-600 px-2 py-1 h-8 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400"
        >
          ＋
        </DisabledHintButton>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3">
        {isLoading ? (
          <div className="px-2 py-4 text-sm text-neutral-500">
            正在加载资料库…
          </div>
        ) : repos.length === 0 ? (
          <div className="px-2 py-4 text-sm text-neutral-500">
            暂无资料库，请先创建。
          </div>
        ) : (
          <ul className="space-y-1 text-sm">
            {repos.map((repo) => (
              <li key={repo.id}>
                <button
                  onClick={() => void (async () => {
                    const saved = await requestSave();
                    if (!saved) return;
                    openRepoTab(repo.id);
                  })()}
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
        资料库总数：{repos.length}
      </div>

      {menuState && contextRepo && (
        <div
          style={{
            top: menuState.anchor.y,
            left: menuState.anchor.x,
          }}
          className="absolute z-20 w-40 overflow-hidden rounded border border-neutral-200 bg-white shadow-lg"
        >
          {isAuthenticated ? (
            <>
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
            </>
          ) : (
            <button
              type="button"
              disabled
              className="flex w-full items-center px-3 py-2 text-left text-sm text-neutral-400"
            >
              需登录后才可操作
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
