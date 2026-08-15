import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppText, AppButton, Badge, Screen } from '@/components/ui';
import { GradientCard } from '@/components/GradientCard';
import { PlanCard } from '@/components/PlanCard';
import { Colors, Spacing } from '@/core/theme';
import { useSubscription } from '@/hooks/useSubscription';

type Currency = 'usd' | 'aoa';
type PlanId = 'free' | 'basic' | 'pro' | 'premium';

interface PlanFeature {
  text: string;
  included: boolean;
}

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
  getDetails: () => string;
}[] = [
  {
    id: 'binance',
    label: 'Binance Pay',
    icon: 'logo-bitcoin',
    color: '#F0B90B',
    usd: true,
    aoa: false,
    getDetails: () => `UID: ${BINANCE_ID}`,
  },
  {
    id: 'rodotpay',
    label: 'Rodotpay',
    icon: 'card',
    color: '#6366F1',
    usd: true,
    aoa: true,
    getDetails: () => `UID: ${RODOTPAY_UID}`,
  },
  {
    id: 'express',
    label: 'Express',
    icon: 'cash',
    color: '#00C853',
    usd: false,
    aoa: true,
    getDetails: () => `Número: ${EXPRESS_PHONE}`,
  },
];

const PLANS: {
  id: Exclude<PlanId, 'free'>;
  icon: 'flash' | 'rocket' | 'trophy';
  tagline: string;
  badge?: string;
  highlight?: boolean;
  featured?: boolean;
}[] = [
  { id: 'basic', icon: 'flash', tagline: 'Para começar a sério' },
  { id: 'pro', icon: 'rocket', tagline: 'Para traders a sério', badge: 'MAIS POPULAR', highlight: true },
  { id: 'premium', icon: 'trophy', tagline: 'Experiência completa', badge: 'TOP', featured: true },
];

const PRICES: Record<Currency, Record<PlanId, string>> = {
  usd: { free: '$0', basic: '$14.99', pro: '$29.99', premium: '$49.99' },
  aoa: { free: '0 Kz', basic: '10.000 Kz', pro: '20.000 Kz', premium: '35.000 Kz' },
};

const PAYMENT_INFO: Record<Currency, { method: string; details: string; instructions: string }> = {
  usd: {
    method: 'Binance Pay',
    details: `Binance ID: ${BINANCE_ID}`,
    instructions: 'Pague via Binance Pay para o ID acima e envie o comprovante para ativação.',
  },
  aoa: {
    method: 'Express',
    details: `Número: ${EXPRESS_PHONE}`,
    instructions: 'Pague via Express para o número acima e envie o comprovante para verificação.',
  },
};

const FREE_FEATURES: PlanFeature[] = [
  { text: '3 pares Forex (EUR/USD, GBP/USD, USD/JPY)', included: true },
  { text: 'Sinais M15', included: true },
  { text: 'RSI, EMA e MACD básico', included: true },
  { text: 'Histórico de 24h', included: true },
  { text: 'Acesso à comunidade', included: true },
  { text: 'Alertas em tempo real', included: false },
  { text: 'Gestão de banca', included: false },
];

const BASIC_FEATURES: PlanFeature[] = [
  { text: '6 pares Forex', included: true },
  { text: 'Sinais M15 e H1', included: true },
  { text: 'RSI, EMA, MACD, Bollinger', included: true },
  { text: 'Alertas push (2 por dia)', included: true },
  { text: 'Histórico de 7 dias', included: true },
  { text: 'Suporte por email', included: true },
  { text: 'Gestão de banca avançada', included: false },
];

const PRO_FEATURES: PlanFeature[] = [
  { text: 'Todos os pares Forex (10+)', included: true },
  { text: 'Sinais M15, H1 e H4', included: true },
  { text: 'Todos os indicadores técnicos', included: true },
  { text: 'Alertas em tempo real', included: true },
  { text: 'Histórico completo com pips', included: true },
  { text: 'Análises de mercado diárias', included: true },
  { text: 'Suporte prioritário', included: true },
  { text: 'Gestão de banca avançada + análise 1:1', included: false },
];

const PREMIUM_FEATURES: PlanFeature[] = [
  { text: 'Tudo do plano Pro', included: true },
  { text: 'Sinais antecipados (early access)', included: true },
  { text: 'Alertas via WhatsApp e Telegram', included: true },
  { text: 'Sessões ao vivo mensais', included: true },
  { text: 'Gestão de banca avançada', included: true },
  { text: 'Análise personalizada de banca (1:1)', included: true },
  { text: 'Suporte 1:1 dedicado', included: true },
];

const TRUST: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { icon: 'shield-checkmark', label: 'Pagamento seguro' },
  { icon: 'lock-closed', label: 'Cancela quando quiseres' },
  { icon: 'headset', label: 'Suporte dedicado' },
];

const ALERTS: { icon: keyof typeof Ionicons.glyphMap; color: string; title: string; desc: string }[] = [
  { icon: 'logo-whatsapp', color: WA_GREEN, title: 'WhatsApp', desc: 'Notificações instantâneas' },
  { icon: 'paper-plane', color: Colors.secondary, title: 'Telegram', desc: 'Bot dedicado' },
  { icon: 'mail', color: Colors.accent, title: 'Email', desc: 'Resumo diário' },
];

