'use client';

import { useEffect } from 'react';
import { useDashboardStore } from '@/app/_stores/dashboard-store';
import {
  useCreateRecordMutation,
  useRecordsQuery,
} from '@/app/_queries/records';
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/app/_stores/auth-store';
import { SaveStatusIndicator } from './save-status-indicator';

export function RecordListPanel() {
  const activeRepoId = useDashboardStore((state) => state.activeRepoId);
  const activeRecordId = useDashboardStore((state) => state.activeRecordId);
  const setActiveRecordId = useDashboardStore(
    (state) => state.setActiveRecordId,
  );
  const requestSave = useDashboardStore((state) => state.requestSave);
  const recordDirty = useDashboardStore((state) => state.recordDirty);
  const recordSaving = useDashboardStore((state) => state.recordSaving);
  const isAuthenticated = useAuthStore((state) => state.user !== null);
  const handleUnauthorized = useAuthStore((state) => state.handleUnauthorized);

  const {
    data: records = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useRecordsQuery(activeRepoId);

  const createRecord = useCreateRecordMutation();

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

  return (
    <div className="flex w-80 flex-col border-r border-neutral-200 bg-white">
      <div className="flex items-center gap-2 border-b border-neutral-200 px-4 py-3 text-sm">
        <button
          onClick={handleCreateRecord}
          disabled={
            !activeRepoId || createRecord.isPending || !isAuthenticated
          }
          title={
            !isAuthenticated ? '请登录后创建条目' : undefined
          }
          className="rounded bg-blue-600 px-2 py-1 text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400"
        >
          ＋ 新条目
        </button>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="rounded border border-neutral-300 px-2 py-1 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:text-neutral-400"
        >
          刷新
        </button>
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
    </div>
  );
}
