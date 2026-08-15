import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppText, AppButton, Badge, Screen } from '@/components/ui';
import { GradientCard } from '@/components/GradientCard';
import { PlanCard } from '@/components/PlanCard';
import { Colors, Spacing } from '@/core/theme';
import { useSubscription } from '@/hooks/useSubscription';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

type Currency = 'usd' | 'aoa';
type PlanId = 'free' | 'basic' | 'pro' | 'premium';

type PlanKey =
  | 'planos.featureFree.0'
  | 'planos.featureFree.1'
  | 'planos.featureFree.2'
  | 'planos.featureFree.3'
  | 'planos.featureFree.4'
  | 'planos.featureFree.5'
  | 'planos.featureFree.6'
  | 'planos.featureBasic.0'
  | 'planos.featureBasic.1'
  | 'planos.featureBasic.2'
  | 'planos.featureBasic.3'
  | 'planos.featureBasic.4'
  | 'planos.featureBasic.5'
  | 'planos.featureBasic.6'
  | 'planos.featurePro.0'
  | 'planos.featurePro.1'
  | 'planos.featurePro.2'
  | 'planos.featurePro.3'
  | 'planos.featurePro.4'
  | 'planos.featurePro.5'
  | 'planos.featurePro.6'
  | 'planos.featurePro.7'
  | 'planos.featurePremium.0'
  | 'planos.featurePremium.1'
  | 'planos.featurePremium.2'
  | 'planos.featurePremium.3'
  | 'planos.featurePremium.4'
  | 'planos.featurePremium.5'
  | 'planos.featurePremium.6'
  | 'planos.trustSecure'
  | 'planos.trustCancel'
  | 'planos.trustSupport'
  | 'planos.alertsWhatsapp'
  | 'planos.alertsWhatsappDesc'
  | 'planos.alertsTelegram'
  | 'planos.alertsTelegramDesc'
  | 'planos.alertsEmail'
  | 'planos.alertsEmailDesc';

interface PlanFeature {
  text: PlanKey;
  included: boolean;
}

const planLabel = (plan: Exclude<PlanId, 'free'>): string =>
  plan === 'basic' ? 'Basic' : plan === 'pro' ? 'Pro' : 'Premium';

const WA_GREEN = '#25D366';

const BINANCE_ID = '547723572';
const RODOTPAY_UID = '1927969477';
const EXPRESS_PHONE = '+244926717730';

type PaymentMethod = 'binance' | 'rodotpay' | 'express';

const PAYMENT_METHODS: {
  id: PaymentMethod;
  label: string;
  icon: string; // Ionicons name
  color: string;
  usd: boolean;
  aoa: boolean;
  getDetails: (t: TFunction) => string;
}[] = [
  {
    id: 'binance',
    label: 'Binance Pay',
    icon: 'logo-bitcoin',
    color: '#F0B90B',
    usd: true,
    aoa: false,
    getDetails: (t) => t('planos.uid', { value: BINANCE_ID }),
  },
  {
    id: 'rodotpay',
    label: 'Rodotpay',
    icon: 'card',
    color: '#6366F1',
    usd: true,
    aoa: true,
    getDetails: (t) => t('planos.uid', { value: RODOTPAY_UID }),
  },
  {
    id: 'express',
    label: 'Express',
    icon: 'cash',
    color: '#00C853',
    usd: false,
    aoa: true,
    getDetails: (t) => t('planos.phone', { value: EXPRESS_PHONE }),
  },
];

const PLANS: {
  id: Exclude<PlanId, 'free'>;
  icon: 'flash' | 'rocket' | 'trophy';
  highlight?: boolean;
  featured?: boolean;
}[] = [
  { id: 'basic', icon: 'flash' },
  { id: 'pro', icon: 'rocket', highlight: true },
  { id: 'premium', icon: 'trophy', featured: true },
];

const PRICES: Record<Currency, Record<PlanId, string>> = {
  usd: { free: '$0', basic: '$14.99', pro: '$29.99', premium: '$49.99' },
  aoa: { free: '0 Kz', basic: '10.000 Kz', pro: '20.000 Kz', premium: '35.000 Kz' },
};

const FREE_FEATURES: PlanFeature[] = [
  { text: 'planos.featureFree.0', included: true },
  { text: 'planos.featureFree.1', included: true },
  { text: 'planos.featureFree.2', included: true },
  { text: 'planos.featureFree.3', included: true },
  { text: 'planos.featureFree.4', included: true },
  { text: 'planos.featureFree.5', included: false },
  { text: 'planos.featureFree.6', included: false },
];

