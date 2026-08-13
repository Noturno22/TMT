import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Card, Screen } from '@/components/ui';
import { Colors, Spacing } from '@/core/theme';

export interface LegalSection {
  title: string;
  body: string;
}

export function LegalDoc({
  title,
  icon,
  intro,
  sections,
  lastUpdate = 'Janeiro 2026',
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  intro?: string;
  sections: LegalSection[];
  lastUpdate?: string;
}) {
  return (
    <Screen>
      <View style={styles.header}>
        <Ionicons name={icon} size={22} color={Colors.primary} />
        <AppText variant="h1">{title}</AppText>
      </View>
      {intro ? (
        <Card style={styles.intro}>
          <AppText>{intro}</AppText>
        </Card>
      ) : null}

      {sections.map((s, i) => (
        <View key={i} style={styles.section}>
          <AppText variant="h2">{s.title}</AppText>
          <AppText variant="muted" style={styles.body}>{s.body}</AppText>
        </View>
      ))}

      <AppText variant="small" style={{ color: Colors.textMuted, marginTop: Spacing.lg }}>
        Última atualização: {lastUpdate}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginVertical: Spacing.md },
  intro: { marginBottom: Spacing.md },
  section: { gap: Spacing.xs, marginBottom: Spacing.md },
  body: { lineHeight: 20 },
});
