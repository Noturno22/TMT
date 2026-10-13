import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { subscribeToChanges } from '@/lib/realtime';
import { useAuth } from '@/hooks/useAuth';
import type { CapitalContract, CapitalPlanId } from '@/core/types';

async function fetchContract(userId: string): Promise<CapitalContract | null> {
  const { data, error } = await supabase
    .from('capital_contracts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as CapitalContract | null) ?? null;
}

export function useCapitalContract() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const enabled = !!user?.id;

  const contractQuery = useQuery<CapitalContract | null, Error>({
    queryKey: ['capital-contract', user?.id],
    queryFn: () => fetchContract(user!.id),
    enabled,
  });

  useEffect(() => {
    if (!enabled) return;
    return subscribeToChanges('capital_contracts', [
      {
        table: 'capital_contracts',
        filter: `user_id=eq.${user!.id}`,
        onEvent: () => queryClient.invalidateQueries({ queryKey: ['capital-contract', user!.id] }),
      },
    ]);
  }, [enabled, queryClient, user]);

  const activate = async (
    planId: CapitalPlanId,
    currency: 'usd' | 'aoa' = 'usd',
  ): Promise<CapitalContract | null> => {
    const { data, error } = await supabase.rpc('activate_capital_contract', {
      p_plan_id: planId,
      p_currency: currency,
    });
    if (error) throw error;
    await queryClient.invalidateQueries({ queryKey: ['capital-contract', user!.id] });
    return (data as CapitalContract | null) ?? null;
  };

  return {
    contract: contractQuery.data ?? null,
    loading: contractQuery.isLoading,
    activate,
  };
}