const BASIC_FEATURES: PlanFeature[] = [
  { text: 'planos.featureBasic.0', included: true },
  { text: 'planos.featureBasic.1', included: true },
  { text: 'planos.featureBasic.2', included: true },
  { text: 'planos.featureBasic.3', included: true },
  { text: 'planos.featureBasic.4', included: true },
  { text: 'planos.featureBasic.5', included: true },
  { text: 'planos.featureBasic.6', included: false },
];

const PRO_FEATURES: PlanFeature[] = [
  { text: 'planos.featurePro.0', included: true },
  { text: 'planos.featurePro.1', included: true },
  { text: 'planos.featurePro.2', included: true },
  { text: 'planos.featurePro.3', included: true },
  { text: 'planos.featurePro.4', included: true },
  { text: 'planos.featurePro.5', included: true },
  { text: 'planos.featurePro.6', included: true },
  { text: 'planos.featurePro.7', included: false },
];

const PREMIUM_FEATURES: PlanFeature[] = [
  { text: 'planos.featurePremium.0', included: true },
  { text: 'planos.featurePremium.1', included: true },
  { text: 'planos.featurePremium.2', included: true },
  { text: 'planos.featurePremium.3', included: true },
  { text: 'planos.featurePremium.4', included: true },
  { text: 'planos.featurePremium.5', included: true },
  { text: 'planos.featurePremium.6', included: true },
];

const TRUST: { icon: keyof typeof Ionicons.glyphMap; label: PlanKey }[] = [
  { icon: 'shield-checkmark', label: 'planos.trustSecure' },
  { icon: 'lock-closed', label: 'planos.trustCancel' },
  { icon: 'headset', label: 'planos.trustSupport' },
];

const ALERTS: { icon: keyof typeof Ionicons.glyphMap; color: string; title: PlanKey; desc: PlanKey }[] = [
  { icon: 'logo-whatsapp', color: WA_GREEN, title: 'planos.alertsWhatsapp', desc: 'planos.alertsWhatsappDesc' },
  { icon: 'paper-plane', color: Colors.secondary, title: 'planos.alertsTelegram', desc: 'planos.alertsTelegramDesc' },
  { icon: 'mail', color: Colors.accent, title: 'planos.alertsEmail', desc: 'planos.alertsEmailDesc' },
];

