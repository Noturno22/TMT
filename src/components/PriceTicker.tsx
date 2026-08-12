import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { AppText } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/core/theme';
import type { PriceData } from '@/core/types';

export function PriceTicker({
  pairs,
  prices,
  onPressPair,
  loading,
}: {
  pairs: string[];
  prices: Record<string, PriceData>;
  onPressPair?: (pair: string) => void;
  loading?: boolean;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {pairs.map((pair) => {
        const data = prices[pair] ?? { price: '—', change: 0 };
        const up = data.change > 0;
        const changeColor = data.change === 0 ? Colors.textMuted : up ? Colors.success : Colors.destructive;
        const changeText = data.change === 0 ? '0.00%' : `${up ? '+' : ''}${data.change.toFixed(2)}%`;
        return (
          <Pressable
            key={pair}
            disabled={!onPressPair}
            onPress={onPressPair ? () => onPressPair(pair) : undefined}
            style={styles.chip}>
            <AppText variant="small" style={styles.pair}>{pair}</AppText>
            <AppText variant="mono" style={styles.price}>{loading ? '—' : data.price}</AppText>
            <AppText variant="small" style={[styles.change, { color: changeColor }]}>
              {loading ? '—' : changeText}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: Spacing.sm },
  chip: {
    minWidth: 96,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    gap: 2,
  },
  pair: { color: Colors.textMuted, fontWeight: '600' },
  price: { color: Colors.text, fontSize: 15, fontWeight: '700' },
  change: { fontWeight: '700' },
});
