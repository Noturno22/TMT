import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { AppText, EmptyState, Spinner } from '@/components/ui';
import { TradingViewChart } from '@/components/TradingViewChart';
import { useTranslation } from 'react-i18next';
import { formatSymbol, formatTimeframe, formatType } from '@/core/format';
import { Colors, Spacing } from '@/core/theme';
import type { Signal } from '@/core/types';

export default function ChartFullScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { height } = useWindowDimensions();

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
        status: 'active',
      } as Signal;
    },
  });

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Spinner label={t('sinal.loading')} />
      </View>
    );
  }

  if (error || !signal) {
    return (
      <View style={styles.container}>
        <EmptyState title={t('sinal.notFound')} subtitle={error?.message} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <TradingViewChart
        pair={signal.pair}
        timeframe={signal.timeframe}
        height={height}
        entry={signal.entry}
        stopLoss={signal.stopLoss}
        takeProfit={signal.takeProfit}
        style={{ marginBottom: 0, borderRadius: 0 }}
      />
      <View style={styles.header}>
        <Pressable style={styles.closeBtn} hitSlop={8} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={Colors.text} />
        </Pressable>
        <AppText variant="h2" style={styles.title} numberOfLines={1}>{signal.pair} {signal.timeframe}</AppText>
        <View style={styles.closeBtn} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  header: {
    position: 'absolute',
    top: Spacing.lg,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
  },
  closeBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { textAlign: 'center', flex: 1, color: Colors.text },
});
