import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getList, post } from '@/lib/apiClient';
import type { NotificationItem } from '@/lib/types';

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => getList<NotificationItem>('/notifications', { pageSize: 10 }),
    refetchInterval: 60_000, // light polling for new items
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => post(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => post('/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}
