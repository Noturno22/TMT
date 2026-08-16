import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { subscribeToChanges } from '@/lib/realtime';
import type { Signal, SignalStatus, SignalType, SignalTier } from '@/core/types';
import { formatSymbol, formatTimeframe, formatType } from '@/core/format';
import { isForexSymbol, isWeekendUtc } from '@/core/community';
import { notifyNewSignal } from '@/lib/signalNotifications';
import { useSubscription } from '@/hooks/useSubscription';

// Pares crypto - apenas Pro/Premium
const PRO_ONLY_PAIRS = new Set([
  'BTC/USD', 'ETH/USD', 'BTCUSDT', 'ETHUSDT',
]);

function isPairProOnly(pair: string): boolean {
  return PRO_ONLY_PAIRS.has(pair);
}

// Configuração de qualidade - Sinais sérios para traders sérios
const SIGNAL_QUALITY = {
  MIN_CONFIDENCE: 75,        // Mínimo 75% confiança
  MIN_RISK_REWARD: 1.5,      // Mínimo 1:1.5 R:R
  MAX_PER_DAY: 12,           // Máximo 12 sinais/dia (qualidade > quantidade)
  MAX_ACTIVE: 20,            // Máximo 20 sinais ativos simultâneos
} as const;

function determineStatus(status: string | null, confidence: number): SignalStatus {
  if (status === 'tp') return 'tp';
  if (status === 'sl') return 'sl';
  if (status === 'active') return 'active';
  if (status === 'pending') return 'pending';
  return Number(confidence) >= 70 ? 'active' : 'pending';
}

function determineTier(status: string | null, confidence: number, isPremium: boolean): SignalTier {
  if (isPremium) return 'premium';
  if (Number(confidence) >= 80) return 'pro';
  return 'free';
}

function calculateRiskReward(entry: number, sl: number, tp: number): number | undefined {
  if (!entry || !sl || !tp) return undefined;
  const risk = Math.abs(entry - sl);
  const reward = Math.abs(tp - entry);
  if (risk === 0) return undefined;
  return Number((reward / risk).toFixed(1));
}

function passesQualityFilter(confidence: number, rr: number | undefined): boolean {
  if (confidence < SIGNAL_QUALITY.MIN_CONFIDENCE) return false;
  if (rr !== undefined && rr < SIGNAL_QUALITY.MIN_RISK_REWARD) return false;
  return true;
}

async function fetchSignals(userTier: SignalTier = 'free'): Promise<Signal[]> {
  const { data, error } = await supabase
    .from('signals')
    .select('*')
    .in('status', ['active', 'pending']) // Só sinais abertos
    .order('created_at', { ascending: false })
    .limit(SIGNAL_QUALITY.MAX_ACTIVE);

  if (error) throw error;

  const isPremium = userTier === 'premium' || userTier === 'pro';

  const mapped = (data || []).map((row: any) => {
    const entry = Number(row.entry_price) || 0;
    const sl = Number(row.stop_loss) || 0;
    const tp = Number(row.target_price) || 0;
    const confidence = Number(row.confidence) || 50;
    const tier = determineTier(row.status, confidence, isPremium);
    const rr = calculateRiskReward(entry, sl, tp);

    return {
      id: String(row.id),
      pair: formatSymbol(row.symbol),
      timeframe: formatTimeframe(row.timeframe),
      type: formatType(row.signal_type),
      confidence,
      entry,
      stopLoss: sl,
      takeProfit: tp,
      reasons: Array.isArray(row.reasons) ? row.reasons : [],
      createdAt: row.created_at ?? new Date().toISOString(),
      status: determineStatus(row.status, confidence),
      tier,
      riskReward: rr,
      expiresAt: row.expires_at ?? undefined,
      analysis: row.analysis ?? undefined,
      probabilityScore: row.probability_score ?? undefined,
    };
  });

  // Filtrar por qualidade
  let qualityFiltered = mapped.filter((s) => passesQualityFilter(s.confidence, s.riskReward));

  // Filtrar pares Pro-only para usuários Free
  if (userTier === 'free') {
    qualityFiltered = qualityFiltered.filter((s) => !isPairProOnly(s.pair));
  }

  // Fim de semana: apenas crypto (forex/ouro com mercado fechado)
  if (isWeekendUtc()) {
    qualityFiltered = qualityFiltered.filter((s) => !isForexSymbol(s.pair));
    console.log('[Signals] Fim de semana - apenas crypto, restam:', qualityFiltered.length);
  }

  // Priorizar sinais de hoje com qualidade, completar com anteriores se necessário
  const today = new Date().toISOString().split('T')[0];
  const todaysSignals = qualityFiltered.filter((s) => s.createdAt.startsWith(today));
  const result = [
    ...todaysSignals.slice(0, SIGNAL_QUALITY.MAX_PER_DAY),
    ...qualityFiltered.filter((s) => !todaysSignals.includes(s)).slice(0, SIGNAL_QUALITY.MAX_ACTIVE - SIGNAL_QUALITY.MAX_PER_DAY),
  ];

  return result.slice(0, SIGNAL_QUALITY.MAX_ACTIVE);
}

export function useSignals() {
  const queryClient = useQueryClient();
  const notifiedRef = useRef<Set<string>>(new Set());
  const { planTier } = useSubscription();

  // Mapear PlanTier → SignalTier (basic = free para fins de sinais)
  const signalTier: SignalTier = planTier === 'pro' || planTier === 'premium' ? planTier : 'free';

  const { data: signals = [], isLoading: loading, error: queryError, refetch } = useQuery<Signal[], Error>({
    queryKey: ['signals', signalTier],
    queryFn: () => fetchSignals(signalTier),
    staleTime: 30_000,
  });

  // Notificar novos sinais
  useEffect(() => {
    if (loading || !signals.length) return;
    for (const signal of signals) {
      if (!notifiedRef.current.has(signal.id)) {
        notifiedRef.current.add(signal.id);
        notifyNewSignal(signal).catch(() => {});
      }
    }
    // Limpar IDs antigos se muitos
    if (notifiedRef.current.size > 500) {
      const arr = Array.from(notifiedRef.current);
      notifiedRef.current = new Set(arr.slice(-250));
    }
  }, [signals, loading]);

  useEffect(() => {
    return subscribeToChanges('signals', [
      { table: 'signals', onEvent: () => queryClient.invalidateQueries({ queryKey: ['signals'] }) },
    ]);
  }, [queryClient]);

  return { signals, loading, error: queryError?.message || null, refetch };
}

export type { SignalType };
