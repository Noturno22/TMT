import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Badge, Screen } from '@/components/ui';
import { GradientCard } from '@/components/GradientCard';
import { SectionHeader } from '@/components/SectionHeader';
import { WalletCard } from '@/components/WalletCard';
import { avatarLetter, displayName } from '@/core/format';
import { Colors, Spacing } from '@/core/theme';
import { useAuth } from '@/hooks/useAuth';
import { useBanca } from '@/hooks/useBanca';
import { useSubscription } from '@/hooks/useSubscription';

function MenuRow({
  icon,
  label,
  color = Colors.secondary,
  onPress,
  danger,
  right,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color?: string;
  onPress?: () => void;
  danger?: boolean;
  right?: React.ReactNode;
}) {
  const tint = danger ? Colors.destructive : color;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.menuRow, pressed && { backgroundColor: Colors.surfaceElevated }]}>
      <View style={[styles.menuIcon, { backgroundColor: `${tint}1A` }]}>
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <AppText style={{ flex: 1, color: danger ? Colors.destructive : Colors.textBody }}>{label}</AppText>
      {right}
      <Ionicons name="chevron-forward" size={16} color={Colors.textFaint} />
    </Pressable>
  );
}

export default function PerfilScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { isPremium, subscription } = useSubscription();
  const { config: banca } = useBanca();

  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString('pt-PT')
    : null;

  const confirmSignOut = () => {
    Alert.alert('Sair', 'Tens a certeza que queres sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  return (
    <Screen scroll={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <GradientCard
          colors={[Colors.primaryDim, 'rgba(255,201,21,0.07)']}
          style={styles.identity}>
          <View style={styles.avatar}>
            <AppText style={styles.avatarText}>{user ? avatarLetter(user) : 'T'}</AppText>
          </View>
          <AppText variant="h1">{user ? displayName(user) : 'Trader'}</AppText>
          <AppText variant="muted">{user?.email ?? 'Não autenticado'}</AppText>
          {user ? (
            <View style={styles.badgeWrap}>
              {isPremium ? (
                <Badge color={Colors.accent} bg={`${Colors.accent}20`}>
                  {periodEnd ? `Premium até ${periodEnd}` : 'Premium'}
                </Badge>
              ) : (
                <Badge color={Colors.textMuted} bg={`${Colors.textMuted}20`}>Plano Grátis</Badge>
              )}
            </View>
          ) : null}
        </GradientCard>

        <View style={styles.section}>
          <SectionHeader
            title="Carteira"
            subtitle="Gestão de banca"
            action={{ label: 'Ver banca ›', onPress: () => router.push('/banca') }}
          />
          <WalletCard config={banca} />
        </View>

        <View style={styles.section}>
          <AppText variant="label" style={styles.sectionLabel}>CONTA</AppText>
          <View style={styles.menu}>
            <MenuRow icon="trophy" label="Minha Assinatura" onPress={() => router.push('/planos')} right={
              isPremium ? <Badge color={Colors.accent} bg={`${Colors.accent}20`}>PRO</Badge> : null
            } />
            <MenuRow icon="trending-up" label="Plano de Crescimento" onPress={() => router.push('/plano-crescimento')} />
            <MenuRow icon="wallet" label="Gestão de Banca" color={Colors.success} onPress={() => router.push('/banca')} />
          </View>
        </View>

        <View style={styles.section}>
          <AppText variant="label" style={styles.sectionLabel}>PREFERÊNCIAS</AppText>
          <View style={styles.menu}>
            <MenuRow icon="notifications" label="Notificações" onPress={() => router.push('/horarios')} />
            <MenuRow icon="alarm" label="Gerenciar Alertas" onPress={() => router.push('/horarios')} />
            <MenuRow icon="shield-checkmark" label="Segurança" onPress={() => Alert.alert('Segurança', 'Funcionalidade em breve.')} />
            <MenuRow icon="settings" label="Preferências" onPress={() => Alert.alert('Preferências', 'Funcionalidade em breve.')} />
          </View>
        </View>

        {user ? (
          <MenuRow icon="log-out" label="Sair" danger onPress={confirmSignOut} />
        ) : (
          <MenuRow icon="log-in" label="Entrar" color={Colors.primary} onPress={() => router.push('/login')} />
        )}

        <AppText variant="small" style={styles.version}>The Magic Trader · v1.0.0</AppText>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: Spacing.xl },
  identity: {
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderColor: Colors.primary,
    borderWidth: 2,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  avatarText: { fontSize: 26, fontWeight: '800', color: Colors.text },
  badgeWrap: { marginTop: Spacing.sm },
  section: { marginBottom: Spacing.lg },
  sectionLabel: {
    color: Colors.textFaint,
    marginBottom: Spacing.sm,
    letterSpacing: 0.5,
  },
  menu: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderBottomColor: Colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  version: { textAlign: 'center', color: Colors.textFaint, marginTop: Spacing.lg },
});
