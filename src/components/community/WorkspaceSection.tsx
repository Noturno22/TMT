import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { Colors, Spacing } from '@/core/theme';

export function WorkspaceSection({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <AppText variant="label" style={styles.title}>{title}</AppText>
        {right}
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: Spacing.lg, gap: Spacing.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: Colors.textFaint, letterSpacing: 1.2 },
  body: { gap: Spacing.sm },
});
