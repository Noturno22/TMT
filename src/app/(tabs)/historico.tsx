import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Badge, EmptyState, Screen, SectionTitle, Spinner } from '@/components/ui';
import { useHistory } from '@/hooks/useHistory';
import { formatShortDate, formatDateTimeWAT } from '@/core/format';
import { Colors, Spacing } from '@/core/theme';
import { useTranslation } from 'react-i18next';
import { Animated, FadeInDown, FadeInUp, FadeOutUp, Layout } from '@/lib/animations';

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.stat}>
      <AppText variant="small" style={{ color: Colors.textMuted }}>{label}</AppText>
      <AppText variant="h1" style={{ color: color ?? Colors.text }}>{value}</AppText>
    </View>
  );
}

export default function HistoricoScreen() {
  const { t } = useTranslation();
  const { signals, stats, loading } = useHistory();
  const [pair, setPair] = useState(t('historico.allPairs'));
  const [open, setOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const pairs = useMemo(
    () => [t('historico.allPairs'), ...Array.from(new Set(signals.map((s) => s.pair)))],
    [signals, t],
  );

  const filtered = pair === t('historico.allPairs') ? signals : signals.filter((s) => s.pair === pair);

  const selectPair = (p: string) => {
    setPair(p);
    setOpen(false);
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isExpanded = (id: string) => expandedIds.has(id);

  const renderSignalDetails = (s: typeof signals[0]) => {
    const isTp = s.result === 'tp';
    const accent = isTp ? Colors.success : Colors.destructive;
    const mult = s.pair.includes('JPY') ? 100 : 10000;
    const slPips = Math.abs(s.stopLoss - s.entry) * mult;
    const tpPips = Math.abs(s.takeProfit - s.entry) * mult;
    const rr = slPips > 0 ? (tpPips / slPips).toFixed(2) : '—';

    return (
      <View style={styles.details}>
        <View style={styles.detailRow}>
          <AppText variant="small" style={{ color: Colors.textMuted }}>{t('historico.entry')}</AppText>
          <AppText variant="small" style={{ fontWeight: '600' }}>{s.entry.toFixed(5)}</AppText>
        </View>
        <View style={styles.detailRow}>
          <AppText variant="small" style={{ color: Colors.textMuted }}>{t('historico.stopLoss')}</AppText>
          <AppText variant="small" style={{ color: Colors.destructive, fontWeight: '600' }}>{s.stopLoss.toFixed(5)} ({Math.round(slPips)} pips)</AppText>
        </View>
        <View style={styles.detailRow}>
          <AppText variant="small" style={{ color: Colors.textMuted }}>{t('historico.takeProfit')}</AppText>
          <AppText variant="small" style={{ color: Colors.success, fontWeight: '600' }}>{s.takeProfit.toFixed(5)} ({Math.round(tpPips)} pips)</AppText>
        </View>
        <View style={styles.detailRow}>
          <AppText variant="small" style={{ color: Colors.textMuted }}>{t('historico.rr')}</AppText>
          <AppText variant="small" style={{ fontWeight: '600', color: Colors.accent }}>1:{rr}</AppText>
        </View>
        <View style={styles.detailRow}>
          <AppText variant="small" style={{ color: Colors.textMuted }}>{t('historico.result')}</AppText>
          <AppText variant="small" style={{ color: accent, fontWeight: '700' }}>{isTp ? t('historico.tpHit') : t('historico.slHit')}</AppText>
        </View>
        <View style={styles.detailRow}>
          <AppText variant="small" style={{ color: Colors.textMuted }}>{t('historico.dateTime')}</AppText>
          <AppText variant="small" style={{ color: Colors.text }}>{formatDateTimeWAT(s.date)}</AppText>
        </View>
      </View>
    );
  };

  return (
    <Screen>
      <SectionTitle>{t('tabs.historico')}</SectionTitle>

      <View style={styles.statsRow}>
        <Stat label={t('historico.totalSignals')} value={String(stats.total)} />
        <Stat label={t('historico.winRate')} value={`${stats.winRate}%`} color={stats.winRate >= 60 ? Colors.success : Colors.warning} />
        <Stat label={t('historico.totalPips')} value={`${stats.totalPips >= 0 ? '+' : ''}${stats.totalPips}`} color={stats.totalPips >= 0 ? Colors.success : Colors.destructive} />
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
        {t('historico.closedSignals')}
      </AppText>

      {loading ? (
        <Spinner label={t('historico.loading')} />
      ) : filtered.length === 0 ? (
        <EmptyState title={t('historico.emptyTitle')} subtitle={t('historico.emptyBody')} />
      ) : (
        filtered.map((s, index) => {
          const isTp = s.result === 'tp';
          const accent = isTp ? Colors.success : Colors.destructive;
          const expanded = isExpanded(s.id);
          return (
            <Animated.View key={s.id} entering={FadeInUp.delay(index * 60 + 100).springify()}>
              <Pressable onPress={() => toggleExpand(s.id)} style={[styles.row, { borderLeftColor: accent, borderLeftWidth: 3 }]}>
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
                <Ionicons
                  name={expanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={Colors.textFaint}
                  style={styles.chevron}
                />
                {expanded && (
                  <Animated.View entering={FadeInDown.duration(250)} exiting={FadeOutUp.duration(200)}>
                    {renderSignalDetails(s)}
                  </Animated.View>
                )}
              </Pressable>
            </Animated.View>
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
  chevron: { marginLeft: Spacing.sm },
  details: {
    marginTop: Spacing.xs,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    gap: Spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
});
