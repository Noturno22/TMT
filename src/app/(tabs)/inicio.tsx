import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { AppText, EmptyState, Screen, Spinner } from '@/components/ui';
import { AnnouncementCard } from '@/components/AnnouncementCard';
import { ChannelSignals } from '@/components/ChannelSignals';
import { DashboardHeader } from '@/components/DashboardHeader';
import { NewsCard } from '@/components/NewsCard';
import { NextBoomCard } from '@/components/NextBoomCard';
import { PerformanceCard } from '@/components/PerformanceCard';
import { PriceTicker } from '@/components/PriceTicker';
import { SectionHeader } from '@/components/SectionHeader';
import { TopSignalCard, bestSignalOf } from '@/components/TopSignalCard';
import { useBoomHours } from '@/hooks/useBoomHours';
import { useChannels } from '@/hooks/useChannels';
import { useHistory } from '@/hooks/useHistory';
import { useLivePrices } from '@/hooks/useLivePrices';
import { useSignals } from '@/hooks/useSignals';
import { useSubscription } from '@/hooks/useSubscription';
import { boomEpochMs, getNextBoomHour } from '@/core/booms';
import { Colors, Spacing } from '@/core/theme';
import { useTourTarget } from '@/components/tour/registry';
import { useTranslation } from 'react-i18next';
import { Animated, FadeInUp } from '@/lib/animations';

const TICKER_PAIRS = ['XAU/USD', 'EUR/USD', 'GBP/USD', 'USD/JPY'];
const PREVIEW_COUNT = 3;

export default function InicioScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isPremium } = useSubscription();
  const { prices, loading: pricesLoading } = useLivePrices(TICKER_PAIRS);
  const { stats, loading: historyLoading, refetch: refetchHistory } = useHistory();
  const { signals, refetch: refetchSignals } = useSignals();
  const { hours, loading: hoursLoading, refetch: refetchHours } = useBoomHours();
  const { channels } = useChannels();
  const performanceRef = useTourTarget('tour:inicio-performance');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchHistory(),
        refetchSignals(),
        refetchHours(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchHistory, refetchSignals, refetchHours]);

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

  const activeCount = signals.filter((s) => s.status === 'active' || s.status === 'pending').length;
  const topSignal = bestSignalOf(signals);

  return (
    <Screen scroll={false} safeTop style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }>
        <DashboardHeader isPremium={isPremium} />

        <AnnouncementCard />

        <View style={styles.ticker}>
          <PriceTicker pairs={TICKER_PAIRS} prices={prices} loading={pricesLoading} />
        </View>

        <View ref={performanceRef} collapsable={false}>
          <PerformanceCard
            stats={stats}
            activeCount={activeCount}
            loading={historyLoading}
            onPress={() => router.push('/(tabs)/historico')}
          />
        </View>

        <NewsCard />

        <TopSignalCard
          signal={topSignal}
          price={topSignal ? prices[topSignal.pair] : undefined}
          onPress={topSignal ? () => router.push(`/sinal/${topSignal.id}`) : undefined}
        />

        <NextBoomCard nextEpochMs={nextEpochMs} />

        <ChannelSignals channels={channels} signals={signals} />

        <SectionHeader
          title={t('inicio.nextHours')}
          subtitle={t('inicio.highVolatility')}
          action={{ label: t('inicio.viewAll'), onPress: () => router.push('/(tabs)/horarios') }}
        />

        {hoursLoading ? (
          <Spinner label={t('inicio.loadingHours')} />
        ) : upcoming.length === 0 ? (
          <EmptyState title={t('inicio.emptyTitle')} subtitle={t('inicio.emptyBody')} />
        ) : (
          upcoming.map(({ hour }, index) => (
            <Animated.View key={hour.id} entering={FadeInUp.delay(index * 80 + 200).springify()}>
              <Pressable
                onPress={() => router.push('/(tabs)/horarios')}
                style={styles.boomRow}>
                <View style={styles.boomTimeCol}>
                  <AppText style={styles.boomTime}>{hour.time_wat}</AppText>
                  <AppText variant="small" style={{ color: Colors.textMuted }}>{t('inicio.wat')}</AppText>
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
            </Animated.View>
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
