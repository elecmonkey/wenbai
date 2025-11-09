'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { DashboardInitialData } from '@/types/dashboard';
import { useDashboardStore } from '@/app/_stores/dashboard-store';
import { useAuthStore } from '@/app/_stores/auth-store';
import { RepoSidebar } from './repo-sidebar';
import { RepoTabs } from './repo-tabs';
import { RecordListPanel } from './record-list-panel';
import { RecordEditor } from './record-editor/record-editor';
import { StatusBar } from './status-bar';
import { LoginModal } from './login-modal';
import { PanelResizer } from './panel-resizer';

type DashboardRootProps = {
  initialData: DashboardInitialData;
};

export function DashboardRoot({ initialData }: DashboardRootProps) {
  const queryClient = useQueryClient();
  const hasInitialized = useRef(false);
  const initializeStore = useDashboardStore((state) => state.initialize);
  const setRepoSidebarWidth = useDashboardStore((state) => state.setRepoSidebarWidth);
  const setRecordListWidth = useDashboardStore((state) => state.setRecordListWidth);
  const refreshSession = useAuthStore((state) => state.refreshSession);
  const loginModalOpen = useAuthStore((state) => state.loginModalOpen);

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

    initializeStore(
      initialData.openRepoIds,
      initialData.activeRepoId,
      initialData.activeRecordId,
    );
    hasInitialized.current = true;
  }, [initialData, initializeStore, queryClient]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  return (
    <div className="flex h-screen bg-neutral-100 text-neutral-900">
      <RepoSidebar />
      <PanelResizer
        onResize={setRepoSidebarWidth}
        minWidth={180}
        maxWidth={500}
        onDoubleClick={() => setRepoSidebarWidth(256)}
      />
      <section className="flex flex-1 min-w-0 flex-col">
        <RepoTabs />
        <div className="flex flex-1 min-w-0 overflow-hidden">
          <RecordListPanel />
          <PanelResizer
            onResize={setRecordListWidth}
            minWidth={200}
            maxWidth={600}
            onDoubleClick={() => setRecordListWidth(320)}
          />
          <RecordEditor />
        </div>
        <StatusBar />
      </section>
      {loginModalOpen ? <LoginModal /> : null}
    </div>
  );
}
