import { View, Pressable, StyleSheet } from 'react-native';
import { AppText } from '@/components/ui';
import { Colors, Spacing } from '@/core/theme';
import { POPULAR_PAIRS } from '@/core/presets';

interface PairChipsProps {
  selected: string;
  onSelect: (pair: string) => void;
}

export function PairChips({ selected, onSelect }: PairChipsProps) {
  return (
    <View style={styles.container}>
      <AppText variant="label" style={styles.label}>PARES RÁPIDOS</AppText>
      <View style={styles.grid}>
        {POPULAR_PAIRS.map((pair) => (
          <Pressable
            key={pair}
            onPress={() => onSelect(pair)}
            style={[
              styles.chip,
              selected === pair
                ? styles.chipActive
                : styles.chipInactive,
            ]}>
            <AppText
              variant="small"
              style={[
                styles.chipText,
                { color: selected === pair ? '#1A1A2E' : Colors.textMuted },
              ]}>
              {pair}
            </AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.md },
  label: { color: Colors.textMuted, marginBottom: Spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  chipInactive: { backgroundColor: Colors.surfaceElevated, borderColor: Colors.border },
  chipText: { fontWeight: '600' },
});
