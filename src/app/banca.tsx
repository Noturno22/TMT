import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppButton, AppInput, AppText, Badge, Card, Divider, Screen, SectionTitle } from '@/components/ui';
import { formatMoney } from '@/core/format';
import { Colors, Spacing } from '@/core/theme';
import { useBanca } from '@/hooks/useBanca';

export default function BancaScreen() {
  const { config, loading, save } = useBanca();
  const [editing, setEditing] = useState(false);
  const [capitalInput, setCapitalInput] = useState('');
  const [achievedInput, setAchievedInput] = useState('');
  const [metaInput, setMetaInput] = useState('');
  const [riskInput, setRiskInput] = useState('');

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
      Alert.alert('Valor inválido', 'O capital tem de ser um número positivo.');
      return;
    }
    if (!isFinite(achieved) || achieved < 0) {
      Alert.alert('Valor inválido', 'O valor atualizado tem de ser positivo.');
      return;
    }
    if (!isFinite(metaPercent) || metaPercent <= 0) {
      Alert.alert('Valor inválido', 'A meta tem de ser uma percentagem positiva.');
      return;
    }
    if (!isFinite(riskPercent) || riskPercent <= 0 || riskPercent > 100) {
      Alert.alert('Valor inválido', 'O risco tem de estar entre 1 e 100.');
      return;
    }
    save({ capital, achieved, metaPercent, riskPercent, metaMonths: config.metaMonths });
    setEditing(false);
  };

  const metaValue = config.capital * (config.metaPercent / 100);
  const progress = config.capital > 0 ? config.achieved - config.capital : 0;
  const progressPct = metaValue > 0 ? Math.min(100, Math.max(0, (progress / metaValue) * 100)) : 0;
  const riskValue = config.capital * (config.riskPercent / 100);

  if (loading) return <Screen><AppText variant="muted">A carregar…</AppText></Screen>;

  return (
    <Screen>
      <SectionTitle>Gestão de Banca</SectionTitle>
      <AppText variant="muted" style={{ marginBottom: Spacing.md }}>
        Controla o teu capital, metas e risco por operação.
      </AppText>

      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <AppText variant="muted">CAPITAL TOTAL</AppText>
          <Ionicons name="wallet" size={20} color={Colors.success} />
        </View>
        <AppText variant="title" style={styles.capitalValue}>
          {formatMoney(config.capital)} USD
        </AppText>
      </Card>

      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <AppText variant="label">Meta de Retorno</AppText>
          <Ionicons name="flag" size={18} color={Colors.accent} />
        </View>
        <View style={styles.metaRow}>
          <AppText style={styles.metaBig}>{config.metaPercent}%</AppText>
          <AppText variant="small" style={{ color: Colors.textMuted }}>em {config.metaMonths}</AppText>
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
          <AppText variant="label">Risco por Operação</AppText>
          <Badge color={Colors.success} bg={`${Colors.success}20`}>RECOMENDADO</Badge>
        </View>
        <View style={styles.metaRow}>
          <AppText style={styles.metaBig}>{config.riskPercent}%</AppText>
          <AppText variant="small" style={{ color: Colors.success }}>= {formatMoney(riskValue)} USD</AppText>
        </View>
      </Card>

      <View style={styles.sectionRow}>
        <AppText variant="label">Desempenho</AppText>
        {editing ? (
          <AppButton title="Guardar" onPress={commitEdit} style={{ paddingVertical: 8, minHeight: 36 }} />
        ) : (
          <AppButton title="Editar" variant="outline" onPress={beginEdit} style={{ paddingVertical: 8, minHeight: 36 }} />
        )}
      </View>

      {editing ? (
        <Card style={styles.card}>
          <AppInput label="CAPITAL (USD)" value={capitalInput} onChangeText={setCapitalInput} keyboardType="numeric" />
          <AppInput label="VALOR ATUAL (USD)" value={achievedInput} onChangeText={setAchievedInput} keyboardType="numeric" />
          <AppInput label="META (%)" value={metaInput} onChangeText={setMetaInput} keyboardType="numeric" />
          <AppInput label="RISCO POR OPERAÇÃO (%)" value={riskInput} onChangeText={setRiskInput} keyboardType="numeric" />
        </Card>
      ) : (
        <Card style={styles.card}>
          {[
            { label: 'Semanal', value: '+220.50 USD' },
            { label: 'Mensal', value: '+1,150.75 USD' },
            { label: 'Total', value: `+${formatMoney(progress)} USD` },
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
