import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { openAuthSessionAsync } from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { AppButton, AppText, Screen, SectionTitle } from '@/components/ui';
import { Colors, Spacing } from '@/core/theme';
import { useSubscription } from '@/hooks/useSubscription';
import { STRIPE_PRICE_USD, STRIPE_PRICE_AOA } from '@/lib/env';

const FREE_FEATURES = [
  { text: '3 pares Forex (EUR/USD, GBP/USD, USD/JPY)', included: true },
  { text: 'Sinais M15 apenas', included: true },
  { text: 'RSI, EMA, MACD básico', included: true },
  { text: 'Sinais H1 e H4', included: false },
  { text: 'Todos os pares Forex', included: false },
  { text: 'Histórico completo', included: false },
  { text: 'Alertas em tempo real', included: false },
];

const PREMIUM_FEATURES = [
  { text: 'Todos os pares Forex', included: true },
  { text: 'Sinais M15, H1 e H4', included: true },
  { text: 'RSI, EMA, MACD, Bollinger, Estocástico', included: true },
  { text: 'Histórico completo com pips', included: true },
  { text: 'Alertas em tempo real', included: true },
  { text: 'Suporte prioritário', included: true },
  { text: 'Acesso antecipado a novas funcionalidades', included: true },
];

export default function PlanosScreen() {
  const router = useRouter();
  const { user, isPremium, loading, checkout } = useSubscription();
  const [currency, setCurrency] = useState<'usd' | 'aoa'>('usd');
  const [checkingOut, setCheckingOut] = useState(false);

  const handleCheckout = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    const priceId = currency === 'usd' ? STRIPE_PRICE_USD : STRIPE_PRICE_AOA;
    if (!priceId) {
      alert('Configuração de pagamento em falta. Contacta o suporte.');
      return;
    }
    setCheckingOut(true);
    const result = await checkout(priceId, currency);
    setCheckingOut(false);
    if (!result.ok) {
      alert(result.error === 'no_session' ? 'Inicia sessão para assinar.' : result.error);
      return;
    }
    await openAuthSessionAsync(result.url as string, null, { preferEphemeralSession: true });
  };

  return (
    <Screen>
      <SectionTitle
        right={
          <View style={{ marginRight: 4 }}>
            <Ionicons name="star" size={22} color={Colors.accent} />
          </View>
        }>
        Planos
      </SectionTitle>
      <AppText variant="muted" style={{ marginBottom: Spacing.md }}>
        Começa grátis ou desbloqueia todo o potencial com o Premium.
      </AppText>

      <View style={styles.currencyRow}>
        {(['usd', 'aoa'] as const).map((c) => (
          <AppButton
            key={c}
            title={c === 'usd' ? 'USD ($)' : 'AOA (Kz)'}
            variant={currency === c ? 'primary' : 'secondary'}
            style={{ flex: 1 }}
            onPress={() => setCurrency(c)}
          />
        ))}
      </View>

      {/* Premium */}
      <View style={[styles.planCard, styles.premiumCard]}>
        <View style={styles.premiumBadge}>
          <View style={styles.premiumBadgeChip}>
            <AppText variant="small" style={{ color: Colors.bg, fontWeight: '700' }}>PREMIUM</AppText>
          </View>
        </View>
        <View style={styles.planHeader}>
          <View style={[styles.planIcon, { backgroundColor: `${Colors.accent}1A` }]}>
            <Ionicons name="trophy" size={20} color={Colors.accent} />
          </View>
          <View>
            <AppText variant="h2">Premium</AppText>
            <AppText variant="small" style={{ color: Colors.textMuted }}>Acesso completo</AppText>
          </View>
        </View>
        <AppText variant="h1" style={{ color: Colors.accent }}>
          {currency === 'usd' ? '$29.99' : '20.000 Kz'} <AppText variant="muted">/mês</AppText>
        </AppText>
        {PREMIUM_FEATURES.map((f, i) => (
          <View key={i} style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
            <AppText variant="small">{f.text}</AppText>
          </View>
        ))}
        {isPremium ? (
          <AppButton title="✓ Plano Ativo" variant="primary" onPress={() => router.back()} />
        ) : (
          <AppButton
            title={user ? 'Assinar Premium' : 'Criar conta e assinar'}
            variant="primary"
            loading={checkingOut || loading}
            onPress={handleCheckout}
          />
        )}
      </View>

      {/* Gratuito */}
      <View style={styles.planCard}>
        <View style={styles.planHeader}>
          <View style={styles.planIcon}>
            <Ionicons name="flash-outline" size={20} color={Colors.textMuted} />
          </View>
          <View>
            <AppText variant="h2">Gratuito</AppText>
            <AppText variant="small" style={{ color: Colors.textMuted }}>Para começar</AppText>
          </View>
        </View>
        <AppText variant="h1">
          $0 <AppText variant="muted">/mês</AppText>
        </AppText>
        {FREE_FEATURES.map((f, i) => (
          <View key={i} style={styles.featureRow}>
            <Ionicons
              name={f.included ? 'checkmark-circle' : 'close-circle'}
              size={16}
              color={f.included ? Colors.success : Colors.textMuted}
            />
            <AppText variant="small" style={[!f.included && { color: Colors.textMuted, textDecorationLine: 'line-through' }]}>
              {f.text}
            </AppText>
          </View>
        ))}
        <AppButton title={user ? 'Plano Atual' : 'Começar Grátis'} variant="secondary" onPress={() => router.back()} />
      </View>

      <View style={styles.alerts}>
        <AppText variant="h2" style={{ textAlign: 'center', marginBottom: Spacing.md }}>
          Alertas Premium
        </AppText>
        <View style={styles.alertRow}>
          {[
            { icon: '💬', title: 'WhatsApp', desc: 'Notificações instantâneas' },
            { icon: '✈️', title: 'Telegram', desc: 'Bot dedicado' },
            { icon: '📧', title: 'Email', desc: 'Resumo diário' },
          ].map((a) => (
            <View key={a.title} style={styles.alertCard}>
              <AppText style={{ fontSize: 24 }}>{a.icon}</AppText>
              <AppText variant="label">{a.title}</AppText>
              <AppText variant="small" style={{ color: Colors.textMuted, textAlign: 'center' }}>{a.desc}</AppText>
            </View>
          ))}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  currencyRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  planCard: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 20,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  premiumCard: { borderColor: Colors.accent, borderWidth: 2 },
  premiumBadge: { position: 'absolute', top: 16, right: 16 },
  premiumBadgeChip: {
    backgroundColor: Colors.accent,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  planHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  planIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  alerts: { marginTop: Spacing.md },
  alertRow: { flexDirection: 'row', gap: Spacing.sm },
  alertCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xs,
  },
});
