'use client';

import { useMemo } from 'react';
import { useReposQuery } from '@/app/_queries/repos';
import { useRecordsQuery } from '@/app/_queries/records';
import { useDashboardStore } from '@/app/_stores/dashboard-store';

export function StatusBar() {
  const { data: repos = [] } = useReposQuery();
  const activeRepoId = useDashboardStore((state) => state.activeRepoId);
  const activeRecordId = useDashboardStore((state) => state.activeRecordId);
  const recordDirty = useDashboardStore((state) => state.recordDirty);
  const recordSaving = useDashboardStore((state) => state.recordSaving);
  const { data: records = [] } = useRecordsQuery(activeRepoId);

  const statusText = useMemo(() => {
    const repoName =
      activeRepoId && repos.length
        ? repos.find((repo) => repo.id === activeRepoId)?.name ??
          '资料库不存在'
        : '未选择资料库';
    const recordName = activeRecordId
      ? records.find((record) => record.id === activeRecordId)?.source ?? '未命名条目'
      : null;
    const recordText = recordName ? `条目：${recordName}` : '未选择条目';
    const saveText = recordSaving
      ? '保存中…'
      : recordDirty
        ? '未保存'
        : '已保存';

    return `资料库：${repoName} ｜ ${recordText} ｜ ${saveText}`;
  }, [activeRepoId, activeRecordId, recordDirty, recordSaving, repos, records]);

  return (
    <footer className="border-t border-neutral-200 bg-white px-4 py-2 text-xs text-neutral-500">
      {statusText}
    </footer>
  );
}
