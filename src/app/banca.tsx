import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppButton, AppInput, AppText, Badge, Card, Divider, Screen, SectionTitle } from '@/components/ui';
import { PremiumLock } from '@/components/PremiumLock';
import { formatMoney } from '@/core/format';
import { Colors, Spacing } from '@/core/theme';
import { useBanca } from '@/hooks/useBanca';
import { useSubscription } from '@/hooks/useSubscription';
import { useTranslation } from 'react-i18next';

export default function BancaScreen() {
  const { t } = useTranslation();
  const { canAccessBanca } = useSubscription();
  const { config, loading, save } = useBanca();
  const [editing, setEditing] = useState(false);
  const [capitalInput, setCapitalInput] = useState('');
  const [achievedInput, setAchievedInput] = useState('');
  const [metaInput, setMetaInput] = useState('');
  const [riskInput, setRiskInput] = useState('');

  if (!canAccessBanca) {
    return (
      <Screen>
        <PremiumLock
          label={t('banca.lockTitle')}
          description={t('banca.lockDesc')}
        />
      </Screen>
    );
  }

  const beginEdit = () => {
    setCapitalInput(String(config.capital));
    setAchievedInput(String(config.achieved));
    setMetaInput(String(config.metaPercent));
    setRiskInput(String(config.riskPercent));
    setEditing(true);
  };

  const commitEdit = () => {
    const capital = Number(capitalInput);
    const achieved = Number(achievedInput);
    const metaPercent = Number(metaInput);
    const riskPercent = Number(riskInput);
    if (!isFinite(capital) || capital <= 0) {
      Alert.alert(t('banca.invalidValue'), t('banca.positiveCapital'));
      return;
    }
    if (!isFinite(achieved) || achieved < 0) {
      Alert.alert(t('banca.invalidValue'), t('banca.invalidAchieved'));
      return;
    }
    if (!isFinite(metaPercent) || metaPercent <= 0) {
      Alert.alert(t('banca.invalidValue'), t('banca.invalidMeta'));
      return;
    }
    if (!isFinite(riskPercent) || riskPercent <= 0 || riskPercent > 100) {
      Alert.alert(t('banca.invalidValue'), t('banca.invalidRisk'));
      return;
    }
    save({ capital, achieved, metaPercent, riskPercent, metaMonths: config.metaMonths });
    setEditing(false);
  };

  const metaValue = config.capital * (config.metaPercent / 100);
  const progress = config.capital > 0 ? config.achieved - config.capital : 0;
  const progressPct = metaValue > 0 ? Math.min(100, Math.max(0, (progress / metaValue) * 100)) : 0;
  const riskValue = config.capital * (config.riskPercent / 100);

  if (loading) return <Screen><AppText variant="muted">{t('banca.loading')}</AppText></Screen>;

  return (
    <Screen>
      <SectionTitle>{t('banca.title')}</SectionTitle>
      <AppText variant="muted" style={{ marginBottom: Spacing.md }}>
        {t('banca.subtitle')}
      </AppText>

      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <AppText variant="muted">{t('banca.totalCapital')}</AppText>
          <Ionicons name="wallet" size={20} color={Colors.success} />
        </View>
        <AppText variant="title" style={styles.capitalValue}>
          {formatMoney(config.capital)} USD
        </AppText>
      </Card>

      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <AppText variant="label">{t('banca.targetReturn')}</AppText>
          <Ionicons name="flag" size={18} color={Colors.accent} />
        </View>
        <View style={styles.metaRow}>
          <AppText style={styles.metaBig}>{config.metaPercent}%</AppText>
          <AppText variant="small" style={{ color: Colors.textMuted }}>{t('banca.inMonths', { count: config.metaMonths })}</AppText>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progressPct}%` }]} />
        </View>
        <View style={styles.progressRow}>
          <AppText variant="small" style={{ color: Colors.accent }}>
            +{formatMoney(progress)} / {formatMoney(metaValue)} USD
          </AppText>
          <AppText variant="small" style={{ color: Colors.textMuted }}>
            {Math.round(progressPct)}%
          </AppText>
        </View>
      </Card>

      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <AppText variant="label">{t('banca.riskPerOp')}</AppText>
          <Badge color={Colors.success} bg={`${Colors.success}20`}>{t('banca.recommended')}</Badge>
        </View>
        <View style={styles.metaRow}>
          <AppText style={styles.metaBig}>{config.riskPercent}%</AppText>
          <AppText variant="small" style={{ color: Colors.success }}>= {formatMoney(riskValue)} USD</AppText>
        </View>
      </Card>

      <View style={styles.sectionRow}>
        <AppText variant="label">{t('banca.performance')}</AppText>
        {editing ? (
          <AppButton title={t('banca.save')} onPress={commitEdit} style={{ paddingVertical: 8, minHeight: 36 }} />
        ) : (
          <AppButton title={t('banca.edit')} variant="outline" onPress={beginEdit} style={{ paddingVertical: 8, minHeight: 36 }} />
        )}
      </View>

      {editing ? (
        <Card style={styles.card}>
          <AppInput label={t('banca.inputCapital')} value={capitalInput} onChangeText={setCapitalInput} keyboardType="numeric" />
          <AppInput label={t('banca.inputCurrent')} value={achievedInput} onChangeText={setAchievedInput} keyboardType="numeric" />
          <AppInput label={t('banca.inputTarget')} value={metaInput} onChangeText={setMetaInput} keyboardType="numeric" />
          <AppInput label={t('banca.inputRisk')} value={riskInput} onChangeText={setRiskInput} keyboardType="numeric" />
        </Card>
      ) : (
        <Card style={styles.card}>
          {[
            { label: t('banca.weekly'), value: '+220.50 USD' },
            { label: t('banca.monthly'), value: '+1,150.75 USD' },
            { label: t('banca.total'), value: `+${formatMoney(progress)} USD` },
          ].map((item, i) => (
            <View key={item.label}>
              {i > 0 ? <Divider /> : null}
              <View style={styles.perfRow}>
                <AppText style={{ color: Colors.textBody }}>{item.label}</AppText>
                <AppText variant="label" style={{ color: Colors.success }}>{item.value}</AppText>
              </View>
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: Spacing.md, gap: Spacing.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  capitalValue: { color: Colors.text, marginTop: Spacing.xs },
  metaRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.sm },
  metaBig: { fontSize: 28, fontWeight: '800', color: Colors.accent },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surfaceElevated,
    overflow: 'hidden',
    marginTop: Spacing.sm,
  },
  fill: { height: '100%', borderRadius: 4, backgroundColor: Colors.accent },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  perfRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm },
});
