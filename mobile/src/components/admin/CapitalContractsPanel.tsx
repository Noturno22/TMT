import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card, AppText, AppButton, Badge, Spinner } from '@/components/ui';
import { formatBancaMoney } from '@/core/format';
import { daysUntil } from '@/core/capital';
import { listCapitalContracts, type AdminCapitalContract } from '@/lib/adminApi';
import { Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';

const PLAN_LABELS: Record<AdminCapitalContract['plan_id'], string> = {
  conservador: 'Conservador',
  equilibrado: 'Equilibrado',
  agressivo: 'Agressivo',
};

const STATUS_LABELS: Record<AdminCapitalContract['status'], string> = {
  active: 'Ativa',
  completed: 'Concluída',
  cancelled: 'Cancelada',
};

const planLabel = (p: AdminCapitalContract['plan_id']): string => PLAN_LABELS[p] ?? p;
const contractStatusLabel = (s: AdminCapitalContract['status']): string => STATUS_LABELS[s] ?? s;

export function CapitalContractsPanel() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { t } = useTranslation();
  const [contracts, setContracts] = useState<AdminCapitalContract[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await listCapitalContracts();
      setContracts(data.contracts);
      setActiveCount(data.activeCount);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const statusColor = (s: AdminCapitalContract['status']) =>
    s === 'active' ? colors.success : s === 'completed' ? colors.primary : colors.destructive;

  if (loading) return <Spinner label={t('capital.loading')} />;

  if (error) {
    return (
      <View style={styles.errorBox}>
        <AppText variant="muted" style={styles.center}>{error}</AppText>
        <AppButton title={t('common.retry')} onPress={load} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.list}
      contentContainerStyle={{ paddingBottom: Spacing.xl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <AppText variant="label">{t('admin.managedContracts')}</AppText>
          <AppText variant="small" style={styles.label}>
            {t('admin.managedContractsSummary', { active: activeCount, total: contracts.length })}
          </AppText>
        </View>

        {contracts.length === 0 ? (
          <AppText variant="muted" style={styles.center}>{t('admin.noManagedContracts')}</AppText>
        ) : (
          contracts.map((c) => (
            <View key={c.id} style={styles.itemRow}>
              <View style={styles.itemMain}>
                <View style={styles.emailRow}>
                  <AppText variant="label" numberOfLines={1} style={{ flex: 1 }}>{c.email || '—'}</AppText>
                  <Badge color={statusColor(c.status)}>{contractStatusLabel(c.status)}</Badge>
                </View>
                <AppText variant="small" style={styles.label}>
                  {planLabel(c.plan_id)} · {formatBancaMoney(Number(c.capital_inicial), c.currency)} · {c.start_date} → {c.end_date}
                </AppText>
                {c.status === 'active' && (
                  <AppText variant="small" style={styles.label}>
                    {t('capital.contractDaysLeft', { count: daysUntil(c.end_date) })} · penalidade {Number(c.penalty_pct)}%
                  </AppText>
                )}
              </View>
            </View>
          ))
        )}
      </Card>
    </ScrollView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    list: { flex: 1 },
    card: { padding: Spacing.md },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.sm,
    },
    itemRow: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      paddingVertical: Spacing.sm,
    },
    itemMain: { gap: 2 },
    emailRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    label: { color: c.textMuted },
    errorBox: { padding: Spacing.lg, gap: Spacing.md },
    center: { textAlign: 'center', marginVertical: Spacing.md },
  });
