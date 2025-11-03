'use client';

import { useEffect } from 'react';
import { useDashboardStore } from '@/app/_stores/dashboard-store';
import {
  useCreateRecordMutation,
  useRecordsQuery,
} from '@/app/_queries/records';
import { ApiError } from '@/lib/api-client';

export function RecordListPanel() {
  const activeRepoId = useDashboardStore((state) => state.activeRepoId);
  const activeRecordId = useDashboardStore((state) => state.activeRecordId);
  const setActiveRecordId = useDashboardStore(
    (state) => state.setActiveRecordId,
  );
  const requestSave = useDashboardStore((state) => state.requestSave);

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
    if (!activeRepoId) {
      window.alert('请先选择一个资料库。');
      return;
    }

    const source = window.prompt('请输入新条目的文言原文');
    if (!source) return;

    try {
      const saved = await requestSave();
      if (!saved) return;
      const result = await createRecord.mutateAsync({
        repoId: activeRepoId,
        source: source.trim(),
      });
      if (result?.id) {
        setActiveRecordId(result.id);
      }
    } catch (mutationError) {
      const message =
        mutationError instanceof ApiError
          ? mutationError.message
          : '创建条目失败，请稍后再试。';
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
          disabled={!activeRepoId || createRecord.isPending}
          className="rounded bg-blue-600 px-2 py-1 text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-200"
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
                  onClick={() => void (async () => {
                    if (record.id === activeRecordId) {
                      return;
                    }
                    const saved = await requestSave();
                    if (!saved) return;
                    setActiveRecordId(record.id);
                  })()}
                  className={`w-full rounded px-3 py-2 text-left transition ${
                    record.id === activeRecordId
                      ? 'bg-blue-50 text-blue-700'
                      : 'hover:bg-neutral-100'
                  }`}
                >
                  <p className="truncate text-sm">
                    {record.source || `条目 #${record.id}`}
                  </p>
                  <p className="text-xs text-neutral-400">#{record.id}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
