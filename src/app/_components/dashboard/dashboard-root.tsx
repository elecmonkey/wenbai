'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { DashboardInitialData } from '@/types/dashboard';
import { useDashboardStore } from '@/app/_stores/dashboard-store';
import { RepoSidebar } from './repo-sidebar';
import { RepoTabs } from './repo-tabs';
import { RecordListPanel } from './record-list-panel';
import { RecordEditor } from './record-editor';
import { StatusBar } from './status-bar';

type DashboardRootProps = {
  initialData: DashboardInitialData;
};

export function DashboardRoot({ initialData }: DashboardRootProps) {
  const queryClient = useQueryClient();
  const hasInitialized = useRef(false);
  const initializeStore = useDashboardStore((state) => state.initialize);

  useEffect(() => {
    if (hasInitialized.current) return;

    queryClient.setQueryData(['repos'], initialData.repos);

    if (initialData.records) {
      queryClient.setQueryData(
        ['records', initialData.records.repoId],
        initialData.records.items,
      );
    }

    if (initialData.recordDetail) {
      queryClient.setQueryData(
        [
          'record',
          initialData.recordDetail.repoId,
          initialData.recordDetail.recordId,
        ],
        initialData.recordDetail.data,
      );
    }

    initializeStore(initialData.activeRepoId, initialData.activeRecordId);
    hasInitialized.current = true;
  }, [initialData, initializeStore, queryClient]);

  return (
    <div className="flex h-screen bg-neutral-100 text-neutral-900">
      <RepoSidebar />
      <section className="flex flex-1 flex-col">
        <RepoTabs />
        <div className="flex flex-1 overflow-hidden">
          <RecordListPanel />
          <RecordEditor />
        </div>
        <StatusBar />
      </section>
    </div>
  );
}
