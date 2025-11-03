'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import type { Repo } from '@/types/dashboard';

const REPOS_QUERY_KEY = ['repos'];

export function useReposQuery() {
  return useQuery({
    queryKey: REPOS_QUERY_KEY,
    queryFn: async () => apiRequest<Repo[]>('/api/repos'),
  });
}

export function useCreateRepoMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) =>
      apiRequest<{ id: number }>('/api/repos', {
        method: 'POST',
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: REPOS_QUERY_KEY });
    },
  });
}

export function useRenameRepoMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { id: number; name: string }) =>
      apiRequest<void>(`/api/repos/${payload.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: payload.name }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: REPOS_QUERY_KEY });
    },
  });
}

export function useDeleteRepoMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (repoId: number) =>
      apiRequest<{ id: number }>(`/api/repos/${repoId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: REPOS_QUERY_KEY });
    },
  });
}
