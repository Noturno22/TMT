import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { AppButton, AppText, Badge, Card } from '@/components/ui';
import { Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';
import { formatBancaMoney, formatShortDate } from '@/core/format';
import { useTranslation } from 'react-i18next';
import { useBanca } from '@/hooks/useBanca';
import { useCapitalContract } from '@/hooks/useCapitalContract';
import { daysUntil } from '@/core/capital';
import type { CapitalPlanId } from '@/core/types';

const STORAGE_KEY = 'growth_plan';

interface GrowthPlan {
  id: CapitalPlanId;
  nameKey: 'planoCrescimento.conservative' | 'planoCrescimento.balanced' | 'planoCrescimento.aggressive';
  descKey: 'planoCrescimento.conservativeDesc' | 'planoCrescimento.balancedDesc' | 'planoCrescimento.aggressiveDesc';
  returnPct: number;
  months: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const makePlans = (c: Palette): GrowthPlan[] => [
  { id: 'conservador', nameKey: 'planoCrescimento.conservative', descKey: 'planoCrescimento.conservativeDesc', returnPct: 25, months: 3, icon: 'leaf', color: c.success },
  { id: 'equilibrado', nameKey: 'planoCrescimento.balanced', descKey: 'planoCrescimento.balancedDesc', returnPct: 20, months: 2, icon: 'analytics', color: c.accent },
  { id: 'agressivo', nameKey: 'planoCrescimento.aggressive', descKey: 'planoCrescimento.aggressiveDesc', returnPct: 15, months: 1, icon: 'rocket', color: c.destructive },
];

export const planNameKey: Record<CapitalPlanId, GrowthPlan['nameKey']> = {
  conservador: 'planoCrescimento.conservative',
  equilibrado: 'planoCrescimento.balanced',
  agressivo: 'planoCrescimento.aggressive',
};

export function GrowthPlanSection({ capital, currency = 'usd' }: { capital: number; currency?: 'usd' | 'aoa' }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const plans = makePlans(colors);
  const { config, save } = useBanca();
  const { contract, activate } = useCapitalContract();
  const [selectedId, setSelectedId] = useState<CapitalPlanId>(config.planId as CapitalPlanId);
  const [busy, setBusy] = useState(false);
  const bancaConfigRef = useRef(config);

  useEffect(() => {
    bancaConfigRef.current = config;
  }, [config]);

  // A seleção persiste localmente como preferência do simulador; a ativação
  // (fonte da verdade) vem do servidor via contrato.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (parsed.planId) setSelectedId(parsed.planId as CapitalPlanId);
      } catch {
        // ignora
      }
    });
  }, []);

  const contractActive = contract?.status === 'active';
  useEffect(() => {
    if (contractActive && contract) setSelectedId(contract.plan_id);
  }, [contractActive, contract]);

  const selectPlan = async (planId: CapitalPlanId) => {
    if (contractActive) return;
    setSelectedId(planId);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ planId }));
      await save({ ...bancaConfigRef.current, planId });
    } catch {
      Alert.alert(t('common.error'), 'Não foi possível guardar a seleção do plano. Tenta novamente.');
    }
  };

  const plan = plans.find((p) => p.id === selectedId) ?? plans[0];
  const projectedReturn = capital * (1 + plan.returnPct / 100);
  const profit = projectedReturn - capital;
  const periodLabel = plan.months === 1
    ? t('planoCrescimento.monthOne', { count: plan.months })
    : t('planoCrescimento.months', { count: plan.months });

  const activatePlan = async () => {
    if (busy || contractActive) return;
    setBusy(true);
    try {
      await activate(selectedId, currency);
    } catch {
      Alert.alert(t('planoCrescimento.activateErrorTitle'), t('planoCrescimento.activateErrorMsg'));
    } finally {
      setBusy(false);
    }
  };

  if (contractActive && contract) {
    const daysLeft = daysUntil(contract.end_date);
    return (
      <View style={styles.wrap}>
        <View style={styles.header}>
          <AppText variant="h2">{t('planoCrescimento.title')}</AppText>
          <Badge color={colors.success} bg={`${colors.success}20`}>{t('planoCrescimento.planActive')}</Badge>
        </View>
        <Card style={styles.activeCard}>
          <View style={styles.activeRow}>
            <View style={[styles.planIcon, { backgroundColor: `${colors.success}1A` }]}>
              <Ionicons name="shield-checkmark" size={18} color={colors.success} />
            </View>
            <View style={styles.planText}>
              <AppText variant="label">{t(planNameKey[contract.plan_id])}</AppText>
              <AppText variant="small" style={{ color: colors.textMuted }}>
                {formatShortDate(contract.start_date)} — {formatShortDate(contract.end_date)}
              </AppText>
            </View>
          </View>
          <View style={styles.projectRow}>
            <AppText variant="small" style={{ color: colors.textMuted }}>
              {daysLeft > 0 ? t('capital.contractDaysLeft', { count: daysLeft }) : t('capital.contractEnded')}
            </AppText>
            <Badge color={daysLeft > 0 ? colors.success : colors.warning} bg={`${daysLeft > 0 ? colors.success : colors.warning}20`}>
              {daysLeft > 0 ? t('capital.active') : t('capital.contractEnded')}
            </Badge>
          </View>
        </Card>
        <AppButton title={t('planoCrescimento.planActive')} variant="secondary" disabled />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <AppText variant="h2">{t('planoCrescimento.title')}</AppText>
      </View>
      <AppText variant="muted" style={styles.selectHint}>{t('planoCrescimento.select')}</AppText>

      <View style={styles.plans}>
        {plans.map((p) => {
          const selected = p.id === selectedId;
          return (
            <Pressable
              key={p.id}
              onPress={() => selectPlan(p.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}>
              <Card style={[styles.planCard, selected && styles.planSelected]}>
                <View style={styles.planRow}>
                  <View style={[styles.planIcon, { backgroundColor: `${p.color}1A` }]}>
                    <Ionicons name={p.icon} size={18} color={p.color} />
                  </View>
                  <View style={styles.planText}>
                    <AppText variant="label">{t(p.nameKey)}</AppText>
                    <AppText variant="small" style={{ color: colors.textMuted }}>{t(p.descKey)}</AppText>
                  </View>
                  <Badge color={p.color} bg={`${p.color}1A`}>+{p.returnPct}%</Badge>
                  <Ionicons
                    name={selected ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={selected ? colors.success : colors.textFaint}
                  />
                </View>
              </Card>
            </Pressable>
          );
        })}
      </View>

      <Card style={styles.projection}>
        <AppText variant="label" style={styles.projTitle}>{t('planoCrescimento.projection')}</AppText>
        <View style={styles.projRow}>
          <AppText style={{ color: colors.textBody }}>{t('planoCrescimento.investment')}</AppText>
          <AppText variant="label">{formatBancaMoney(capital, currency)}</AppText>
        </View>
        <View style={styles.projRow}>
          <AppText style={{ color: colors.textBody }}>{t('planoCrescimento.estimatedReturn')}</AppText>
          <AppText variant="label" style={{ color: colors.success }}>{formatBancaMoney(projectedReturn, currency)}</AppText>
        </View>
        <View style={styles.projRow}>
          <AppText style={{ color: colors.textBody }}>{t('planoCrescimento.period')}</AppText>
          <AppText variant="label">{periodLabel}</AppText>
        </View>
        <View style={styles.profitBadge}>
          <AppText variant="small" style={{ color: colors.success, fontWeight: '700' }}>
            {t('planoCrescimento.estimatedProfit', { value: formatBancaMoney(profit, currency) })}
          </AppText>
        </View>
      </Card>

      <AppButton
        title={t('planoCrescimento.activate')}
        variant="primary"
        onPress={activatePlan}
        loading={busy}
      />
    </View>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  wrap: { gap: Spacing.sm },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  selectHint: { marginBottom: Spacing.sm },
  plans: { gap: Spacing.sm, marginBottom: Spacing.md },
  planCard: { borderColor: c.border },
  planSelected: { borderColor: c.success, borderWidth: 2, backgroundColor: `${c.success}08` },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  planIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planText: { flex: 1, gap: 2 },
  projection: { marginBottom: Spacing.lg, gap: Spacing.sm },
  projTitle: { marginBottom: Spacing.xs },
  projRow: { flexDirection: 'row', justifyContent: 'space-between' },
  profitBadge: {
    backgroundColor: `${c.success}12`,
    borderRadius: 8,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  activeCard: { marginBottom: Spacing.md, gap: Spacing.md },
  activeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  projectRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});