export default function PlanosScreen() {
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
    Alert.alert(
      'Comprovante recebido',
      'Obrigado! O seu comprovante foi enviado para verificação. O plano será ativado após confirmação.',
      [{ text: 'OK' }]
    );
  };

  const planButton = (plan: Exclude<PlanId, 'free'>) => {
    if (isPremium && activePlan === plan) {
      return { title: '✓ Plano Ativo', variant: 'primary' as const, disabled: true as const };
    }
    if (isPremium) {
      return { title: `Mudar para ${plan === 'basic' ? 'Basic' : plan === 'pro' ? 'Pro' : 'Premium'}`, variant: 'secondary' as const };
    }
    return {
      title: user ? `Assinar ${plan === 'basic' ? 'Basic' : plan === 'pro' ? 'Pro' : 'Premium'}` : 'Criar conta e assinar',
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
        <AppText variant="title" style={styles.heroTitle}>Escolhe o teu plano</AppText>
        <AppText variant="muted">
          Começa grátis ou desbloqueia todo o potencial do The Magic Trader.
        </AppText>
        {isPremium ? (
          <Badge color={Colors.accent} bg={`${Colors.accent}20`}>
            {periodEnd ? `Premium ativo até ${periodEnd}` : 'Premium ativo'}
          </Badge>
        ) : (
          <Badge color={Colors.textMuted} bg={`${Colors.textMuted}20`}>
            Plano atual: Grátis
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
                {c === 'usd' ? 'USD ($)' : 'AOA (Kz)'}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {PLANS.map(({ id, icon, badge, highlight, featured }) => (
        <PlanCard
          key={id}
          name={id === 'basic' ? 'Basic' : id === 'pro' ? 'Pro' : 'Premium'}
          tagline={
            id === 'basic' ? 'Para quem está a começar' : id === 'pro' ? 'Para traders a sério' : 'Experiência completa'
          }
          icon={icon}
          price={PRICES[currency][id]}
          highlight={highlight}
          featured={featured}
          badge={badge}
          active={activePlan === id}
          features={(id === 'basic' ? BASIC_FEATURES : id === 'pro' ? PRO_FEATURES : PREMIUM_FEATURES)}
          buttonTitle={planButton(id).title}
          buttonVariant={planButton(id).variant}
          loading={checkingOut === id || loading}
          onPress={() => handlePlanPress(id)}
        />
      ))}

      <PlanCard
        name="Gratuito"
        tagline="Para experimentar"
        icon="accessibility-outline"
        price={PRICES[currency].free}
        active={activePlan === 'free'}
        dashed
        features={FREE_FEATURES}
        buttonTitle="Plano Atual"
        buttonVariant="outline"
        disabled
      />

      <View style={styles.trustRow}>
        {TRUST.map((t) => (
          <View key={t.label} style={styles.trustItem}>
            <View style={styles.trustIcon}>
              <Ionicons name={t.icon} size={16} color={Colors.success} />
            </View>
            <AppText variant="small" style={{ color: Colors.textMuted, textAlign: 'center' }}>{t.label}</AppText>
          </View>
        ))}
      </View>

      <View style={styles.alerts}>
        <AppText variant="h2" style={styles.sectionTitle}>Alertas Premium</AppText>
        <View style={styles.alertRow}>
          {ALERTS.map((a) => (
            <View key={a.title} style={styles.alertCard}>
              <View style={[styles.alertIcon, { backgroundColor: `${a.color}14`, borderColor: `${a.color}40` }]}>
                <Ionicons name={a.icon} size={20} color={a.color} />
              </View>
              <AppText variant="label">{a.title}</AppText>
              <AppText variant="small" style={{ color: Colors.textMuted, textAlign: 'center' }}>{a.desc}</AppText>
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
  const planName = plan === 'basic' ? 'Basic' : plan === 'pro' ? 'Pro' : 'Premium';
  const selectedMethod = method ? availableMethods.find((m) => m.id === method) : null;

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <AppText variant="h2">Pagamento: {planName}</AppText>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={Colors.textMuted} />
          </Pressable>
        </View>

        <View style={styles.modalBody}>
          <AppText variant="label" style={styles.modalLabel}>Valor: {price}/mês</AppText>

          {!method ? (
            <>
              <AppText variant="label" style={styles.modalLabel}>Escolha o método:</AppText>
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
                    {selectedMethod?.getDetails()}
                  </AppText>
                </View>
                <Pressable onPress={() => onMethodSelect(undefined as any)} style={styles.changeMethodBtn}>
                  <AppText variant="small" style={{ color: Colors.primary }}>Alterar</AppText>
                </Pressable>
              </View>

              <View style={styles.detailsBox}>
                <AppText style={styles.detailsText}>
                  Pague para o {selectedMethod?.id === 'express' ? 'número' : 'UID'} acima
                </AppText>
              </View>
              <AppText variant="small" style={styles.instructions}>
                Após o pagamento, envie o comprovante para ativação.
              </AppText>
            </>
          )}
        </View>

        <View style={styles.modalActions}>
          <AppButton title="Cancelar" variant="ghost" onPress={onClose} />
          {method ? (
            <AppButton title="Já enviei o comprovativo" variant="primary" onPress={onConfirm} />
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
