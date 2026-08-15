import { Pressable, Share, StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { AppText, Badge, Divider, EmptyState, Screen, Spinner } from '@/components/ui';
import { SignalCard } from '@/components/SignalCard';
import { TradingViewChart } from '@/components/TradingViewChart';
import { useLivePrices } from '@/hooks/useLivePrices';
import { useTranslation } from 'react-i18next';
import { formatDateTimeWAT, formatSymbol, formatTimeframe, formatType } from '@/core/format';
import { getPipMultiplier } from '@/core/pips';
import { Colors, Spacing } from '@/core/theme';
import type { Signal, SignalStatus } from '@/core/types';

function determineStatus(status: string | null, confidence: number): SignalStatus {
  if (status === 'tp' || status === 'sl' || status === 'active' || status === 'pending') {
    return status;
  }
  return Number(confidence) >= 70 ? 'active' : 'pending';
}

export default function SignalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();

  const { data: signal, isLoading, error } = useQuery<Signal | null, Error>({
    queryKey: ['signal', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('signals').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const row = data as any;
      return {
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
      } as Signal;
    },
  });

  const { prices } = useLivePrices(signal ? [signal.pair] : []);

  if (isLoading) return <Screen><Spinner label={t('sinal.loading')} /></Screen>;
  if (error || !signal) return <Screen><EmptyState title={t('sinal.notFound')} subtitle={error?.message} /></Screen>;

  const mult = getPipMultiplier(signal.pair);
  const slPips = Math.abs(signal.stopLoss - signal.entry) * mult;
  const tpPips = Math.abs(signal.takeProfit - signal.entry) * mult;
  const rr = slPips > 0 ? (tpPips / slPips).toFixed(1) : '—';

  const share = () => {
    const text = t('sinal.shareText', {
      entry: signal.entry,
      sl: signal.stopLoss,
      tp: signal.takeProfit,
      confidence: `${signal.confidence}%`,
    });
    Share.share({ message: text }).catch(() => {});
  };

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: `${signal.pair} ${signal.timeframe}`,
          headerRight: () => (
            <Pressable onPress={share} hitSlop={8}>
              <Ionicons name="share-outline" size={22} color={Colors.text} />
            </Pressable>
          ),
        }}
      />
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <AppText variant="h1">{signal.pair}</AppText>
          <Badge
            color={signal.type === 'BUY' ? Colors.success : signal.type === 'SELL' ? Colors.destructive : Colors.warning}
            bg={`${signal.type === 'BUY' ? Colors.success : signal.type === 'SELL' ? Colors.destructive : Colors.warning}1F`}>
            {signal.type}
          </Badge>
          <Badge color={Colors.textMuted} bg={`${Colors.textMuted}1F`}>{signal.timeframe}</Badge>
        </View>
        <AppText variant="small" style={{ color: Colors.textMuted }}>
          {formatDateTimeWAT(signal.createdAt)}
        </AppText>
      </View>

      <TradingViewChart
        pair={signal.pair}
        timeframe={signal.timeframe}
        height={400}
        entry={signal.entry}
        stopLoss={signal.stopLoss}
        takeProfit={signal.takeProfit}
      />

      <SignalCard signal={signal} showReasons={false} price={prices[signal.pair]} />

      <View style={styles.pipsRow}>
        <View style={styles.pipsCard}>
          <AppText variant="small" style={{ color: Colors.destructive }}>{t('sinal.slPips')}</AppText>
          <AppText variant="h1" style={{ color: Colors.destructive }}>{Math.round(slPips)}</AppText>
        </View>
        <View style={styles.pipsCard}>
          <AppText variant="small" style={{ color: Colors.success }}>{t('sinal.tpPips')}</AppText>
          <AppText variant="h1" style={{ color: Colors.success }}>{Math.round(tpPips)}</AppText>
        </View>
        <View style={styles.pipsCard}>
          <AppText variant="small" style={{ color: Colors.textMuted }}>{t('sinal.rr')}</AppText>
          <AppText variant="h1">1:{rr}</AppText>
        </View>
      </View>

      <AppText variant="label" style={{ color: Colors.textMuted, marginVertical: Spacing.sm }}>
        {t('sinal.technical')}
      </AppText>
      {signal.reasons.length === 0 ? (
        <EmptyState title={t('sinal.noReasons')} />
      ) : (
        signal.reasons.map((r, i) => (
          <View key={i} style={styles.reasonRow}>
            <AppText style={styles.reasonBullet}>•</AppText>
            <AppText style={{ flex: 1, lineHeight: 22 }}>{r}</AppText>
          </View>
        ))
      )}

      <Divider />

      <View style={[styles.warning, { marginBottom: Spacing.md }]}>
        <AppText variant="small" style={{ color: Colors.warning }}>
          ⚠️ {t('sinal.riskWarning')}
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: Spacing.sm, marginVertical: Spacing.md },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  pipsRow: { flexDirection: 'row', gap: Spacing.sm, marginVertical: Spacing.md },
  pipsCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.md,
    gap: 2,
    alignItems: 'center',
  },
  reasonRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  reasonBullet: { color: Colors.primary, fontWeight: '800' },
  warning: {
    backgroundColor: `${Colors.warning}12`,
    borderColor: `${Colors.warning}40`,
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.md,
  },
});
