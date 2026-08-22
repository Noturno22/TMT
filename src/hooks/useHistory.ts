import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { subscribeToChanges } from '@/lib/realtime';
import type { HistorySignal, HistoryStats } from '@/core/types';
import { formatSymbol, formatType } from '@/core/format';
import { calcPips, round1 } from '@/core/pips';

async function fetchHistory(): Promise<{ signals: HistorySignal[]; stats: HistoryStats }> {
  const { data, error } = await supabase.rpc('get_user_history');

  if (error) throw error;

  const mapped: HistorySignal[] = (data || [])
    .map((row: any) => {
      const entry = Number(row.entry_price) || 0;
      const tp = Number(row.target_price) || 0;
      const sl = Number(row.stop_loss) || 0;
      const symbol = row.symbol || '';
      const profitPips = round1(calcPips(entry, tp, sl, row.status, symbol));

      return {
        id: String(row.id),
        pair: formatSymbol(symbol),
        timeframe: row.timeframe ?? 'H1',
        type: formatType(row.signal_type),
        confidence: Number(row.confidence) || 50,
        entry,
        stopLoss: sl,
        takeProfit: tp,
        result: row.status as 'tp' | 'sl',
        date: row.created_at ?? new Date().toISOString(),
        profitPips,
      };
    });

  const tpCount = mapped.filter((s) => s.result === 'tp').length;
  const slCount = mapped.filter((s) => s.result === 'sl').length;
  const totalPips = mapped.reduce((sum, s) => sum + s.profitPips, 0);

  return {
    signals: mapped,
    stats: {
      total: mapped.length,
      tp: tpCount,
      sl: slCount,
      winRate: mapped.length > 0 ? Math.round((tpCount / mapped.length) * 100) : 0,
      totalPips: round1(totalPips),
    },
  };
}

export function useHistory() {
  const queryClient = useQueryClient();

  const { data, isLoading: loading, refetch } = useQuery({
    queryKey: ['history'],
    queryFn: () => fetchHistory(),
    staleTime: 10_000,
    refetchInterval: 30_000,
  });

  useEffect(() => {
    return subscribeToChanges('signals-history', [
      {
        table: 'signals',
        onEvent: (payload: any) => {
          const newStatus = payload?.new?.status;
          const oldStatus = payload?.old?.status;
          if (
            newStatus === 'tp' ||
            newStatus === 'sl' ||
            oldStatus === 'tp' ||
            oldStatus === 'sl'
          ) {
            queryClient.invalidateQueries({ queryKey: ['history'] });
          }
        },
      },
    ]);
  }, [queryClient]);

  return {
    signals: data?.signals ?? [],
    stats: data?.stats ?? { total: 0, tp: 0, sl: 0, winRate: 0, totalPips: 0 },
    loading,
    refetch,
  };
}
