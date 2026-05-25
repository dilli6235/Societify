import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { getList, errorMessage } from './apiClient';
import { toast } from '@/components/ui/toast';
import type { PaginationMeta } from './types';

/** List query with pagination meta. */
export function useList<T>(key: QueryKey, url: string, params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...key, params ?? {}],
    queryFn: () => getList<T>(url, params),
  });
}

/**
 * Mutation wrapper: runs `fn`, then on success shows a toast + invalidates the
 * given query keys; on error shows the API error message.
 */
export function useApiMutation<TArgs, TData>(
  fn: (args: TArgs) => Promise<TData>,
  opts: { invalidate?: QueryKey[]; successMessage?: string } = {},
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      if (opts.successMessage) toast.success(opts.successMessage);
      opts.invalidate?.forEach((key) => qc.invalidateQueries({ queryKey: key }));
    },
    onError: (err) => toast.error(errorMessage(err)),
  });
}

export type { PaginationMeta };
