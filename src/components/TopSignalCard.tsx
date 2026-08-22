import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppText, ConfidenceBar } from '@/components/ui';
import { GradientCard } from '@/components/GradientCard';
import type { PriceData, Signal } from '@/core/types';
import { formatNumber } from '@/core/format';
import { calcOpenPips } from '@/core/pips';
import { Colors, Spacing } from '@/core/theme';

function typeColor(type: Signal['type']): string {
  if (type === 'BUY') return Colors.success;
  if (type === 'SELL') return Colors.destructive;
  return Colors.warning;
}

function decimalsFor(pair: string): number {
  if (pair.includes('JPY')) return 3;
  if (pair.includes('XAU') || pair.includes('BTC')) return 2;
  return 5;
}

export function bestSignalOf(signals: Signal[]): Signal | null {
  const candidates = signals.filter((s) => s.status === 'active' || s.status === 'pending');
  if (!candidates.length) return null;
  return [...candidates].sort(
    (a, b) =>
      b.confidence - a.confidence ||
      (b.riskReward ?? 0) - (a.riskReward ?? 0),
  )[0];
}

export function TopSignalCard({
  signal,
  price,
  onPress,
}: {
  signal: Signal | null;
  price?: PriceData;
  onPress?: () => void;
}) {
  const { t } = useTranslation();

  if (!signal) return null;

  const color = typeColor(signal.type);
  const dec = decimalsFor(signal.pair);
  const live = price ? Number(price.price) : NaN;
  const openPips =
    price && isFinite(live) && live > 0
      ? calcOpenPips(signal.entry, live, signal.type, signal.pair)
      : null;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      style={styles.wrap}>
      <GradientCard
        colors={[`${color}26`, 'rgba(255,255,255,0.05)']}
        style={styles.card}>
        <View style={styles.header}>
          <View style={styles.titleWrap}>
            <Ionicons name="trophy" size={16} color={Colors.accent} />
            <AppText variant="label">{t('inicio.bestSignalTitle')}</AppText>
          </View>
          <View style={[styles.typePill, { backgroundColor: `${color}1F` }]}>
            <Ionicons name={signal.type === 'BUY' ? 'arrow-up' : signal.type === 'SELL' ? 'arrow-down' : 'pause'} size={12} color={color} />
            <AppText variant="small" style={{ color, fontWeight: '800' }}>{signal.type}</AppText>
          </View>
        </View>

        <View style={styles.bodyRow}>
          <View style={styles.pairCol}>
            <AppText variant="h1">{signal.pair}</AppText>
            <AppText variant="small" style={{ color: Colors.textMuted }}>
              {signal.timeframe}{signal.smcSetup ? ` · ${signal.smcSetup}` : ''}
            </AppText>
          </View>
          <View style={styles.confCol}>
            <ConfidenceBar value={signal.confidence} />
            {openPips !== null ? (
              <AppText variant="small" style={{ color: openPips > 0 ? Colors.success : openPips < 0 ? Colors.destructive : Colors.textMuted, fontWeight: '700', textAlign: 'right' }}>
                {openPips > 0 ? '+' : ''}{t('components.signalCard.pips', { count: openPips.toFixed(1) })}
              </AppText>
            ) : null}
          </View>
        </View>

        <View style={styles.levels}>
          <View style={styles.level}>
            <AppText variant="small" style={{ color: Colors.textMuted }}>{t('components.signalCard.entry')}</AppText>
            <AppText variant="mono" style={{ color: Colors.accent }}>{formatNumber(signal.entry, dec)}</AppText>
          </View>
          <View style={styles.level}>
            <AppText variant="small" style={{ color: Colors.textMuted }}>TP</AppText>
            <AppText variant="mono" style={{ color: Colors.success }}>{formatNumber(signal.takeProfit, dec)}</AppText>
          </View>
          <View style={styles.level}>
            <AppText variant="small" style={{ color: Colors.textMuted }}>SL</AppText>
            <AppText variant="mono" style={{ color: Colors.destructive }}>{formatNumber(signal.stopLoss, dec)}</AppText>
          </View>
        </View>
      </GradientCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: Spacing.lg },
  card: { gap: Spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  pairCol: { flexShrink: 1 },
  confCol: { width: 130, gap: 4 },
  levels: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  level: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 10,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs + 2,
    gap: 2,
  },
});
