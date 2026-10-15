import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppButton, AppText, Badge, Card } from '@/components/ui';
import { Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';
import { formatBancaMoney, formatShortDate } from '@/core/format';
import { daysUntil } from '@/core/capital';
import type { CapitalContract } from '@/core/types';
import { planNameKey } from '@/components/GrowthPlanSection';

interface ContractCardProps {
  contract: CapitalContract;
  goalReached?: boolean;
}

export function ContractCard({ contract, goalReached }: ContractCardProps) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const daysLeft = daysUntil(contract.end_date);
  const active = contract.status === 'active' && daysLeft > 0;
  const achieved = Boolean(goalReached) && active;
  const badgeColor = achieved || active ? colors.success : colors.warning;
  const badgeLabel = achieved ? t('capital.goalReachedTitle') : active ? t('capital.active') : t('capital.contractEnded');

  const rows: { label: string; value: string; color?: string }[] = [
    { label: t('capital.contractPlan'), value: t(planNameKey[contract.plan_id]) },
    { label: t('capital.contractStart'), value: formatShortDate(contract.start_date) },
    { label: t('capital.contractEnd'), value: formatShortDate(contract.end_date) },
    { label: t('capital.contractCapital'), value: formatBancaMoney(contract.capital_inicial, contract.currency) },
    { label: t('capital.contractPenalty'), value: `${contract.penalty_pct}%`, color: colors.warning },
  ];

  return (
    <>
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <AppText variant="label">{t('capital.contractTitle')}</AppText>
          <Badge color={badgeColor} bg={`${badgeColor}20`}>{badgeLabel}</Badge>
        </View>
        {rows.map((row) => (
          <View key={row.label} style={styles.row}>
            <AppText variant="small" style={{ color: colors.textMuted }}>{row.label}</AppText>
            <AppText variant="label" style={row.color ? { color: row.color } : undefined}>{row.value}</AppText>
          </View>
        ))}
        <View style={styles.footer}>
          <AppText variant="small" style={{ color: colors.textMuted }}>
            {achieved
              ? t('capital.goalReachedDesc')
              : daysLeft > 0
                ? t('capital.contractDaysLeft', { count: daysLeft })
                : t('capital.contractEnded')}
          </AppText>
          <AppButton
            title={t('capital.viewContract')}
            variant="ghost"
            icon={<Ionicons name="document-text-outline" size={18} color={colors.accent} />}
            onPress={() => setOpen(true)}
          />
        </View>
      </Card>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <AppText variant="h2">{t('capital.contractTermsTitle')}</AppText>
              <Pressable onPress={() => setOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </Pressable>
            </View>
            <AppText variant="muted" style={styles.termsBody}>
              {t('capital.contractTermsBody', { penalty: contract.penalty_pct })}
            </AppText>
            <View style={styles.termsRows}>
              {rows.map((row) => (
                <View key={row.label} style={styles.row}>
                  <AppText variant="small" style={{ color: colors.textMuted }}>{row.label}</AppText>
                  <AppText variant="label" style={row.color ? { color: row.color } : undefined}>{row.value}</AppText>
                </View>
              ))}
            </View>
            <AppButton title={t('planos.cancel')} variant="ghost" onPress={() => setOpen(false)} />
          </View>
        </View>
      </Modal>
    </>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    card: { marginBottom: Spacing.md, gap: Spacing.sm },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.xs },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: Spacing.md },
    modalContent: { backgroundColor: c.surface, borderRadius: 20, padding: Spacing.lg, gap: Spacing.md },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    termsBody: { lineHeight: 20 },
    termsRows: { gap: Spacing.sm },
  });