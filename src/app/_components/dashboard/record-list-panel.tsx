'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { useDashboardStore } from '@/app/_stores/dashboard-store';
import {
  useCreateRecordMutation,
  useDeleteRecordMutation,
  useRecordsQuery,
  useUpdateRecordMutation,
} from '@/app/_queries/records';
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/app/_stores/auth-store';
import { SaveStatusIndicator } from './save-status-indicator';
import { DisabledHintButton } from './disabled-hint-button';
import { ImportRecordModal } from './import/import-record-modal';
import { IconRefresh } from '@/app/_components/icons/icon-refresh';
import { IconImport } from '@/app/_components/icons/icon-import';
import type { RecordDetailPayload } from '@/types/dashboard';

export function RecordListPanel() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: detecting client-side mount for hydration-safe width
    setMounted(true);
  }, []);

  const activeRepoId = useDashboardStore((state) => state.activeRepoId);
  const activeRecordId = useDashboardStore((state) => state.activeRecordId);
  const setActiveRecordId = useDashboardStore(
    (state) => state.setActiveRecordId,
  );
  const setRecordDirty = useDashboardStore((state) => state.setRecordDirty);
  const requestSave = useDashboardStore((state) => state.requestSave);
  const recordDirty = useDashboardStore((state) => state.recordDirty);
  const recordSaving = useDashboardStore((state) => state.recordSaving);
  const recordListWidth = useDashboardStore((state) => state.recordListWidth);
  const isAuthenticated = useAuthStore((state) => state.user !== null);
  const requireAuth = useAuthStore((state) => state.requireAuth);
  const handleUnauthorized = useAuthStore((state) => state.handleUnauthorized);
  const updateRecord = useUpdateRecordMutation();
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importModalKey, setImportModalKey] = useState(0);

  const {
    data: records = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useRecordsQuery(activeRepoId);

  const createRecord = useCreateRecordMutation();
  const deleteRecord = useDeleteRecordMutation();
  const panelRef = useRef<HTMLDivElement | null>(null);

  const [menuState, setMenuState] = useState<{
    recordId: number;
    anchor: { x: number; y: number };
  } | null>(null);

  const contextRecord = useMemo(
    () => records.find((record) => record.id === menuState?.recordId) ?? null,
    [menuState?.recordId, records],
  );

  useEffect(() => {
    if (!activeRepoId || !records.length) {
      if (activeRecordId !== null) {
        void (async () => {
          const saved = await requestSave();
          if (!saved) return;
          setActiveRecordId(null);
        })();
      }
      return;
    }

    if (!records.some((record) => record.id === activeRecordId)) {
      void (async () => {
        const saved = await requestSave();
        if (!saved) return;
        setActiveRecordId(records[0].id);
      })();
    }
  }, [records, activeRecordId, activeRepoId, setActiveRecordId, requestSave]);

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

  const handleCreateRecord = async () => {
    if (!isAuthenticated) {
      return;
    }

    if (!activeRepoId) {
      window.alert('请先选择一个资料库。');
      return;
    }

    const source = window.prompt('请输入新条目的文言原文');
    if (!source) return;

    const trimmedSource = source.trim();
    if (!trimmedSource) return;

    try {
      const saved = await requestSave();
      if (!saved) return;
      const result = await createRecord.mutateAsync({
        repoId: activeRepoId,
        source: trimmedSource,
      });
      if (result?.id) {
        setActiveRecordId(result.id);
      }
    } catch (mutationError) {
      const message =
        mutationError instanceof ApiError
          ? mutationError.message
          : '创建条目失败，请稍后再试。';

      if (
        mutationError instanceof ApiError &&
        mutationError.status === 401
      ) {
        handleUnauthorized(async () => {
          if (!activeRepoId) return;
          const saved = await requestSave();
          if (!saved) return;
          const result = await createRecord.mutateAsync({
            repoId: activeRepoId,
            source: trimmedSource,
          });
          if (result?.id) {
            setActiveRecordId(result.id);
          }
        });
        return;
      }

      window.alert(message);
    }
  };

  const handleRefresh = () => {
    void refetch();
  };

  const openContextMenu = (
    event: MouseEvent<HTMLButtonElement>,
    recordId: number,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const panelRect = panelRef.current?.getBoundingClientRect();
    const anchor = panelRect
      ? {
          x: event.clientX - panelRect.left,
          y: event.clientY - panelRect.top,
        }
      : { x: event.clientX, y: event.clientY };
    setMenuState({ recordId, anchor });
  };

  const findFallbackRecord = (recordId: number) => {
    if (records.length <= 1) {
      return null;
    }
    const index = records.findIndex((record) => record.id === recordId);
    if (index === -1) {
      return records[0] ?? null;
    }
    return records[index + 1] ?? records[index - 1] ?? null;
  };

  const performDeleteRecord = async (recordId: number) => {
    if (!activeRepoId) {
      return;
    }
    const wasActive = recordId === activeRecordId;
    const fallbackRecord = findFallbackRecord(recordId);

    await deleteRecord.mutateAsync({ repoId: activeRepoId, recordId });

    if (wasActive) {
      if (fallbackRecord) {
        setActiveRecordId(fallbackRecord.id);
      } else {
        setActiveRecordId(null);
      }
    }
  };

  const showDeleteError = (error: unknown) => {
    console.error('删除条目失败', error);
    if (error instanceof ApiError) {
      window.alert(error.message);
    } else if (error instanceof Error) {
      window.alert(error.message);
    } else {
      window.alert('删除条目失败，请稍后再试。');
    }
  };

  const handleDeleteRecord = async (recordId: number) => {
    const target = records.find((record) => record.id === recordId);
    const displayName =
      target?.source?.trim() && target.source.trim().length > 0
        ? target.source.trim()
        : '未命名条目';

    const confirmed = window.confirm(
      recordId === activeRecordId && recordDirty
        ? `当前条目存在未保存的更改，删除后将丢失这些内容。确定要删除“${displayName}”吗？`
        : `确定要删除条目“${displayName}”吗？此操作不可恢复。`,
    );
    if (!confirmed) return;

    const deleteAndHandleErrors = async () => {
      if (!activeRepoId) {
        window.alert('请先选择一个资料库。');
        return;
      }
      try {
        await performDeleteRecord(recordId);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          handleUnauthorized(async () => {
            try {
              await performDeleteRecord(recordId);
            } catch (innerError) {
              showDeleteError(innerError);
            }
          });
          return;
        }
        showDeleteError(error);
      }
    };

    const authed = await requireAuth(async () => {
      await deleteAndHandleErrors();
    });

    if (authed) {
      return;
    }
  };

  const handleDeleteAction = () => {
    if (!menuState) return;
    const { recordId } = menuState;
    setMenuState(null);
    void handleDeleteRecord(recordId);
  };

  const importDisabledHint = !activeRepoId
    ? '请先选择一个资料库'
    : !isAuthenticated
      ? '请登录后导入数据'
      : undefined;

  const importInFlight = createRecord.isPending || updateRecord.isPending;

  const handleImportRecord = async (
    payload: RecordDetailPayload,
  ): Promise<boolean> => {
    if (!activeRepoId) {
      window.alert('请先选择一个资料库。');
      return false;
    }

    const sanitizedSource = payload.source.trim();
    if (!sanitizedSource) {
      window.alert('导入数据缺少 source 字段。');
      return false;
    }

    const trimmedTarget = payload.target?.trim()
      ? payload.target.trim()
      : null;
    const trimmedMeta = payload.meta?.trim() ? payload.meta.trim() : null;

    const performImport = async () => {
      const saved = await requestSave();
      if (!saved) return false;

      const created = await createRecord.mutateAsync({
        repoId: activeRepoId,
        source: sanitizedSource,
      });

      if (!created?.id) {
        throw new Error('创建条目失败，请稍后再试。');
      }

      await updateRecord.mutateAsync({
        repoId: activeRepoId,
        recordId: created.id,
        data: {
          source: sanitizedSource,
          target: trimmedTarget,
          meta: trimmedMeta,
          source_tokens: payload.source_tokens,
          target_tokens: payload.target_tokens,
          alignment: payload.alignment ?? [],
        },
      });

      setActiveRecordId(created.id);
      setRecordDirty(false);
      setImportModalOpen(false);
      setImportModalKey((key) => key + 1);
      return true;
    };

    try {
      const success = await performImport();
      return success;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        handleUnauthorized(async () => {
          try {
            await performImport();
          } catch (innerError) {
            console.error('导入失败', innerError);
            if (innerError instanceof ApiError) {
              window.alert(innerError.message);
            } else if (innerError instanceof Error) {
              window.alert(innerError.message);
            } else {
              window.alert('导入失败，请稍后再试。');
            }
          }
        });
        return false;
      }

      console.error('导入失败', error);
      if (error instanceof ApiError) {
        window.alert(error.message);
      } else if (error instanceof Error) {
        window.alert(error.message);
      } else {
        window.alert('导入失败，请稍后再试。');
      }
      return false;
    }
  };

  return (
    <>
      <div
        ref={panelRef}
        style={{ width: mounted ? recordListWidth : 320 }}
        className="relative flex shrink-0 flex-col border-r border-neutral-200 bg-white"
      >
        <div className="flex items-center gap-2 border-b border-neutral-200 px-4 py-3 text-sm">
          <DisabledHintButton
            onClick={handleCreateRecord}
            disabled={!activeRepoId || createRecord.isPending || !isAuthenticated}
            disabledHint={!isAuthenticated ? '请登录后创建条目' : undefined}
            className="rounded h-8 bg-blue-600 px-2 py-1 text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400"
          >
            ＋ 新条目
          </DisabledHintButton>
          <button
            onClick={handleRefresh}
            disabled={isFetching}
            className="flex h-8 w-8 items-center justify-center rounded border border-neutral-300 text-neutral-600 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:text-neutral-400"
            aria-label="刷新条目列表"
          >
            <IconRefresh />
          </button>
          <DisabledHintButton
            onClick={() => {
              setImportModalKey((key) => key + 1);
              setImportModalOpen(true);
            }}
            disabled={importInFlight || !isAuthenticated || !activeRepoId}
            disabledHint={importInFlight ? '正在导入，请稍候' : importDisabledHint}
            className="flex h-8 w-8 items-center justify-center rounded border border-neutral-300 text-neutral-600 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:text-neutral-400"
            aria-label="导入条目"
          >
            <IconImport />
          </DisabledHintButton>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2 text-sm">
          {activeRepoId === null ? (
            <div className="py-4 text-neutral-500">请选择一个资料库。</div>
          ) : isLoading ? (
            <div className="py-4 text-neutral-500">正在加载条目列表…</div>
          ) : isError ? (
            <div className="py-4 text-red-400">
              {error instanceof ApiError
                ? error.message
                : '获取条目列表失败。'}
            </div>
          ) : records.length === 0 ? (
            <div className="py-4 text-neutral-500">
              暂无条目，请创建新条目。
            </div>
          ) : (
            <ul className="space-y-1">
              {records.map((record) => (
                <li key={record.id}>
                  <button
                    onClick={() =>
                      void (async () => {
                        if (record.id === activeRecordId) {
                          return;
                        }
                        const saved = await requestSave();
                        if (!saved) return;
                        setActiveRecordId(record.id);
                      })()}
                    onContextMenu={(event) => openContextMenu(event, record.id)}
                    className={`flex w-full items-center gap-3 rounded px-3 py-2 text-left transition ${
                      record.id === activeRecordId
                        ? 'bg-blue-50 text-blue-700'
                        : 'hover:bg-neutral-100'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">
                        {record.source || '未命名条目'}
                      </p>
                      <p className="truncate text-xs text-neutral-400">
                        {record.meta ?? ''}
                      </p>
                    </div>
                    {isAuthenticated ? (
                      <SaveStatusIndicator
                        dirty={record.id === activeRecordId && recordDirty}
                        saving={record.id === activeRecordId && recordSaving}
                      />
                    ) : (
                      <span className="h-3 w-3" aria-hidden />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {menuState && contextRecord && (
          <div
            style={{
              top: menuState.anchor.y,
              left: menuState.anchor.x,
            }}
            className="absolute z-20 w-36 overflow-hidden rounded border border-neutral-200 bg-white shadow-lg"
          >
            {isAuthenticated ? (
              <button
                onClick={handleDeleteAction}
                disabled={deleteRecord.isPending}
                className="flex w-full items-center px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-red-300"
              >
                删除
              </button>
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
      </div>
      <ImportRecordModal
        key={importModalKey}
        open={importModalOpen}
        onClose={() => {
          setImportModalOpen(false);
          setImportModalKey((key) => key + 1);
        }}
        onImport={handleImportRecord}
      />
    </>
  );
}
