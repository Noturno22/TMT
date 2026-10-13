import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { subscribeToChanges } from '@/lib/realtime';
import { useAuth } from '@/hooks/useAuth';
import type { WithdrawalRequest } from '@/core/types';

async function fetchRequests(userId: string): Promise<WithdrawalRequest[]> {
  const { data, error } = await supabase
    .from('withdrawal_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []) as WithdrawalRequest[];
}

export function useWithdrawalRequests() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const enabled = !!user?.id;

  const requestsQuery = useQuery<WithdrawalRequest[], Error>({
    queryKey: ['withdrawal-requests', user?.id],
    queryFn: () => fetchRequests(user!.id),
    enabled,
  });

  useEffect(() => {
    if (!enabled) return;
    return subscribeToChanges('withdrawal_requests', [
      {
        table: 'withdrawal_requests',
        filter: `user_id=eq.${user!.id}`,
        onEvent: () => queryClient.invalidateQueries({ queryKey: ['withdrawal-requests', user!.id] }),
      },
    ]);
  }, [enabled, queryClient, user]);

  return {
    requests: requestsQuery.data ?? [],
    loading: requestsQuery.isLoading,
  };
}