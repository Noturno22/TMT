import { View, Pressable, StyleSheet } from 'react-native';
import { AppText } from '@/components/ui';
import { Colors, Spacing } from '@/core/theme';

interface QuickChipsProps {
  label: string;
  options: readonly string[];
  selected: string;
  onSelect: (value: string) => void;
  multiSelect?: boolean;
  selectedValues?: string[];
  onToggle?: (value: string) => void;
}

export function QuickChips({
  label,
  options,
  selected,
  onSelect,
  multiSelect = false,
  selectedValues = [],
  onToggle,
}: QuickChipsProps) {
  return (
    <View style={styles.container}>
      <AppText variant="label" style={styles.label}>{label}</AppText>
      <View style={styles.grid}>
        {options.map((option) => {
          const isActive = multiSelect
            ? selectedValues.includes(option)
            : selected === option;
          return (
            <Pressable
              key={option}
              onPress={() => multiSelect && onToggle ? onToggle(option) : onSelect(option)}
              style={[
                styles.chip,
                isActive ? styles.chipActive : styles.chipInactive,
              ]}>
              <AppText
                variant="small"
                style={[
                  styles.chipText,
                  { color: isActive ? '#1A1A2E' : Colors.textMuted },
                ]}>
                {option}
              </AppText>
            </Pressable>
          );
        })}
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
