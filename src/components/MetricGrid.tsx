import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { Colors, Spacing } from '@/core/theme';

export interface MetricItem {
  label: string;
  value: string;
  accent?: string;
}

export function MetricGrid({ items }: { items: MetricItem[] }) {
  return (
    <View style={styles.row}>
      {items.map((m) => (
        <View key={m.label} style={styles.item}>
          <AppText variant="h1" style={[styles.value, { color: m.accent ?? Colors.text }]} numberOfLines={1}>
            {m.value}
          </AppText>
          <AppText variant="small" style={styles.label}>{m.label}</AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.sm },
  item: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    gap: 2,
  },
  value: { fontSize: 18 },
  label: { color: Colors.textMuted, textAlign: 'center' },
});
