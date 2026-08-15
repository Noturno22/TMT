import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Signal, PriceData } from '@/core/types';
import { formatNumber, timeAgo } from '@/core/format';
import { calcOpenPips, getPipMultiplier, pipsBetween } from '@/core/pips';
import { Colors, Spacing } from '@/core/theme';
import { AppText, Badge, Card, ConfidenceBar } from '@/components/ui';

function typeBadge(type: Signal['type']) {
  switch (type) {
    case 'BUY':
      return { label: 'BUY', color: Colors.success, icon: 'arrow-up' as const };
    case 'SELL':
      return { label: 'SELL', color: Colors.destructive, icon: 'arrow-down' as const };
    default:
      return { label: 'AGUARDAR', color: Colors.warning, icon: 'pause' as const };
  }
}

function statusBadge(status: Signal['status']) {
  switch (status) {
    case 'tp':
      return { label: 'TP', color: Colors.success };
    case 'sl':
      return { label: 'SL', color: Colors.destructive };
    case 'active':
      return { label: 'ATIVO', color: Colors.success };
    default:
      return { label: 'PENDENTE', color: Colors.textMuted };
  }
}

function decimalsFor(pair: string): number {
  if (pair.includes('JPY')) return 3;
  if (pair.includes('XAU') || pair.includes('BTC')) return 2;
  return 5;
}

function parseLive(price: PriceData | undefined): number | null {
  const n = Number(price?.price);
  return price && isFinite(n) && n > 0 ? n : null;
}

