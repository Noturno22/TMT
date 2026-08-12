import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { Colors, Spacing } from '@/core/theme';

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={styles.row}>
      <View style={styles.textWrap}>
        <AppText variant="h2">{title}</AppText>
        {subtitle ? <AppText variant="small" style={styles.subtitle}>{subtitle}</AppText> : null}
      </View>
      {action ? (
        <Pressable onPress={action.onPress} hitSlop={8}>
          <AppText variant="small" style={styles.action}>{action.label}</AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  textWrap: { flex: 1, gap: 2 },
  subtitle: { color: Colors.textMuted },
  action: { color: Colors.primary, fontWeight: '700' },
});
