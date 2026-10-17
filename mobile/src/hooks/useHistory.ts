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
      const status = row.status === 'tp' || row.status === 'sl' ? row.status : 'expired';
      const profitPips = round1(calcPips(entry, tp, sl, status, symbol));

      return {
        id: String(row.id),
        pair: formatSymbol(symbol),
        timeframe: row.timeframe ?? 'H1',
        type: formatType(row.signal_type),
        confidence: Number(row.confidence) || 50,
        entry,
        stopLoss: sl,
        takeProfit: tp,
        result: status as HistorySignal['result'],
        date: row.created_at ?? new Date().toISOString(),
        profitPips,
      };
    });

  // A taxa de acerto e o profit factor olham apenas para os sinais decididos
  // (TP/SL): um expirado nao ganhou nem perdeu. O expectancy e a media de pips
  // por trade decidido.
  const tpCount = mapped.filter((s) => s.result === 'tp').length;
  const slCount = mapped.filter((s) => s.result === 'sl').length;
  const expiredCount = mapped.filter((s) => s.result === 'expired').length;
  const decided = tpCount + slCount;
  const totalPips = mapped.reduce((sum, s) => sum + s.profitPips, 0);
  const grossProfit = mapped.filter((s) => s.result === 'tp').reduce((sum, s) => sum + s.profitPips, 0);
  const grossLoss = Math.abs(mapped.filter((s) => s.result === 'sl').reduce((sum, s) => sum + s.profitPips, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? Infinity : 0);

  return {
    signals: mapped,
    stats: {
      total: mapped.length,
      tp: tpCount,
      sl: slCount,
      expired: expiredCount,
      winRate: decided > 0 ? Math.round((tpCount / decided) * 100) : 0,
      totalPips: round1(totalPips),
      profitFactor: Number.isFinite(profitFactor) ? round1(profitFactor) : Infinity,
      expectancy: decided > 0 ? round1(totalPips / decided) : 0,
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
          const closed = (st?: string) => st === 'tp' || st === 'sl' || st === 'expired';
          if (closed(newStatus) || closed(oldStatus)) {
            queryClient.invalidateQueries({ queryKey: ['history'] });
          }
        },
      },
    ]);
  }, [queryClient]);

  return {
    signals: data?.signals ?? [],
    stats: data?.stats ?? { total: 0, tp: 0, sl: 0, expired: 0, winRate: 0, totalPips: 0, profitFactor: 0, expectancy: 0 },
    loading,
    refetch,
  };
}
