import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { subscribeToChanges } from '@/lib/realtime';
import type { Signal, SignalStatus, SignalType } from '@/core/types';
import { formatSymbol, formatTimeframe, formatType } from '@/core/format';

function determineStatus(status: string | null, confidence: number): SignalStatus {
  if (status === 'tp') return 'tp';
  if (status === 'sl') return 'sl';
  if (status === 'active') return 'active';
  if (status === 'pending') return 'pending';
  return Number(confidence) >= 70 ? 'active' : 'pending';
}

async function fetchSignals(): Promise<Signal[]> {
  const { data, error } = await supabase
    .from('signals')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: String(row.id),
    pair: formatSymbol(row.symbol),
    timeframe: formatTimeframe(row.timeframe),
    type: formatType(row.signal_type),
    confidence: Number(row.confidence) || 50,
    entry: Number(row.entry_price) || 0,
    stopLoss: Number(row.stop_loss) || 0,
    takeProfit: Number(row.target_price) || 0,
    reasons: Array.isArray(row.reasons) ? row.reasons : [],
    createdAt: row.created_at ?? new Date().toISOString(),
    status: determineStatus(row.status, Number(row.confidence)),
  }));
}

export function useSignals() {
  const queryClient = useQueryClient();

  const { data: signals = [], isLoading: loading, error: queryError, refetch } = useQuery<Signal[], Error>({
    queryKey: ['signals'],
    queryFn: fetchSignals,
    staleTime: 30_000,
  });

  useEffect(() => {
    return subscribeToChanges('signals', [
      { table: 'signals', onEvent: () => queryClient.invalidateQueries({ queryKey: ['signals'] }) },
    ]);
  }, [queryClient]);

  return { signals, loading, error: queryError?.message || null, refetch };
}

export type { SignalType };
