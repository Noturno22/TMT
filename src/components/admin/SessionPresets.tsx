import { View, Pressable, StyleSheet } from 'react-native';
import { AppText } from '@/components/ui';
import { Colors, Spacing } from '@/core/theme';
import { SESSION_PRESETS, type SessionPreset } from '@/core/presets';

interface SessionPresetsProps {
  onSelect: (preset: SessionPreset) => void;
}

export function SessionPresets({ onSelect }: SessionPresetsProps) {
  return (
    <View style={styles.container}>
      <AppText variant="label" style={styles.label}>SESSÕES RÁPIDAS</AppText>
      <View style={styles.grid}>
        {SESSION_PRESETS.map((preset) => (
          <Pressable
            key={preset.key}
            onPress={() => onSelect(preset)}
            style={styles.card}>
            <AppText variant="h2" style={styles.badge}>{preset.badge}</AppText>
            <AppText variant="label" style={styles.title}>{preset.title}</AppText>
            <AppText variant="small" style={styles.time}>
              {preset.time_wat} WAT · Vol {preset.volatility}
            </AppText>
            <AppText variant="small" style={styles.pairs}>
              {preset.pairs.join(', ')}
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  card: {
    width: '30%',
    flexGrow: 1,
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.sm,
    alignItems: 'center',
    gap: 2,
  },
  badge: { fontSize: 20 },
  title: { fontSize: 11, textAlign: 'center' },
  time: { color: Colors.textMuted, fontSize: 10 },
  pairs: { color: Colors.accent, fontSize: 10, fontWeight: '600' },
});
