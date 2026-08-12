import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppText, EmptyState, Screen, Spinner } from '@/components/ui';
import { DashboardHeader } from '@/components/DashboardHeader';
import { NextBoomCard } from '@/components/NextBoomCard';
import { PerformanceCard } from '@/components/PerformanceCard';
import { PriceTicker } from '@/components/PriceTicker';
import { SectionHeader } from '@/components/SectionHeader';
import { useBoomHours } from '@/hooks/useBoomHours';
import { useHistory } from '@/hooks/useHistory';
import { useLivePrices } from '@/hooks/useLivePrices';
import { useSignals } from '@/hooks/useSignals';
import { useSubscription } from '@/hooks/useSubscription';
import { boomEpochMs, getNextBoomHour } from '@/core/booms';
import { Colors, Spacing } from '@/core/theme';

const TICKER_PAIRS = ['XAU/USD', 'EUR/USD', 'GBP/USD', 'USD/JPY'];
const PREVIEW_COUNT = 3;

export default function InicioScreen() {
  const router = useRouter();
  const { isPremium } = useSubscription();
  const { prices, loading: pricesLoading } = useLivePrices(TICKER_PAIRS);
  const { stats, loading: historyLoading } = useHistory();
  const { signals } = useSignals();
  const { hours, loading: hoursLoading } = useBoomHours();

  const now = new Date();
  const nextHour = getNextBoomHour(hours, now);
  let nextEpochMs: number | undefined;
  if (nextHour) {
    const epoch = boomEpochMs(now, nextHour.time_wat);
    if (epoch > now.getTime()) nextEpochMs = epoch;
  }

  const upcoming = hours
    .map((h) => ({ hour: h, epoch: boomEpochMs(now, h.time_wat) }))
    .filter((x) => x.epoch >= now.getTime())
    .sort((a, b) => a.epoch - b.epoch)
    .slice(0, PREVIEW_COUNT);

  const activeCount = signals.filter((s) => s.status === 'active').length;

  return (
    <Screen scroll={false} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <DashboardHeader isPremium={isPremium} />

        <View style={styles.ticker}>
          <PriceTicker pairs={TICKER_PAIRS} prices={prices} loading={pricesLoading} />
        </View>

        <PerformanceCard
          stats={stats}
          activeCount={activeCount}
          loading={historyLoading}
          onPress={() => router.push('/(tabs)/historico')}
        />

        <NextBoomCard nextEpochMs={nextEpochMs} />

        <SectionHeader
          title="Próximos horários"
          subtitle="Janelas de alta volatilidade"
          action={{ label: 'Ver todos', onPress: () => router.push('/(tabs)/horarios') }}
        />

        {hoursLoading ? (
          <Spinner label="A carregar horários…" />
        ) : upcoming.length === 0 ? (
          <EmptyState title="Sem horários" subtitle="Ainda não há horários ativos." />
        ) : (
          upcoming.map(({ hour }) => (
            <Pressable
              key={hour.id}
              onPress={() => router.push('/(tabs)/horarios')}
              style={styles.boomRow}>
              <View style={styles.boomTimeCol}>
                <AppText style={styles.boomTime}>{hour.time_wat}</AppText>
                <AppText variant="small" style={{ color: Colors.textMuted }}>WAT</AppText>
              </View>
              <View style={styles.boomBody}>
                <AppText variant="h2" numberOfLines={1}>{hour.title}</AppText>
                <View style={styles.pairs}>
                  {(hour.pairs || []).slice(0, 3).map((p) => (
                    <View key={p} style={styles.pairChip}>
                      <AppText variant="small" style={{ color: Colors.success, fontWeight: '700' }}>{p}</AppText>
                    </View>
                  ))}
                </View>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 0 },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xl },
  ticker: { marginBottom: Spacing.lg },
  boomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  boomTimeCol: { alignItems: 'center', minWidth: 64 },
  boomTime: { fontSize: 22, fontWeight: '800', color: Colors.accent, fontFamily: 'monospace' },
  boomBody: { flex: 1, gap: Spacing.xs },
  pairs: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  pairChip: {
    backgroundColor: `${Colors.success}1A`,
    borderColor: `${Colors.success}40`,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
});
