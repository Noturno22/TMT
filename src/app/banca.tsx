import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppButton, AppText, Badge, Card, Divider, EmptyState, Screen, SectionTitle } from '@/components/ui';
import { GradientCard } from '@/components/GradientCard';
import { PremiumLock } from '@/components/PremiumLock';
import { GrowthPlanSection } from '@/components/GrowthPlanSection';
import { formatMoney, formatShortDate } from '@/core/format';
import { Colors, Radius, Spacing } from '@/core/theme';
import { useBanca } from '@/hooks/useBanca';
import { useSubscription } from '@/hooks/useSubscription';

function StatusPill({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: `${color}18`, borderColor: `${color}40` }]}>
      <View style={[styles.pillDot, { backgroundColor: color }]} />
      <AppText variant="small" style={{ color, fontWeight: '600' }}>{label}</AppText>
    </View>
  );
}

export default function BancaScreen() {
  const { t } = useTranslation();
  const { canAccessBanca } = useSubscription();
  const { config, loading, save } = useBanca();

  if (!canAccessBanca) {
    return (
      <Screen>
        <PremiumLock
          label={t('capital.lockTitle')}
          description={t('capital.lockDesc')}
        />
      </Screen>
    );
  }

  if (loading) return <Screen><AppText variant="muted">{t('capital.loading')}</AppText></Screen>;

  const capital = config.capital;
  const current = config.achieved;
  const profit = current - capital;
  const profitPct = capital > 0 ? (profit / capital) * 100 : 0;
  const isProfit = profit >= 0;
  const targetPct = config.metaPercent;
  const targetValue = capital * (targetPct / 100);
  const progressPct = targetValue > 0 ? Math.min(100, Math.max(0, (profit / targetValue) * 100)) : 0;

  return (
    <Screen>
      <SectionTitle>{t('capital.title')}</SectionTitle>
      <AppText variant="muted" style={{ marginBottom: Spacing.md }}>
        {t('capital.subtitle')}
      </AppText>

      <GradientCard
        colors={[Colors.primaryDim, 'rgba(22,164,58,0.15)']}
        style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={{ flex: 1 }}>
            <AppText variant="small" style={styles.heroEyebrow}>{t('capital.currentBalance')}</AppText>
          </View>
          <StatusPill label={t('capital.active')} color={Colors.success} />
        </View>
        <AppText variant="mono" style={[styles.heroValue, { color: isProfit ? Colors.text : Colors.destructive }]}>
          ${formatMoney(current)}
        </AppText>
        <View style={styles.heroFooter}>
          <AppText variant="small" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {t('capital.deposited')}${formatMoney(capital)}
          </AppText>
          <AppText variant="small" style={{ color: isProfit ? '#34C759' : '#FF453A' }}>
            {isProfit ? '+' : ''}{formatMoney(profit)} USD ({profitPct > 0 ? '+' : ''}{profitPct.toFixed(1)}%)
          </AppText>
        </View>
      </GradientCard>

      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Ionicons name="trending-up" size={18} color={Colors.success} />
          <AppText variant="small" style={{ color: Colors.textMuted }}>{t('capital.profit')}</AppText>
          <AppText variant="label" style={{ color: Colors.success }}>+{formatMoney(profit)} USD</AppText>
        </Card>
        <Card style={styles.statCard}>
          <Ionicons name="flag" size={18} color={Colors.accent} />
          <AppText variant="small" style={{ color: Colors.textMuted }}>{t('capital.target')}</AppText>
          <AppText variant="label" style={{ color: Colors.accent }}>+{targetPct}%</AppText>
        </Card>
        <Card style={styles.statCard}>
          <Ionicons name="cash" size={18} color={Colors.warning} />
          <AppText variant="small" style={{ color: Colors.textMuted }}>{t('capital.withdrawn')}</AppText>
          <AppText variant="label" style={{ color: Colors.warning }}>${formatMoney(config.totalWithdrawn)}</AppText>
        </Card>
      </View>

      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <AppText variant="label">{t('capital.progressTitle')}</AppText>
          <AppText variant="small" style={{ color: Colors.textMuted }}>{Math.round(progressPct)}%</AppText>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progressPct}%` }]} />
        </View>
        <View style={styles.progressLabels}>
          <AppText variant="small" style={{ color: Colors.textMuted }}>
            +{formatMoney(profit)} USD
          </AppText>
          <AppText variant="small" style={{ color: Colors.accent }}>
            Meta: +{formatMoney(targetValue)} USD
          </AppText>
        </View>
      </Card>

      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <AppText variant="label">{t('capital.planTitle')}</AppText>
          <Badge color={Colors.accent} bg={`${Colors.accent}20`}>{config.metaMonths}</Badge>
        </View>
        <View style={styles.planInfo}>
          <View style={styles.planRow}>
            <AppText variant="small" style={{ color: Colors.textMuted }}>{t('capital.returnTarget')}</AppText>
            <AppText variant="label" style={{ color: Colors.accent }}>+{targetPct}%</AppText>
          </View>
          <View style={styles.planRow}>
            <AppText variant="small" style={{ color: Colors.textMuted }}>{t('capital.period')}</AppText>
            <AppText variant="label">{config.metaMonths}</AppText>
          </View>
          <View style={styles.planRow}>
            <AppText variant="small" style={{ color: Colors.textMuted }}>{t('capital.minDeposit')}</AppText>
            <AppText variant="label">$50 USD</AppText>
          </View>
        </View>
      </Card>

      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <AppText variant="label">{t('capital.withdrawalTitle')}</AppText>
          <Badge color={Colors.success} bg={`${Colors.success}20`}>{t('capital.weekly')}</Badge>
        </View>
        <AppText variant="muted" style={{ marginBottom: Spacing.sm }}>
          {t('capital.withdrawalDesc')}
        </AppText>
        <AppButton
          title={t('capital.requestWithdrawal')}
          variant="secondary"
          icon={<Ionicons name="cash-outline" size={18} color={Colors.accent} />}
          onPress={() => Alert.alert(t('capital.withdrawalRequest'), t('capital.withdrawalMsg'))}
        />
      </Card>

      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <AppText variant="label">{t('capital.howItWorks')}</AppText>
        </View>
        {[
          { icon: 'wallet', color: Colors.success, title: t('capital.step1Title'), desc: t('capital.step1Desc') },
          { icon: 'trending-up', color: Colors.accent, title: t('capital.step2Title'), desc: t('capital.step2Desc') },
          { icon: 'cash', color: Colors.warning, title: t('capital.step3Title'), desc: t('capital.step3Desc') },
        ].map((step, i) => (
          <View key={i}>
            {i > 0 ? <Divider style={{ marginVertical: Spacing.sm }} /> : null}
            <View style={styles.stepRow}>
              <View style={[styles.stepIcon, { backgroundColor: `${step.color}18` }]}>
                <Ionicons name={step.icon as any} size={18} color={step.color} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="label">{step.title}</AppText>
                <AppText variant="small" style={{ color: Colors.textMuted }}>{step.desc}</AppText>
              </View>
            </View>
          </View>
        ))}
      </Card>

      <GrowthPlanSection capital={config.capital} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: Spacing.sm, marginBottom: Spacing.md },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroEyebrow: { color: 'rgba(255,255,255,0.7)', fontWeight: '700', letterSpacing: 1 },
  heroValue: { fontSize: 36, lineHeight: 46, color: Colors.text, letterSpacing: 0.5 },
  heroFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1,
  },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  statCard: { flex: 1, alignItems: 'center', gap: Spacing.xs, paddingVertical: Spacing.md },
  card: { marginBottom: Spacing.md, gap: Spacing.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  track: {
    height: 8, borderRadius: 4, backgroundColor: Colors.surfaceElevated,
    overflow: 'hidden', marginTop: Spacing.xs,
  },
  fill: { height: '100%', borderRadius: 4, backgroundColor: Colors.accent },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  planInfo: { gap: Spacing.sm },
  planRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  stepIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  divider: { marginTop: Spacing.sm, marginBottom: Spacing.lg },
});
