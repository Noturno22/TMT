import { useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Badge, Chip, EmptyState, Screen, SectionTitle, Spinner } from '@/components/ui';
import { SignalCard } from '@/components/SignalCard';
import { TradingViewChart } from '@/components/TradingViewChart';
import { PriceTicker } from '@/components/PriceTicker';
import { PremiumLock } from '@/components/PremiumLock';
import { MetricGrid } from '@/components/MetricGrid';
import { useSignals } from '@/hooks/useSignals';
import { useSubscription } from '@/hooks/useSubscription';
import { useLivePrices } from '@/hooks/useLivePrices';
import { ALL_PAIRS, FREE_PAIRS, TIMEFRAMES, SIGNAL_TYPES } from '@/core/gating';
import { calcOpenPips, pipsBetween } from '@/core/pips';
import { formatNumber } from '@/core/format';
import { Colors, Spacing } from '@/core/theme';
import { useTranslation } from 'react-i18next';

function decimalsFor(pair: string): number {
  if (pair.includes('JPY')) return 3;
  if (pair.includes('XAU') || pair.includes('BTC')) return 2;
  return 5;
}

export default function AnalisesScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const scrollRef = useRef<ScrollView>(null);
  const { signals, loading, error, refetch } = useSignals();
  const { isPremium } = useSubscription();

  const [pair, setPair] = useState('EUR/USD');
  const [timeframe, setTimeframe] = useState('Todos');
  const [type, setType] = useState('Todos');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const visiblePairs = isPremium ? ALL_PAIRS : FREE_PAIRS;
  const pairLocked = !isPremium && !FREE_PAIRS.includes(pair);
  const tfLocked = !isPremium && timeframe !== 'Todos' && timeframe !== 'M15';
  const locked = pairLocked || tfLocked;

  const { prices, loading: pricesLoading } = useLivePrices(visiblePairs);

  const filtered = useMemo(
    () =>
      signals.filter((s) => {
        if (pair !== 'Todos' && s.pair !== pair) return false;
        if (timeframe !== 'Todos' && s.timeframe !== timeframe) return false;
        if (type !== 'Todos' && s.type !== type) return false;
        return true;
      }),
    [signals, pair, timeframe, type],
  );

  const hero = selectedId ? filtered.find((s) => s.id === selectedId) ?? filtered[0] : filtered[0];

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const selectSignal = (id: string) => {
    setSelectedId(id);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const heroLive = hero ? Number(prices[hero.pair]?.price) : null;
  const heroPips =
    hero && heroLive !== null && isFinite(heroLive) && heroLive > 0
      ? calcOpenPips(hero.entry, heroLive, hero.type, hero.pair)
      : null;
  const heroTpPips = hero ? pipsBetween(hero.entry, hero.takeProfit, hero.pair) : 0;
  const heroSlPips = hero ? pipsBetween(hero.entry, hero.stopLoss, hero.pair) : 0;
  const heroRr = hero && heroSlPips > 0 ? (heroTpPips / heroSlPips).toFixed(1) : '—';
  const heroTypeColor = hero?.type === 'BUY' ? Colors.success : hero?.type === 'SELL' ? Colors.destructive : Colors.warning;

  return (
    <Screen scroll={false} style={styles.screen}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}>
        <SectionTitle
          right={
            <View style={styles.headerActions}>
              <Pressable onPress={() => refetch()} hitSlop={8}>
                <Ionicons name="refresh" size={18} color={Colors.primary} />
              </Pressable>
              <Pressable onPress={() => router.push('/planos')} hitSlop={8}>
                <Ionicons name="star" size={20} color={Colors.accent} />
              </Pressable>
            </View>
          }>
          {t('analises.title')}
        </SectionTitle>

        <View style={styles.tickerWrap}>
          <PriceTicker
            pairs={visiblePairs}
            prices={prices}
            loading={pricesLoading}
            onPressPair={(p) => setPair(p)}
          />
        </View>

        <View style={styles.chipRow}>
          {TIMEFRAMES.map((tf) => {
            const lockedTf = !isPremium && tf !== 'Todos' && tf !== 'M15';
            return (
              <Chip
                key={tf}
                label={tf === 'Todos' ? t('analises.filterAll') : tf}
                active={timeframe === tf}
                locked={lockedTf}
                onPress={() => setTimeframe(tf)}
              />
            );
          })}
        </View>

        <View style={styles.chipRow}>
          {SIGNAL_TYPES.map((st) => (
            <Chip
              key={st}
              label={st === 'Todos' ? t('analises.filterAll') : st}
              active={type === st}
              onPress={() => setType(st)}
            />
          ))}
        </View>

        {locked ? (
          <PremiumLock
            label={pairLocked ? t('analises.premiumTitle', { what: pair }) : t('analises.premiumSignals', { what: timeframe })}
            description={t('analises.premiumDesc')}
          />
        ) : null}

        {!locked && hero ? (
          <Pressable onPress={() => router.push(`/sinal/${hero.id}`)} style={styles.heroCard}>
            <View style={styles.heroHeader}>
              <View style={styles.heroHeaderLeft}>
                <AppText variant="h1">{hero.pair}</AppText>
                <Badge color={heroTypeColor} bg={`${heroTypeColor}1F`}>{hero.type}</Badge>
                <Badge color={Colors.textMuted} bg={`${Colors.textMuted}1F`}>{hero.timeframe}</Badge>
              </View>
              <Badge color={Colors.primary} bg={`${Colors.primary}1F`}>{t('analises.highlight')}</Badge>
            </View>

            <TradingViewChart
              pair={hero.pair}
              timeframe={hero.timeframe}
              height={300}
              entry={hero.entry}
              stopLoss={hero.stopLoss}
              takeProfit={hero.takeProfit}
            />

            <MetricGrid
              items={[
                {
                  label: t('analises.currentPrice'),
                  value: heroLive !== null && isFinite(heroLive) && heroLive > 0 ? formatNumber(heroLive, decimalsFor(hero.pair)) : '—',
                  accent: Colors.text,
                },
                {
                  label: t('analises.pipsOpen'),
                  value: heroPips === null ? '—' : `${heroPips > 0 ? '+' : ''}${heroPips.toFixed(1)}`,
                  accent: heroPips === null ? undefined : heroPips > 0 ? Colors.success : Colors.destructive,
                },
                { label: 'RR', value: `1:${heroRr}`, accent: Colors.accent },
              ]}
            />

            <View style={styles.heroLevels}>
              <View style={styles.heroLevel}>
                <AppText variant="small" style={{ color: Colors.accent }}>{t('analises.entry')}</AppText>
                <AppText variant="mono">{formatNumber(hero.entry, decimalsFor(hero.pair))}</AppText>
              </View>
              <View style={styles.heroLevel}>
                <AppText variant="small" style={{ color: Colors.destructive }}>{t('analises.sl', { count: Math.round(heroSlPips) })}</AppText>
                <AppText variant="mono">{formatNumber(hero.stopLoss, decimalsFor(hero.pair))}</AppText>
              </View>
              <View style={styles.heroLevel}>
                <AppText variant="small" style={{ color: Colors.success }}>{t('analises.tp', { count: Math.round(heroTpPips) })}</AppText>
                <AppText variant="mono">{formatNumber(hero.takeProfit, decimalsFor(hero.pair))}</AppText>
              </View>
            </View>

            <AppText variant="small" style={styles.heroCta}>
              {t('analises.viewFull')}
            </AppText>
          </Pressable>
        ) : null}

        <View style={styles.listHeader}>
          <AppText variant="label" style={{ color: Colors.textMuted }}>
            {t('analises.signalsCount', { count: filtered.length })}
          </AppText>
        </View>

        {loading ? (
          <Spinner label={t('analises.loading')} />
        ) : error ? (
          <EmptyState title="Erro a carregar sinais" subtitle={error} />
        ) : filtered.length === 0 ? (
          <EmptyState title={t('analises.emptyTitle')} subtitle={t('analises.emptyBody')} />
        ) : (
          filtered.map((s) => (
            <SignalCard
              key={s.id}
              signal={s}
              price={prices[s.pair]}
              onPress={() => selectSignal(s.id)}
            />
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 0 },
  content: { padding: Spacing.md, paddingBottom: Spacing.xl },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  tickerWrap: { marginBottom: Spacing.sm },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  heroCard: {
    backgroundColor: Colors.surface,
    borderColor: Colors.primary,
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.md,
    marginTop: Spacing.xs,
    gap: Spacing.sm,
  },
  heroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  heroLevels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.xs },
  heroLevel: { gap: 2, flex: 1 },
  heroCta: { color: Colors.primary, fontWeight: '700', textAlign: 'center', marginTop: Spacing.xs },
  listHeader: { marginVertical: Spacing.sm },
});
