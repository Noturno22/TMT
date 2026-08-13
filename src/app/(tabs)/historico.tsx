import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Badge, EmptyState, Screen, SectionTitle, Spinner } from '@/components/ui';
import { useHistory } from '@/hooks/useHistory';
import { formatShortDate } from '@/core/format';
import { Colors, Spacing } from '@/core/theme';

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.stat}>
      <AppText variant="small" style={{ color: Colors.textMuted }}>{label}</AppText>
      <AppText variant="h1" style={{ color: color ?? Colors.text }}>{value}</AppText>
    </View>
  );
}

export default function HistoricoScreen() {
  const { signals, stats, loading } = useHistory();
  const [pair, setPair] = useState('Todos os pares');
  const [open, setOpen] = useState(false);

  const pairs = useMemo(
    () => ['Todos os pares', ...Array.from(new Set(signals.map((s) => s.pair)))],
    [signals],
  );

  const filtered = pair === 'Todos os pares' ? signals : signals.filter((s) => s.pair === pair);

  const selectPair = (p: string) => {
    setPair(p);
    setOpen(false);
  };

  return (
    <Screen>
      <SectionTitle>Histórico</SectionTitle>

      <View style={styles.statsRow}>
        <Stat label="Total Sinais" value={String(stats.total)} />
        <Stat label="Taxa de Acerto" value={`${stats.winRate}%`} color={stats.winRate >= 60 ? Colors.success : Colors.warning} />
        <Stat label="Pips Totais" value={`${stats.totalPips >= 0 ? '+' : ''}${stats.totalPips}`} color={stats.totalPips >= 0 ? Colors.success : Colors.destructive} />
      </View>

      <Pressable onPress={() => setOpen((v) => !v)} style={styles.pairFilter}>
        <AppText variant="small" style={{ color: Colors.textMuted }}>{pair}</AppText>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textMuted} />
      </Pressable>

      {open ? (
        <View style={styles.pairOptions}>
          {pairs.map((p) => {
            const active = pair === p;
            return (
              <Pressable
                key={p}
                onPress={() => selectPair(p)}
                style={[styles.pairChip, active && styles.pairChipActive]}>
                <AppText
                  variant="small"
                  style={{ color: active ? Colors.bg : Colors.textMuted, fontWeight: '600' }}>
                  {p}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <AppText variant="label" style={{ color: Colors.textMuted, marginTop: Spacing.md, marginBottom: Spacing.sm }}>
        SINAIS FECHADOS
      </AppText>

      {loading ? (
        <Spinner label="A carregar histórico…" />
      ) : filtered.length === 0 ? (
        <EmptyState title="Sem histórico" subtitle="Ainda não há sinais fechados." />
      ) : (
        filtered.map((s) => {
          const isTp = s.result === 'tp';
          const accent = isTp ? Colors.success : Colors.destructive;
          return (
            <View key={s.id} style={[styles.row, { borderLeftColor: accent, borderLeftWidth: 3 }]}>
              <View style={styles.rowTop}>
                <View style={styles.rowLeft}>
                  <AppText variant="label" style={{ fontWeight: '700' }}>{s.pair}</AppText>
                  <Badge
                    color={s.type === 'BUY' ? Colors.success : s.type === 'SELL' ? Colors.destructive : Colors.warning}
                    bg={`${s.type === 'BUY' ? Colors.success : s.type === 'SELL' ? Colors.destructive : Colors.warning}1F`}>
                    {s.type}
                  </Badge>
                  <AppText variant="small" style={{ color: Colors.textMuted }}>{s.timeframe}</AppText>
                </View>
                <Badge color={accent} bg={`${accent}1F`}>{isTp ? 'TP' : 'SL'}</Badge>
              </View>
              <View style={styles.rowBottom}>
                <AppText variant="small" style={{ color: Colors.textMuted }}>
                  {s.entry.toFixed(5)} → {s.takeProfit.toFixed(5)}
                </AppText>
                <AppText variant="small" style={{ color: Colors.textFaint }}>{formatShortDate(s.date)}</AppText>
              </View>
            </View>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  stat: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.md,
    gap: 2,
    alignItems: 'center',
  },
  pairFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: Spacing.sm,
  },
  pairOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm },
  pairChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.surfaceElevated,
  },
  pairChipActive: { backgroundColor: Colors.accent },
  row: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  rowBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