function LevelLadder({
  entry,
  stopLoss,
  takeProfit,
  live,
  pair,
}: {
  entry: number;
  stopLoss: number;
  takeProfit: number;
  live: number | null;
  pair: string;
}) {
  const tpPips = pipsBetween(entry, takeProfit, pair);
  const slPips = pipsBetween(entry, stopLoss, pair);

  const min = Math.min(entry, stopLoss, takeProfit, live ?? entry);
  const max = Math.max(entry, stopLoss, takeProfit, live ?? entry);
  const span = max - min || 1;
  const pos = (p: number) => `${((max - p) / span) * 100}%` as `${number}%`;

  const line = (p: number, color: string, width = 2) => ({
    top: pos(p),
    backgroundColor: color,
    height: width,
    borderRadius: width / 2,
  });

  // Ordenar níveis para empilhar labels sem overlap
  const levels = [
    { key: 'tp', price: takeProfit, color: Colors.success, label: 'TP', pips: tpPips },
    ...(live !== null ? [{ key: 'live', price: live, color: Colors.text, label: '●', pips: null, isLive: true }] : []),
    { key: 'entry', price: entry, color: Colors.accent, label: 'ENTRADA', pips: 0 },
    { key: 'sl', price: stopLoss, color: Colors.destructive, label: 'SL', pips: slPips },
  ];

  return (
    <View style={styles.ladder}>
      <View style={styles.ladderTrack}>
        <View style={[styles.ladderLine, line(takeProfit, Colors.success)]} />
        <View style={[styles.ladderLine, line(entry, Colors.accent)]} />
        <View style={[styles.ladderLine, line(stopLoss, Colors.destructive)]} />
        {live !== null ? (
          <View style={[styles.liveDot, { top: pos(live) }]}>
            <Ionicons name="locate" size={11} color={Colors.text} />
          </View>
        ) : null}
      </View>

      <View style={styles.ladderLabels}>
        {levels.map((lvl, idx) => (
          <View key={lvl.key} style={styles.ladderRow}>
            <View style={styles.ladderLabelBox}>
              <AppText variant="small" style={{ color: lvl.color, fontWeight: '700' }}>
                {lvl.label}
              </AppText>
              <AppText variant="mono" style={{ color: lvl.color, fontWeight: '700' }}>
                {formatNumber(lvl.price, decimalsFor(pair))}
              </AppText>
              {lvl.pips !== null && lvl.pips !== undefined && (
                <AppText variant="small" style={{ color: lvl.color }}>
                  {Math.round(lvl.pips)} pips
                </AppText>
              )}
              {lvl.isLive && (
                <AppText variant="small" style={{ color: Colors.textMuted }}>agora</AppText>
              )}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export function SignalCard({
  signal,
  onPress,
  showReasons = true,
  price,
}: {
  signal: Signal;
  onPress?: () => void;
  showReasons?: boolean;
  price?: PriceData;
}) {
  const type = typeBadge(signal.type);
  const status = statusBadge(signal.status);
  const mult = getPipMultiplier(signal.pair);
  const entryPips = Math.abs(signal.takeProfit - signal.entry) * mult;
  const slPips = Math.abs(signal.stopLoss - signal.entry) * mult;
  const rr = slPips > 0 ? (entryPips / slPips).toFixed(1) : '—';
  const live = parseLive(price);
  const openPips = live !== null ? calcOpenPips(signal.entry, live, signal.type, signal.pair) : null;
  const isProfitable = openPips !== null && openPips > 0;

  return (
    <Pressable onPress={onPress}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <AppText variant="h2">{signal.pair}</AppText>
            <View style={[styles.typePill, { backgroundColor: `${type.color}1F` }]}>
              <Ionicons name={type.icon} size={12} color={type.color} />
              <AppText variant="small" style={{ color: type.color, fontWeight: '800' }}>{type.label}</AppText>
            </View>
          </View>
          <Badge bg={`${status.color}1F`} color={status.color}>{status.label}</Badge>
        </View>

        <View style={styles.meta}>
          <AppText variant="muted">{signal.timeframe}</AppText>
          <AppText variant="muted">•</AppText>
          <AppText variant="muted">RR 1:{rr}</AppText>
          <View style={styles.spacer} />
          <AppText variant="small" style={{ color: Colors.textFaint }}>{timeAgo(signal.createdAt)}</AppText>
        </View>

        <ConfidenceBar value={signal.confidence} />

        <LevelLadder
          entry={signal.entry}
          stopLoss={signal.stopLoss}
          takeProfit={signal.takeProfit}
          live={live}
          pair={signal.pair}
        />

        {live !== null && openPips !== null ? (
          <View style={styles.liveRow}>
            <AppText variant="small" style={{ color: Colors.textMuted }}>
              {isProfitable ? 'Em lucro' : openPips < 0 ? 'Em perda' : 'No ponto'} ·
            </AppText>
            <AppText variant="small" style={{ color: isProfitable ? Colors.success : openPips < 0 ? Colors.destructive : Colors.textMuted, fontWeight: '800' }}>
              {openPips > 0 ? '+' : ''}{openPips.toFixed(1)} pips
            </AppText>
          </View>
        ) : null}

        <View style={styles.levels}>
          <View style={styles.level}>
            <AppText variant="small" style={{ color: Colors.accent }}>ENTRADA</AppText>
            <AppText variant="mono">{formatNumber(signal.entry, decimalsFor(signal.pair))}</AppText>
          </View>
          <View style={styles.level}>
            <AppText variant="small" style={{ color: Colors.destructive }}>SL</AppText>
            <AppText variant="mono">{formatNumber(signal.stopLoss, decimalsFor(signal.pair))}</AppText>
          </View>
          <View style={styles.level}>
            <AppText variant="small" style={{ color: Colors.success }}>TP</AppText>
            <AppText variant="mono">{formatNumber(signal.takeProfit, decimalsFor(signal.pair))}</AppText>
          </View>
        </View>

        {showReasons && signal.reasons.length > 0 ? (
          <View style={styles.reasons}>
            <AppText variant="small" style={{ color: Colors.textMuted, fontWeight: '600' }}>
              ANÁLISE
            </AppText>
            {signal.reasons.slice(0, 2).map((r, i) => (
              <View key={i} style={styles.reasonRow}>
                <Ionicons name="checkmark-circle" size={13} color={type.color} />
                <AppText variant="small" style={{ flex: 1 }}>{r}</AppText>
              </View>
            ))}
            {signal.reasons.length > 2 ? (
              <AppText variant="small" style={{ color: Colors.textMuted }}>
                +{signal.reasons.length - 2} razões
              </AppText>
            ) : null}
          </View>
        ) : null}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: Spacing.md, gap: Spacing.sm + Spacing.xs },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  meta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  spacer: { flex: 1 },
  ladder: { flexDirection: 'row', marginTop: Spacing.xs },
  ladderTrack: { width: 24, alignItems: 'center', justifyContent: 'center' },
  ladderLine: { position: 'absolute', left: 0, right: 0 },
  liveDot: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderColor: Colors.text,
    borderWidth: 1,
    transform: [{ translateY: -9 }],
  },
  ladderLabels: { flex: 1, position: 'relative', gap: 4 },
  ladderRow: {
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  ladderLabelBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  levels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.xs },
  level: { gap: 2, flex: 1 },
  reasons: { gap: Spacing.xs, marginTop: Spacing.xs },
  reasonRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
});