export default function PlanosScreen() {
  const { t } = useTranslation();
  const tr = (key: PlanKey): string => t(key as never);
  const router = useRouter();
  const { user, isPremium, subscription, loading } = useSubscription();
  const [currency, setCurrency] = useState<Currency>('usd');
  const [checkingOut, setCheckingOut] = useState<PlanId | null>(null);
  const [paymentModal, setPaymentModal] = useState<{ plan: Exclude<PlanId, 'free'>; currency: Currency; method?: PaymentMethod } | null>(null);

  const planName = subscription?.plan?.toLowerCase() ?? '';
  const activePlan: PlanId = isPremium
    ? planName === 'basic' || planName === 'pro'
      ? planName
      : 'premium'
    : 'free';

  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString('pt-PT')
    : null;

  const handlePlanPress = (plan: Exclude<PlanId, 'free'>) => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (isPremium && activePlan === plan) return;
    setCheckingOut(plan);
    setPaymentModal({ plan, currency });
  };

  const handleMethodSelect = (method: PaymentMethod) => {
    setPaymentModal((prev) => (prev ? { ...prev, method } : null));
  };

  const getAvailableMethods = (curr: Currency): typeof PAYMENT_METHODS => {
    return PAYMENT_METHODS.filter((m) => (curr === 'usd' ? m.usd : m.aoa));
  };

  const handlePaymentConfirmed = () => {
    setPaymentModal(null);
    setCheckingOut(null);
    Alert.alert(t('planos.receiptOk'), t('planos.receiptMsg'), [{ text: 'OK' }]);
  };

  const planButton = (plan: Exclude<PlanId, 'free'>) => {
    if (isPremium && activePlan === plan) {
      return { title: t('planos.planActive'), variant: 'primary' as const, disabled: true as const };
    }
    if (isPremium) {
      return { title: t('planos.switchTo', { plan: planLabel(plan) }), variant: 'secondary' as const };
    }
    return {
      title: user
        ? t('planos.subscribe', { plan: planLabel(plan) })
        : t('planos.createAndSubscribe', { plan: planLabel(plan) }),
      variant: plan === 'pro' ? ('gold' as const) : ('secondary' as const),
    };
  };

  return (
    <Screen>
      <GradientCard
        colors={[`${Colors.accent}1C`, `${Colors.primary}10`]}
        style={styles.hero}>
        <View style={styles.heroGlowOne} pointerEvents="none" />
        <View style={styles.heroGlowTwo} pointerEvents="none" />
        <View style={styles.heroIcon}>
          <Ionicons name="sparkles" size={22} color={Colors.accent} />
        </View>
        <AppText variant="title" style={styles.heroTitle}>{t('planos.heroTitle')}</AppText>
        <AppText variant="muted">
          {t('planos.heroSubtitle')}
        </AppText>
        {isPremium ? (
          <Badge color={Colors.accent} bg={`${Colors.accent}20`}>
            {periodEnd ? t('planos.premiumUntil', { date: periodEnd }) : t('planos.premiumActive')}
          </Badge>
        ) : (
          <Badge color={Colors.textMuted} bg={`${Colors.textMuted}20`}>
            {t('planos.currentFree')}
          </Badge>
        )}
      </GradientCard>

      <View style={styles.segment}>
        {(['usd', 'aoa'] as const).map((c) => {
          const active = currency === c;
          return (
            <Pressable key={c} onPress={() => setCurrency(c)} style={styles.segmentBtn}>
              {active ? <View style={styles.segmentPill} /> : null}
              <AppText variant="small" style={{ color: active ? Colors.bg : Colors.textMuted, fontWeight: '700' }}>
                {c === 'usd' ? t('planos.usd') : t('planos.aoa')}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {PLANS.map(({ id, icon, highlight, featured }) => (
        <PlanCard
          key={id}
          name={planLabel(id)}
          tagline={
            id === 'basic' ? t('planos.taglineBasic') : id === 'pro' ? t('planos.taglinePro') : t('planos.taglinePremium')
          }
          icon={icon}
          price={PRICES[currency][id]}
          highlight={highlight}
          featured={featured}
          badge={id === 'pro' ? t('planos.mostPopular') : id === 'premium' ? t('planos.featured') : undefined}
          active={activePlan === id}
          features={(id === 'basic' ? BASIC_FEATURES : id === 'pro' ? PRO_FEATURES : PREMIUM_FEATURES).map((f) => ({
            ...f,
            text: tr(f.text),
          }))}
          buttonTitle={planButton(id).title}
          buttonVariant={planButton(id).variant}
          loading={checkingOut === id || loading}
          onPress={() => handlePlanPress(id)}
        />
      ))}

      <PlanCard
        name={t('planos.free')}
        tagline={t('planos.freeTagline')}
        icon="accessibility-outline"
        price={PRICES[currency].free}
        active={activePlan === 'free'}
        dashed
        features={FREE_FEATURES.map((f) => ({ ...f, text: tr(f.text) }))}
        buttonTitle={t('planos.currentPlan')}
        buttonVariant="outline"
        disabled
      />

      <View style={styles.trustRow}>
        {TRUST.map((item) => (
          <View key={item.label} style={styles.trustItem}>
            <View style={styles.trustIcon}>
              <Ionicons name={item.icon} size={16} color={Colors.success} />
            </View>
            <AppText variant="small" style={{ color: Colors.textMuted, textAlign: 'center' }}>{tr(item.label)}</AppText>
          </View>
        ))}
      </View>

      <View style={styles.alerts}>
        <AppText variant="h2" style={styles.sectionTitle}>{t('planos.premiumAlerts')}</AppText>
        <View style={styles.alertRow}>
          {ALERTS.map((a) => (
            <View key={a.title} style={styles.alertCard}>
              <View style={[styles.alertIcon, { backgroundColor: `${a.color}14`, borderColor: `${a.color}40` }]}>
                <Ionicons name={a.icon} size={20} color={a.color} />
              </View>
              <AppText variant="label">{tr(a.title)}</AppText>
              <AppText variant="small" style={{ color: Colors.textMuted, textAlign: 'center' }}>{tr(a.desc)}</AppText>
            </View>
          ))}
        </View>
      </View>

      {paymentModal && (
        <PaymentModal
          plan={paymentModal.plan}
          currency={paymentModal.currency}
          price={PRICES[paymentModal.currency][paymentModal.plan]}
          onClose={() => setPaymentModal(null)}
          onConfirm={handlePaymentConfirmed}
          method={paymentModal.method}
          onMethodSelect={(m) => setPaymentModal((p) => (p ? { ...p, method: m || undefined } : null))}
          availableMethods={getAvailableMethods(paymentModal.currency)}
        />
      )}
    </Screen>
  );
}
function PaymentModal({
  plan,
  currency,
  price,
  onClose,
  onConfirm,
  method,
  onMethodSelect,
  availableMethods,
}: {
  plan: Exclude<PlanId, 'free'>;
  currency: Currency;
  price: string;
  onClose: () => void;
  onConfirm: () => void;
  method?: PaymentMethod;
  onMethodSelect: (method: PaymentMethod) => void;
  availableMethods: typeof PAYMENT_METHODS;
}) {
  const { t } = useTranslation();
  const selectedMethod = method ? availableMethods.find((m) => m.id === method) : null;

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <AppText variant="h2">{t('planos.paymentTitle', { plan: planLabel(plan) })}</AppText>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={Colors.textMuted} />
          </Pressable>
        </View>

        <View style={styles.modalBody}>
          <AppText variant="label" style={styles.modalLabel}>{t('planos.paymentAmount', { amount: price })}</AppText>

          {!method ? (
            <>
              <AppText variant="label" style={styles.modalLabel}>{t('planos.chooseMethod')}</AppText>
              <View style={styles.methodGrid}>
                {availableMethods.map((m) => (
                  <Pressable
                    key={m.id}
                    onPress={() => onMethodSelect(m.id)}
                    style={[
                      styles.methodCard,
                      {
                        borderColor: m.color,
                        borderWidth: 2,
                      },
                    ]}>
                    <View style={[styles.methodIcon, { backgroundColor: `${m.color}1A` }]}>
                      <Ionicons name={m.icon as keyof typeof Ionicons.glyphMap} size={28} color={m.color} />
                    </View>
                    <AppText variant="label" style={{ color: m.color, fontWeight: '800' }}>
                      {m.label}
                    </AppText>
                  </Pressable>
                ))}
              </View>
            </>
          ) : (
            <>
              <View style={styles.selectedMethod}>
                <View style={[styles.selectedMethodIcon, { backgroundColor: `${selectedMethod?.color}1A` }]}>
                  <Ionicons
                    name={selectedMethod?.icon as keyof typeof Ionicons.glyphMap}
                    size={24}
                    color={selectedMethod?.color}
                  />
                </View>
                <View style={styles.selectedMethodInfo}>
                  <AppText variant="label" style={{ color: selectedMethod?.color, fontWeight: '800' }}>
                    {selectedMethod?.label}
                  </AppText>
                  <AppText variant="small" style={{ color: Colors.textMuted }}>
                    {selectedMethod?.getDetails(t)}
                  </AppText>
                </View>
                <Pressable onPress={() => onMethodSelect(undefined as any)} style={styles.changeMethodBtn}>
                  <AppText variant="small" style={{ color: Colors.primary }}>{t('planos.change')}</AppText>
                </Pressable>
              </View>

              <View style={styles.detailsBox}>
                <AppText style={styles.detailsText}>
                  {t('planos.payInstructions')}
                </AppText>
              </View>
              <AppText variant="small" style={styles.instructions}>
                {t('planos.afterPayment')}
              </AppText>
            </>
          )}
        </View>

        <View style={styles.modalActions}>
          <AppButton title={t('planos.cancel')} variant="ghost" onPress={onClose} />
          {method ? (
            <AppButton title={t('planos.receiptSent')} variant="primary" onPress={onConfirm} />
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    padding: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  heroGlowOne: {
    position: 'absolute',
    top: -90,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: `${Colors.accent}14`,
  },
  heroGlowTwo: {
    position: 'absolute',
    bottom: -80,
    left: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: `${Colors.primary}10`,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: `${Colors.accent}55`,
    backgroundColor: `${Colors.accent}1F`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  heroTitle: { fontSize: 26, letterSpacing: -0.3 },
  segment: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 999,
    padding: 4,
    marginBottom: Spacing.lg,
  },
  segmentBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 999,
  },
  segmentPill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.accent,
    borderRadius: 999,
    shadowColor: Colors.accent,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  trustRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  trustItem: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  trustIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${Colors.success}14`,
    borderColor: `${Colors.success}40`,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alerts: { marginTop: Spacing.xs },
  sectionTitle: { textAlign: 'center', marginBottom: Spacing.md },
  alertRow: { flexDirection: 'row', gap: Spacing.sm },
  alertCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  alertIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: Spacing.md,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: Spacing.lg,
    gap: Spacing.md,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    paddingBottom: Spacing.md,
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  modalBody: {
    gap: Spacing.sm,
  },
  modalLabel: {
    color: Colors.textMuted,
  },
  detailsBox: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  detailsText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.accent,
    textAlign: 'center',
  },
  instructions: {
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  methodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  methodCard: {
    flex: 1,
    minWidth: 100,
    maxWidth: 120,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    padding: Spacing.md,
  },
  methodIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selectedMethodIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedMethodInfo: { flex: 1, gap: 2 },
  changeMethodBtn: { padding: Spacing.xs },
});
