import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { subscribeToChanges } from '@/lib/realtime';
import { useAuth } from '@/hooks/useAuth';
import { submitManagementRequest, type ManagementRequest } from '@/lib/adminApi';
import type { CapitalPlanId } from '@/core/types';

export type { ManagementRequest };

async function fetchLatest(userId: string): Promise<ManagementRequest | null> {
  const { data, error } = await supabase
    .from('capital_management_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as ManagementRequest | null) ?? null;
}

export function useManagementRequest() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const enabled = !!user?.id;

  const query = useQuery<ManagementRequest | null, Error>({
    queryKey: ['capital-management-request', user?.id],
    queryFn: () => fetchLatest(user!.id),
    enabled,
  });

  useEffect(() => {
    if (!enabled) return;
    return subscribeToChanges('capital_management_requests', [
      {
        table: 'capital_management_requests',
        filter: `user_id=eq.${user!.id}`,
        onEvent: () => queryClient.invalidateQueries({ queryKey: ['capital-management-request', user!.id] }),
      },
    ]);
  }, [enabled, queryClient, user]);

  const submit = async (planId: CapitalPlanId, currency: 'usd' | 'aoa', note?: string) => {
    await submitManagementRequest({ plan_id: planId, currency, note });
    await queryClient.invalidateQueries({ queryKey: ['capital-management-request', user!.id] });
  };

  return { request: query.data ?? null, loading: query.isLoading, submit };
}
