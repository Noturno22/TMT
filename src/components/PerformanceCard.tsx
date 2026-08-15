import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { GradientCard } from '@/components/GradientCard';
import { MetricGrid } from '@/components/MetricGrid';
import { formatPips } from '@/core/format';
import { Colors, Spacing } from '@/core/theme';
import type { HistoryStats } from '@/core/types';

export function PerformanceCard({
  stats,
  activeCount,
  loading,
  onPress,
}: {
  stats: HistoryStats;
  activeCount: number;
  loading: boolean;
  onPress: () => void;
}) {
  const total = stats.total || 0;
  const tpPct = total > 0 ? Math.round((stats.tp / total) * 100) : 0;
  const slPct = total > 0 ? Math.round((stats.sl / total) * 100) : 0;

  return (
    <Pressable onPress={onPress}>
      <GradientCard
        colors={[Colors.primaryDim, 'rgba(16,139,177,0.18)']}
        style={styles.card}>
        <View style={styles.header}>
          <AppText variant="small" style={styles.eyebrow}>DESEMPENHO</AppText>
          <AppText variant="small" style={styles.link}>Ver histórico ›</AppText>
        </View>

        <View style={styles.winRow}>
          <AppText variant="title" style={styles.win}>
            {loading ? '—' : `${stats.winRate}%`}
          </AppText>
          <AppText variant="muted" style={styles.winLabel}>Taxa de acerto</AppText>
        </View>

        <View style={styles.bars}>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { backgroundColor: Colors.success, width: `${tpPct}%` }]} />
          </View>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { backgroundColor: Colors.destructive, width: `${slPct}%` }]} />
          </View>
        </View>
        <View style={styles.barLegend}>
          <AppText variant="small" style={{ color: Colors.success }}>TP {tpPct}%</AppText>
          <AppText variant="small" style={{ color: Colors.destructive }}>SL {slPct}%</AppText>
        </View>

        <MetricGrid
          items={[
            { label: 'Pips totais', value: loading ? '—' : formatPips(stats.totalPips), accent: Colors.accent },
            { label: 'Sinais totais', value: loading ? '—' : String(stats.total) },
            { label: 'Ativos agora', value: String(activeCount), accent: activeCount > 0 ? Colors.success : undefined },
          ]}
        />
      </GradientCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: Spacing.lg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  eyebrow: { color: Colors.textMuted, fontWeight: '700', letterSpacing: 1 },
  link: { color: Colors.textMuted },
  winRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  win: { fontSize: 48, lineHeight: 52 },
  winLabel: { flex: 1 },
  bars: { gap: 6, marginBottom: Spacing.sm },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 3 },
  barLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
});
