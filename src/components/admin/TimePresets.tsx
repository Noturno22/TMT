import { View, Pressable, StyleSheet } from 'react-native';
import { AppText } from '@/components/ui';
import { Colors, Spacing } from '@/core/theme';
import { TIME_OFFSETS } from '@/core/presets';

interface TimePresetsProps {
  value: number;
  onChange: (minutes: number) => void;
}

export function TimePresets({ value, onChange }: TimePresetsProps) {
  return (
    <View style={styles.container}>
      <AppText variant="label" style={styles.label}>DAQUI A</AppText>
      <View style={styles.row}>
        {TIME_OFFSETS.map((offset) => (
          <Pressable
            key={offset.minutes}
            onPress={() => onChange(offset.minutes)}
            style={[
              styles.chip,
              value === offset.minutes
                ? styles.chipActive
                : styles.chipInactive,
            ]}>
            <AppText
              variant="small"
              style={[
                styles.chipText,
                { color: value === offset.minutes ? '#1A1A2E' : Colors.textMuted },
              ]}>
              {offset.label}
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
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipInactive: { backgroundColor: Colors.surfaceElevated, borderColor: Colors.border },
  chipText: { fontWeight: '600' },
});
