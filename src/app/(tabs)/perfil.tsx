import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Badge, Screen } from '@/components/ui';
import { GradientCard } from '@/components/GradientCard';
import { PremiumLock } from '@/components/PremiumLock';
import { SectionHeader } from '@/components/SectionHeader';
import { WalletCard } from '@/components/WalletCard';
import { avatarLetter, contactInfo, displayName } from '@/core/format';
import { Colors, Spacing } from '@/core/theme';
import { useAuth } from '@/hooks/useAuth';
import { useBanca } from '@/hooks/useBanca';
import { useSubscription } from '@/hooks/useSubscription';
import { useTranslation } from 'react-i18next';
import { i18n } from '@/lib/i18n';

const BINANCE_ID = '547723572';
const EXPRESS_PHONE = '+244926717730';

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
  const { t } = useTranslation();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { isPremium, canAccessBanca, subscription } = useSubscription();
  const { config: banca } = useBanca();

  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString(i18n.language)
    : null;

  const confirmSignOut = () => {
    Alert.alert(t('perfil.signOutTitle'), t('perfil.signOutBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('perfil.signOut'), style: 'destructive', onPress: () => signOut() },
    ]);
  };

  return (
    <Screen scroll={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <GradientCard
          colors={[Colors.primaryDim, 'rgba(255,201,21,0.07)']}
          style={styles.identity}>
          <View style={styles.avatar}>
            <AppText style={styles.avatarText}>{user ? avatarLetter(user) : t('perfil.fallbackAvatar')}</AppText>
          </View>
          <AppText variant="h1">{user ? displayName(user) : t('perfil.trader')}</AppText>
          <AppText variant="muted">{user ? (contactInfo(user) ?? t('perfil.verified')) : t('perfil.notAuthed')}</AppText>
          {user ? (
            <View style={styles.badgeWrap}>
              {isPremium ? (
                <Badge color={Colors.accent} bg={`${Colors.accent}20`}>
                  {periodEnd ? t('perfil.premiumUntil', { date: periodEnd }) : t('perfil.premium')}
                </Badge>
              ) : (
                <Badge color={Colors.textMuted} bg={`${Colors.textMuted}20`}>{t('perfil.freePlan')}</Badge>
              )}
            </View>
          ) : null}
        </GradientCard>

        <View style={styles.section}>
          <SectionHeader
            title={t('perfil.walletSection')}
            subtitle={canAccessBanca ? t('perfil.bancaManagement') : t('perfil.availablePremium')}
            action={
              canAccessBanca ? { label: t('perfil.viewBanca'), onPress: () => router.push('/banca') } : undefined
            }
          />
          {canAccessBanca ? (
            <WalletCard config={banca} />
          ) : (
            <PremiumLock
              compact
              label={t('perfil.walletLockTitle')}
              description={t('perfil.walletLockDesc')}
            />
          )}
        </View>

        <View style={styles.section}>
          <AppText variant="label" style={styles.sectionLabel}>{t('perfil.sectionAccount')}</AppText>
          <View style={styles.menu}>
            <MenuRow icon="trophy" label={t('perfil.mySubscription')} onPress={() => router.push('/planos')} right={
              isPremium ? <Badge color={Colors.accent} bg={`${Colors.accent}20`}>{t('components.dashboardHeader.pro')}</Badge> : null
            } />
            <MenuRow icon="trending-up" label={t('perfil.growthPlan')} onPress={() => router.push('/plano-crescimento')} />
            <MenuRow icon="wallet" label={t('perfil.banca')} color={Colors.success} onPress={() => router.push('/banca')} />
          </View>
        </View>

        <View style={styles.section}>
          <AppText variant="label" style={styles.sectionLabel}>{t('perfil.sectionPreferences')}</AppText>
          <View style={styles.menu}>
            <MenuRow icon="notifications" label={t('perfil.notifications')} onPress={() => router.push('/notificacoes')} />
            <MenuRow icon="alarm" label={t('perfil.manageAlerts')} onPress={() => router.push('/horarios')} />
            <MenuRow icon="shield-checkmark" label={t('perfil.security')} onPress={() => Alert.alert(t('perfil.security'), t('common.comingSoon'))} />
            <MenuRow icon="globe" label={t('language.title')} onPress={() => router.push('/idioma')} />
          </View>
        </View>

        <View style={styles.section}>
          <AppText variant="label" style={styles.sectionLabel}>{t('perfil.sectionWithdraw')}</AppText>
          <View style={styles.menu}>
            <Pressable style={styles.paymentRow}>
              <View style={[styles.paymentIcon, { backgroundColor: '#F0B90B1A' }]}>
                <Ionicons name="logo-bitcoin" size={20} color="#F0B90B" />
              </View>
              <View style={styles.paymentInfo}>
                <AppText style={styles.paymentLabel}>{t('perfil.binance')}</AppText>
                <AppText variant="small" style={styles.paymentDetail}>ID: {BINANCE_ID}</AppText>
              </View>
              <Ionicons name="copy" size={20} color={Colors.textFaint} />
            </Pressable>
            <Pressable style={[styles.paymentRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border }]}>
              <View style={[styles.paymentIcon, { backgroundColor: '#00C8531A' }]}>
                <Ionicons name="cash" size={20} color="#00C853" />
              </View>
              <View style={styles.paymentInfo}>
                <AppText style={styles.paymentLabel}>{t('perfil.express')}</AppText>
                <AppText variant="small" style={styles.paymentDetail}>{EXPRESS_PHONE}</AppText>
              </View>
              <Ionicons name="copy" size={20} color={Colors.textFaint} />
            </Pressable>
          </View>
        </View>

        {user ? (
          <MenuRow icon="log-out" label={t('perfil.signOut')} danger onPress={confirmSignOut} />
        ) : (
          <MenuRow icon="log-in" label={t('perfil.signIn')} color={Colors.primary} onPress={() => router.push('/login')} />
        )}

        <AppText variant="small" style={styles.version}>{t('perfil.version')}</AppText>
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
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentInfo: {
    flex: 1,
    gap: 2,
  },
  paymentLabel: {
    fontWeight: '600',
    color: Colors.text,
  },
  paymentDetail: {
    color: Colors.textMuted,
  },
  version: { textAlign: 'center', color: Colors.textFaint, marginTop: Spacing.lg },
});
