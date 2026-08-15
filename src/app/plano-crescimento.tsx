import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { AppButton, AppText, Card, Screen, SectionTitle } from '@/components/ui';
import { Colors, Spacing } from '@/core/theme';
import { useTranslation } from 'react-i18next';

const STORAGE_KEY = 'growth_plan';

interface GrowthPlan {
  id: string;
  nameKey: 'planoCrescimento.conservative' | 'planoCrescimento.balanced' | 'planoCrescimento.aggressive';
  descKey: 'planoCrescimento.conservativeDesc' | 'planoCrescimento.balancedDesc' | 'planoCrescimento.aggressiveDesc';
  returnPct: number;
  months: number;
}

const PLANS: GrowthPlan[] = [
  { id: 'conservador', nameKey: 'planoCrescimento.conservative', descKey: 'planoCrescimento.conservativeDesc', returnPct: 20, months: 3 },
  { id: 'equilibrado', nameKey: 'planoCrescimento.balanced', descKey: 'planoCrescimento.balancedDesc', returnPct: 35, months: 2 },
  { id: 'agressivo', nameKey: 'planoCrescimento.aggressive', descKey: 'planoCrescimento.aggressiveDesc', returnPct: 50, months: 3 },
];

function formatMoney(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PlanoCrescimentoScreen() {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState<string>('conservador');
  const [capital, setCapital] = useState(10000);
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (parsed.planId) setSelectedId(parsed.planId);
        if (parsed.activated) setActivated(true);
        if (parsed.capital) setCapital(parsed.capital);
      } catch {
        // ignore
      }
    });
  }, []);

  const plan = PLANS.find((p) => p.id === selectedId) ?? PLANS[0];

  const projectedReturn = capital * (1 + plan.returnPct / 100);
  const profit = projectedReturn - capital;

  const activate = async () => {
    setActivated(true);
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ planId: selectedId, capital, activated: true }),
    );
  };

  return (
    <Screen>
      <SectionTitle>{t('planoCrescimento.title')}</SectionTitle>
      <AppText variant="muted" style={{ marginBottom: Spacing.md }}>{t('planoCrescimento.select')}</AppText>

      <View style={styles.plans}>
        {PLANS.map((p) => {
          const selected = p.id === selectedId;
          return (
            <Pressable key={p.id} onPress={() => setSelectedId(p.id)}>
              <Card style={[styles.planCard, selected && styles.planSelected]}>
                <View style={styles.planRow}>
                  <Ionicons
                    name={selected ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={selected ? Colors.success : Colors.textFaint}
                  />
                  <View style={{ flex: 1 }}>
                    <AppText variant="label">{t(p.nameKey)}</AppText>
                    <AppText variant="small" style={{ color: Colors.success, fontWeight: '700' }}>{t(p.descKey)}</AppText>
                  </View>
                </View>
              </Card>
            </Pressable>
          );
        })}
      </View>

      <Card style={styles.projection}>
        <AppText variant="label" style={{ marginBottom: Spacing.sm }}>{t('planoCrescimento.projection')}</AppText>
        <View style={styles.projRow}>
          <AppText style={{ color: Colors.textBody }}>{t('planoCrescimento.investment')}</AppText>
          <AppText variant="label">{formatMoney(capital)} USD</AppText>
        </View>
        <View style={styles.projRow}>
          <AppText style={{ color: Colors.textBody }}>{t('planoCrescimento.estimatedReturn')}</AppText>
          <AppText variant="label" style={{ color: Colors.success }}>{formatMoney(projectedReturn)} USD</AppText>
        </View>
        <View style={styles.projRow}>
          <AppText style={{ color: Colors.textBody }}>{t('planoCrescimento.period')}</AppText>
          <AppText variant="label">{t('planoCrescimento.months', { count: plan.months })}</AppText>
        </View>
        <View style={styles.profitBadge}>
          <AppText variant="small" style={{ color: Colors.success, fontWeight: '700' }}>
            {t('planoCrescimento.estimatedProfit', { value: formatMoney(profit) })}
          </AppText>
        </View>
      </Card>

      {activated ? (
        <AppButton title={t('planoCrescimento.planActive')} variant="secondary" disabled />
      ) : (
        <AppButton title={t('planoCrescimento.activate')} variant="primary" onPress={activate} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  plans: { gap: Spacing.sm, marginBottom: Spacing.md },
  planCard: { borderColor: Colors.border },
  planSelected: { borderColor: Colors.success, borderWidth: 2, backgroundColor: `${Colors.success}08` },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  projection: { marginBottom: Spacing.lg, gap: Spacing.sm },
  projRow: { flexDirection: 'row', justifyContent: 'space-between' },
  profitBadge: {
    backgroundColor: `${Colors.success}12`,
    borderRadius: 8,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
});
