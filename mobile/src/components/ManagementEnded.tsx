import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppButton, AppInput, AppText, Badge, Card } from '@/components/ui';
import { GradientCard } from '@/components/GradientCard';
import { Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';
import { useManagementRequest } from '@/hooks/useManagementRequest';
import { formatBancaMoney } from '@/core/format';
import type { CapitalPlanId } from '@/core/types';

interface PlanOpt {
  id: CapitalPlanId;
  nameKey: 'planoCrescimento.conservative' | 'planoCrescimento.balanced' | 'planoCrescimento.aggressive';
  descKey:
    | 'planoCrescimento.conservativeDesc'
    | 'planoCrescimento.balancedDesc'
    | 'planoCrescimento.aggressiveDesc';
  returnPct: number;
  icon: keyof typeof Ionicons.glyphMap;
}

const makePlans = (c: Palette): PlanOpt[] => [
  { id: 'conservador', nameKey: 'planoCrescimento.conservative', descKey: 'planoCrescimento.conservativeDesc', returnPct: 25, icon: 'leaf' },
  { id: 'equilibrado', nameKey: 'planoCrescimento.balanced', descKey: 'planoCrescimento.balancedDesc', returnPct: 20, icon: 'analytics' },
  { id: 'agressivo', nameKey: 'planoCrescimento.aggressive', descKey: 'planoCrescimento.aggressiveDesc', returnPct: 15, icon: 'rocket' },
];

const PLAN_COLOR = (c: Palette, id: CapitalPlanId) =>
  id === 'conservador' ? c.success : id === 'equilibrado' ? c.accent : c.destructive;

export function ManagementEnded({
  finalValue,
  capital,
  currency,
  profitValue,
  defaultPlanId = 'conservador',
}: {
  finalValue: number;
  capital: number;
  currency: 'usd' | 'aoa';
  profitValue: number;
  defaultPlanId?: CapitalPlanId;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const plans = makePlans(colors);
  const { request, loading, submit } = useManagementRequest();
  const [selectedId, setSelectedId] = useState<CapitalPlanId>(defaultPlanId);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const status = request?.status ?? null;
  const isPending = status === 'pending';
  const isRejected = status === 'rejected';
  const isProfit = profitValue >= 0;

  const send = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await submit(selectedId, currency, note);
      setNote('');
      Alert.alert(t('capital.requestSentTitle'), t('capital.requestSentMsg'));
    } catch {
      Alert.alert(t('capital.requestErrorTitle'), t('capital.requestErrorMsg'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <GradientCard colors={[colors.primaryDim, 'rgba(255,159,10,0.18)']} style={styles.hero}>
        <View style={styles.heroTop}>
          <AppText variant="small" style={styles.heroEyebrow}>{t('capital.currentBalance')}</AppText>
          <Badge color={colors.warning} bg={`${colors.warning}20`}>{t('capital.contractEnded')}</Badge>
        </View>
        <AppText variant="mono" style={styles.heroValue}>{formatBancaMoney(finalValue, currency)}</AppText>
        <View style={styles.heroFooter}>
          <AppText variant="small" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {t('capital.deposited')}{formatBancaMoney(capital, currency)}
          </AppText>
          <AppText variant="small" style={{ color: isProfit ? colors.success : colors.destructive }}>
            {isProfit ? '+' : '−'}{formatBancaMoney(Math.abs(profitValue), currency)}
          </AppText>
        </View>
        <AppText variant="small" style={{ color: 'rgba(255,255,255,0.7)' }}>{t('capital.endedDesc')}</AppText>
      </GradientCard>

      {status === 'approved' ? (
        <View style={[styles.notice, { backgroundColor: `${colors.success}18` }]}>
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          <AppText variant="small" style={{ color: colors.success, fontWeight: '700' }}>
            {t('capital.requestApproved')}
          </AppText>
        </View>
      ) : null}

      {isPending ? (
        <Card style={styles.card}>
          <View style={styles.pendingRow}>
            <View style={[styles.pendingIcon, { backgroundColor: `${colors.warning}18` }]}>
              <Ionicons name="time-outline" size={18} color={colors.warning} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="label">{t('capital.requestPending')}</AppText>
              <AppText variant="small" style={{ color: colors.textMuted }}>{t('capital.requestPendingDesc')}</AppText>
            </View>
          </View>
        </Card>
      ) : (
        <Card style={styles.card}>
          {isRejected ? (
            <View style={[styles.notice, { backgroundColor: `${colors.destructive}18`, marginBottom: Spacing.sm }]}>
              <Ionicons name="close-circle" size={16} color={colors.destructive} />
              <AppText variant="small" style={{ color: colors.destructive, fontWeight: '700' }}>
                {t('capital.requestRejected')}
              </AppText>
            </View>
          ) : null}

          <AppText variant="label">{t('capital.newManagementTitle')}</AppText>
          <AppText variant="small" style={{ color: colors.textMuted }}>{t('capital.newManagementDesc')}</AppText>

          <View style={styles.plans}>
            {plans.map((p) => {
              const selected = p.id === selectedId;
              const color = PLAN_COLOR(colors, p.id);
              return (
                <Pressable
                  key={p.id}
                  onPress={() => setSelectedId(p.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}>
                  <Card style={[styles.planCard, selected && { borderColor: colors.success, borderWidth: 2, backgroundColor: `${colors.success}08` }]}>
                    <View style={styles.planRow}>
                      <View style={[styles.planIcon, { backgroundColor: `${color}1A` }]}>
                        <Ionicons name={p.icon} size={18} color={color} />
                      </View>
                      <View style={styles.planText}>
                        <AppText variant="label">{t(p.nameKey)}</AppText>
                        <AppText variant="small" style={{ color: colors.textMuted }}>{t(p.descKey)}</AppText>
                      </View>
                      <Badge color={color} bg={`${color}1A`}>+{p.returnPct}%</Badge>
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

          <AppInput
            label={t('capital.newManagementNote')}
            value={note}
            onChangeText={setNote}
            placeholder={t('capital.newManagementNotePlaceholder')}
            multiline
            numberOfLines={3}
            maxLength={500}
            style={styles.noteInput}
          />

          <AppButton
            title={t('capital.newManagementCta')}
            variant="primary"
            onPress={send}
            loading={busy}
            disabled={busy || loading}
          />
        </Card>
      )}
    </View>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  wrap: { gap: Spacing.sm },
  hero: { gap: Spacing.sm, marginBottom: Spacing.md },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroEyebrow: { color: 'rgba(255,255,255,0.7)', fontWeight: '700', letterSpacing: 1 },
  heroValue: { fontSize: 36, lineHeight: 46, color: c.text, letterSpacing: 0.5 },
  heroFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  notice: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderRadius: 12, padding: Spacing.sm },
  card: { marginBottom: Spacing.md, gap: Spacing.sm },
  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  pendingIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  plans: { gap: Spacing.sm, marginVertical: Spacing.sm },
  planCard: { borderColor: c.border },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  planIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  planText: { flex: 1, gap: 2 },
  noteInput: { minHeight: 80, textAlignVertical: 'top' },
});
