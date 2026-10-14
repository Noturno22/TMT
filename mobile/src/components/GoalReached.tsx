import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppButton, AppText, Badge } from '@/components/ui';
import { GradientCard } from '@/components/GradientCard';
import { Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';
import { formatBancaMoney } from '@/core/format';

export function GoalReached({
  finalValue,
  currency,
  returnPct,
  profitValue,
  onWithdraw,
}: {
  finalValue: number;
  currency: 'usd' | 'aoa';
  returnPct: number;
  profitValue: number;
  onWithdraw: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const signedProfit = `${profitValue >= 0 ? '+' : '-'}${formatBancaMoney(Math.abs(profitValue), currency)}`;

  return (
    <GradientCard colors={[`${colors.success}33`, `${colors.accent}22`]} style={styles.card}>
      <View style={[styles.trophy, { backgroundColor: `${colors.success}26` }]}>
        <Ionicons name="trophy" size={30} color={colors.success} />
      </View>
      <AppText variant="small" style={[styles.eyebrow, { color: colors.success }]}>
        {t('capital.goalReachedTitle')}
      </AppText>
      <AppText variant="mono" style={[styles.value, { color: colors.text }]}>
        {formatBancaMoney(finalValue, currency)}
      </AppText>
      <AppText variant="small" style={[styles.desc, { color: colors.textMuted }]}>
        {t('capital.goalReachedDesc')}
      </AppText>
      <View style={styles.badges}>
        <Badge color={colors.success} bg={`${colors.success}20`}>
          {t('capital.target')}: +{returnPct}%
        </Badge>
        <AppText variant="label" style={{ color: profitValue >= 0 ? colors.success : colors.destructive }}>
          {signedProfit}
        </AppText>
      </View>
      <AppButton
        title={t('capital.requestWithdrawal')}
        variant="primary"
        onPress={onWithdraw}
        icon={<Ionicons name="arrow-down-circle-outline" size={18} color="#FFFFFF" />}
      />
    </GradientCard>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    card: {
      alignItems: 'center',
      gap: Spacing.sm,
      marginBottom: Spacing.md,
      paddingVertical: Spacing.lg,
    },
    trophy: {
      width: 60,
      height: 60,
      borderRadius: 30,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.xs,
    },
    eyebrow: { fontWeight: '800', letterSpacing: 2 },
    value: { fontSize: 34, lineHeight: 44, fontWeight: '800' },
    desc: { textAlign: 'center', paddingHorizontal: Spacing.sm },
    badges: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      marginBottom: Spacing.xs,
    },
  });
