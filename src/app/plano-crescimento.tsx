import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { AppButton, AppText, Card, Screen, SectionTitle } from '@/components/ui';
import { Colors, Spacing } from '@/core/theme';

const STORAGE_KEY = 'growth_plan';

interface GrowthPlan {
  id: string;
  name: string;
  goal: string;
  returnPct: number;
  months: number;
  description: string;
}

const PLANS: GrowthPlan[] = [
  { id: 'conservador', name: 'Conservador', goal: '+20% em 3 meses', returnPct: 20, months: 3, description: 'Menor risco, consistência' },
  { id: 'equilibrado', name: 'Equilibrado', goal: '+35% em 2 meses', returnPct: 35, months: 2, description: 'Risco moderado' },
  { id: 'agressivo', name: 'Agressivo', goal: '+50% em 3 meses', returnPct: 50, months: 3, description: 'Maior retorno potencial' },
];

function formatMoney(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PlanoCrescimentoScreen() {
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
      <SectionTitle>Plano de Crescimento</SectionTitle>
      <AppText variant="muted" style={{ marginBottom: Spacing.md }}>Selecione seu plano</AppText>

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
                    <AppText variant="label">{p.name}</AppText>
                    <AppText variant="small" style={{ color: Colors.success, fontWeight: '700' }}>{p.goal}</AppText>
                    <AppText variant="small" style={{ color: Colors.textMuted }}>{p.description}</AppText>
                  </View>
                </View>
              </Card>
            </Pressable>
          );
        })}
      </View>

      <Card style={styles.projection}>
        <AppText variant="label" style={{ marginBottom: Spacing.sm }}>Projeção</AppText>
        <View style={styles.projRow}>
          <AppText style={{ color: Colors.textBody }}>Investimento</AppText>
          <AppText variant="label">{formatMoney(capital)} USD</AppText>
        </View>
        <View style={styles.projRow}>
          <AppText style={{ color: Colors.textBody }}>Retorno Estimado</AppText>
          <AppText variant="label" style={{ color: Colors.success }}>{formatMoney(projectedReturn)} USD</AppText>
        </View>
        <View style={styles.projRow}>
          <AppText style={{ color: Colors.textBody }}>Período</AppText>
          <AppText variant="label">{plan.months} meses</AppText>
        </View>
        <View style={styles.profitBadge}>
          <AppText variant="small" style={{ color: Colors.success, fontWeight: '700' }}>
            Lucro estimado: +{formatMoney(profit)} USD
          </AppText>
        </View>
      </Card>

      {activated ? (
        <AppButton title="✓ Plano Ativo" variant="secondary" disabled />
      ) : (
        <AppButton title="Ativar Plano" variant="primary" onPress={activate} />
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
