import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/core/theme';
import { usePairAnalytics, useTimeframeAnalytics, useSmcSetupAnalytics } from '@/hooks/useAnalytics';
import { formatSymbol } from '@/core/format';

export function AnalyticsBreakdown() {
  const { data: pairData, isLoading: loadingPairs } = usePairAnalytics();
  const { data: tfData, isLoading: loadingTf } = useTimeframeAnalytics();
  const { data: smcData, isLoading: loadingSmc } = useSmcSetupAnalytics();

  const loading = loadingPairs || loadingTf || loadingSmc;

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>A carregar analytics...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Performance por Par</Text>
      {pairData && pairData.length > 0 ? (
        pairData.map((item) => (
          <View key={item.symbol} style={styles.row}>
            <Text style={styles.label}>{formatSymbol(item.symbol)}</Text>
            <Text style={[styles.value, { color: item.win_rate >= 50 ? Colors.success : Colors.warning }]}>
              {item.win_rate}%
            </Text>
            <Text style={styles.subValue}>{item.total} sinais</Text>
            <Text style={[styles.pipsValue, { color: item.total_pips >= 0 ? Colors.success : Colors.destructive }]}>
              {item.total_pips > 0 ? '+' : ''}{item.total_pips} pips
            </Text>
          </View>
        ))
      ) : (
        <Text style={styles.emptyText}>Sem dados de performance ainda</Text>
      )}

      <Text style={styles.sectionTitle}>Performance por Timeframe</Text>
      {tfData && tfData.length > 0 ? (
        tfData.map((item) => (
          <View key={item.timeframe} style={styles.row}>
            <Text style={styles.label}>{item.timeframe}</Text>
            <Text style={[styles.value, { color: item.win_rate >= 50 ? Colors.success : Colors.warning }]}>
              {item.win_rate}%
            </Text>
            <Text style={styles.subValue}>{item.total} sinais</Text>
            <Text style={[styles.pipsValue, { color: item.avg_pips >= 0 ? Colors.success : Colors.destructive }]}>
              {item.avg_pips > 0 ? '+' : ''}{item.avg_pips} pips/trade
            </Text>
          </View>
        ))
      ) : (
        <Text style={styles.emptyText}>Sem dados de timeframe</Text>
      )}

      <Text style={styles.sectionTitle}>Performance por Setup SMC</Text>
      {smcData && smcData.length > 0 ? (
        smcData.map((item) => (
          <View key={item.smc_setup} style={styles.row}>
            <Text style={styles.label}>{item.smc_setup}</Text>
            <Text style={[styles.value, { color: item.win_rate >= 50 ? Colors.success : Colors.warning }]}>
              {item.win_rate}%
            </Text>
            <Text style={styles.subValue}>{item.total} sinais</Text>
            <Text style={[styles.pipsValue, { color: item.avg_pips >= 0 ? Colors.success : Colors.destructive }]}>
              {item.avg_pips > 0 ? '+' : ''}{item.avg_pips} pips/trade
            </Text>
          </View>
        ))
      ) : (
        <Text style={styles.emptyText}>Sem dados de SMC</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 12, marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  label: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.text },
  value: { fontSize: 14, fontWeight: '700', marginRight: 12 },
  subValue: { fontSize: 12, color: Colors.textMuted, marginRight: 12 },
  pipsValue: { fontSize: 13, fontWeight: '600' },
  loadingText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', padding: 24 },
  emptyText: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', padding: 16, fontStyle: 'italic' },
});
