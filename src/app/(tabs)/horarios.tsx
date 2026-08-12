import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Badge, EmptyState, Screen, SectionTitle, Spinner } from '@/components/ui';
import { AlarmToggle } from '@/components/AlarmToggle';
import { useBoomHours } from '@/hooks/useBoomHours';
import { requestNotificationPermission } from '@/lib/notifications';
import { boomEpochMs } from '@/core/booms';
import { formatLongDate, pad2 } from '@/core/format';
import { Colors, Spacing } from '@/core/theme';

async function openNotificationSettings() {
  const granted = await requestNotificationPermission();
  if (!granted) {
    Alert.alert('Notificações', 'Ativa as notificações nas definições do teu telemóvel.');
  }
}

function watDate(now: Date): Date {
  return new Date(now.getTime() + (now.getTimezoneOffset() + 60) * 60000);
}

function Clock({ now }: { now: Date }) {
  const wat = watDate(now);
  const gmt = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
  return (
    <View style={styles.clock}>
      <View style={styles.clockCol}>
        <AppText variant="small" style={{ color: Colors.textMuted }}>WAT · ANGOLA</AppText>
        <AppText variant="mono" style={styles.clockValue}>
          {pad2(wat.getHours())}:{pad2(wat.getMinutes())}:{pad2(wat.getSeconds())}
        </AppText>
      </View>
      <View style={styles.divider} />
      <View style={styles.clockCol}>
        <AppText variant="small" style={{ color: Colors.textMuted }}>GMT</AppText>
        <AppText variant="mono" style={styles.clockValue}>
          {pad2(gmt.getHours())}:{pad2(gmt.getMinutes())}:{pad2(gmt.getSeconds())}
        </AppText>
      </View>
    </View>
  );
}

export default function HorariosScreen() {
  const { hours, loading, error } = useBoomHours();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const wat = watDate(now);

  return (
    <Screen>
      <SectionTitle
        right={
          <Pressable onPress={openNotificationSettings} hitSlop={8}>
            <Ionicons name="settings" size={20} color={Colors.textFaint} />
          </Pressable>
        }>
        Hora do Boom
      </SectionTitle>

      <View style={styles.dateRow}>
        <AppText variant="label">{formatLongDate(now.toISOString())}</AppText>
        <AppText variant="small" style={{ color: Colors.textMuted }}>WAT (UTC-1)</AppText>
      </View>

      <Clock now={now} />

      <AppText variant="muted" style={{ marginBottom: Spacing.md }}>
        Janelas de alta volatilidade. Ativa alarmes para não perderes a entrada.
      </AppText>

      {loading ? (
        <Spinner label="A carregar horários…" />
      ) : error ? (
        <EmptyState title="Erro" subtitle={error} />
      ) : hours.length === 0 ? (
        <EmptyState title="Sem horários" subtitle="Ainda não há horários ativos." />
      ) : (
        hours.map((h) => {
          const [bh, bm] = (h.time_wat || '00:00').split(':').map(Number);
          const currentMin = wat.getHours() * 60 + wat.getMinutes();
          const boomMin = (bh || 0) * 60 + (bm || 0);
          const inProgress = currentMin >= boomMin && currentMin < boomMin + 60;
          const expired = currentMin >= boomMin + 60;
          const volatility = Math.max(0, Math.min(5, h.volatility));

          return (
            <View key={h.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <AppText variant="h2" style={{ flex: 1 }}>{h.title}</AppText>
                {inProgress ? (
                  <Badge color={Colors.live} bg={`${Colors.live}1F`}>AGORA</Badge>
                ) : expired ? (
                  <Badge color={Colors.textMuted} bg={`${Colors.textMuted}1F`}>ENCERRADO</Badge>
                ) : (
                  <Badge color={Colors.warning} bg={`${Colors.warning}1F`}>PRÓXIMO</Badge>
                )}
              </View>

              <View style={styles.timeRow}>
                <AppText style={styles.timeBig}>{h.time_wat}</AppText>
                <View>
                  <AppText variant="small" style={{ color: Colors.textMuted }}>WAT</AppText>
                  <AppText variant="small" style={{ color: Colors.textMuted }}>GMT {h.time_gmt}</AppText>
                </View>
              </View>

              <View style={styles.pairs}>
                {(h.pairs || []).map((p) => (
                  <View key={p} style={styles.pairChip}>
                    <AppText variant="small" style={{ color: Colors.success, fontWeight: '700' }}>{p}</AppText>
                  </View>
                ))}
              </View>

              <View style={styles.volRow}>
                <AppText variant="small" style={{ color: Colors.textMuted }}>VOLATILIDADE</AppText>
                <AppText style={{ color: Colors.accent, letterSpacing: 2 }}>
                  {volatility > 0 ? '●'.repeat(volatility) : '—'}
                </AppText>
              </View>

              {h.description ? <AppText variant="muted">{h.description}</AppText> : null}

              {!expired ? (
                <AlarmToggle
                  boomId={h.id}
                  boomTime={new Date(boomEpochMs(now, h.time_wat)).toISOString()}
                  title={h.title}
                />
              ) : null}
            </View>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  clock: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  clockCol: { flex: 1, gap: 2 },
  clockValue: { fontSize: 22, fontWeight: '800', color: Colors.primary },
  divider: { width: 1, height: 40, backgroundColor: Colors.border },
  card: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  timeBig: { fontSize: 34, fontWeight: '800', color: Colors.accent, fontFamily: 'monospace' },
  pairs: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  pairChip: {
    backgroundColor: `${Colors.success}1A`,
    borderColor: `${Colors.success}40`,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  volRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
});
