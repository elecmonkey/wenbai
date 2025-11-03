'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import type {
  Alignment,
  RecordDetailPayload,
  RecordSummary,
  Token,
} from '@/types/dashboard';

const recordsKey = (repoId: number | null) => ['records', repoId];
const recordDetailKey = (repoId: number | null, recordId: number | null) => [
  'record',
  repoId,
  recordId,
];

export function useRecordsQuery(repoId: number | null) {
  return useQuery({
    queryKey: recordsKey(repoId),
    enabled: repoId !== null,
    queryFn: async () =>
      apiRequest<RecordSummary[]>(`/api/repos/${repoId}/records`),
  });
}

export function useRecordDetailQuery(
  repoId: number | null,
  recordId: number | null,
) {
  return useQuery({
    queryKey: recordDetailKey(repoId, recordId),
    enabled: repoId !== null && recordId !== null,
    queryFn: async () =>
      apiRequest<RecordDetailPayload>(
        `/api/repos/${repoId}/records/${recordId}`,
      ),
  });
}

export function useCreateRecordMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { repoId: number; source: string }) =>
      apiRequest<{ id: number }>(
        `/api/repos/${payload.repoId}/records`,
        {
          method: 'POST',
          body: JSON.stringify({ source: payload.source }),
        },
      ),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: recordsKey(variables.repoId),
      });
    },
  });
}

export type RecordUpdatePayload = {
  source: string;
  target: string | null;
  meta: string | null;
  source_tokens: Token[];
  target_tokens: Token[];
  alignment: Alignment[];
};

export function useUpdateRecordMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      repoId: number;
      recordId: number;
      data: RecordUpdatePayload;
    }) =>
      apiRequest<void>(
        `/api/repos/${payload.repoId}/records/${payload.recordId}`,
        {
          method: 'PUT',
          body: JSON.stringify({ data: payload.data }),
        },
      ),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: recordsKey(variables.repoId),
      });
      void queryClient.invalidateQueries({
        queryKey: recordDetailKey(variables.repoId, variables.recordId),
      });
    },
  });
}
