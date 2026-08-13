import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, EmptyState, Screen, SectionTitle, Spinner } from '@/components/ui';
import { GradientCard } from '@/components/GradientCard';
import { SectionHeader } from '@/components/SectionHeader';
import { AlarmToggle } from '@/components/AlarmToggle';
import { BoomHourCard, boomHourStatus } from '@/components/BoomHourCard';
import { useBoomHours } from '@/hooks/useBoomHours';
import { requestNotificationPermission } from '@/lib/notifications';
import { boomCountdown, boomEpochMs, getNextBoomHour } from '@/core/booms';
import { formatLongDate, pad2 } from '@/core/format';
import { Colors, Spacing } from '@/core/theme';
import type { BoomHour } from '@/core/types';

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
      <View style={styles.liveDot} />
      <View style={styles.clockCol}>
        <AppText variant="small" style={{ color: Colors.textMuted }}>WAT · ANGOLA</AppText>
        <AppText variant="mono" style={styles.clockValue}>
          {pad2(wat.getHours())}:{pad2(wat.getMinutes())}:{pad2(wat.getSeconds())}
        </AppText>
      </View>
      <View style={styles.divider} />
      <View style={styles.clockCol}>
        <AppText variant="small" style={{ color: Colors.textMuted }}>GMT</AppText>
        <AppText variant="mono" style={styles.clockValueMuted}>
          {pad2(gmt.getHours())}:{pad2(gmt.getMinutes())}:{pad2(gmt.getSeconds())}
        </AppText>
      </View>
    </View>
  );
}

function NextBoomHero({ hours, now }: { hours: BoomHour[]; now: Date }) {
  const next = getNextBoomHour(hours, now);
  if (!next) return null;
  const epoch = boomEpochMs(now, next.time_wat);
  if (epoch < now.getTime()) return null;

  return (
    <GradientCard colors={[Colors.accentDim, Colors.primaryDim]} style={styles.hero}>
      <View style={styles.heroTop}>
        <View style={{ flex: 1 }}>
          <AppText variant="small" style={styles.heroEyebrow}>PRÓXIMO BOOM</AppText>
          <AppText variant="h2">{next.title}</AppText>
        </View>
        <View style={styles.heroIcon}>
          <Ionicons name="flame" size={22} color={Colors.accent} />
        </View>
      </View>

      <View style={styles.heroTimeRow}>
        <AppText variant="mono" style={styles.heroTime}>{next.time_wat}</AppText>
        <AppText variant="small" style={{ color: Colors.textMuted }}>WAT</AppText>
      </View>

      <View style={styles.heroCountdown}>
        <AppText variant="mono" style={styles.heroCd}>
          {boomCountdown(new Date(epoch).toISOString())}
        </AppText>
        <AppText variant="small" style={{ color: Colors.textMuted }}>para a entrada</AppText>
      </View>

      <View style={styles.pairs}>
        {(next.pairs || []).map((p) => (
          <View key={p} style={styles.pairChip}>
            <AppText variant="small" style={{ color: Colors.success, fontWeight: '700' }}>{p}</AppText>
          </View>
        ))}
      </View>

      <AlarmToggle boomId={next.id} boomTime={new Date(epoch).toISOString()} title={next.title} />
    </GradientCard>
  );
}

export default function HorariosScreen() {
  const { hours, loading, error } = useBoomHours();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const live = hours.filter((h) => boomHourStatus(h, now) === 'live');
  const upcoming = hours.filter((h) => boomHourStatus(h, now) === 'upcoming');
  const expired = hours.filter((h) => boomHourStatus(h, now) === 'expired');

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

      <NextBoomHero hours={hours} now={now} />

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
        <View>
          {live.length > 0 ? (
            <View style={styles.group}>
              <SectionHeader title="AO VIVO" subtitle={`${live.length} janela${live.length > 1 ? 's' : ''} em curso`} />
              {live.map((h) => <BoomHourCard key={h.id} hour={h} now={now} />)}
            </View>
          ) : null}
          {upcoming.length > 0 ? (
            <View style={styles.group}>
              <SectionHeader title="PRÓXIMOS" subtitle="Hoje" />
              {upcoming.map((h) => <BoomHourCard key={h.id} hour={h} now={now} />)}
            </View>
          ) : null}
          {expired.length > 0 ? (
            <View style={styles.group}>
              <SectionHeader title="ENCERRADOS" subtitle="Hoje" />
              {expired.map((h) => <BoomHourCard key={h.id} hour={h} now={now} />)}
            </View>
          ) : null}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  hero: {
    gap: Spacing.md,
    marginBottom: Spacing.md,
    borderColor: `${Colors.accent}55`,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  heroEyebrow: {
    color: Colors.textMuted,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 2,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: `${Colors.accent}1F`,
    borderColor: `${Colors.accent}55`,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTimeRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.sm },
  heroTime: { fontSize: 44, fontWeight: '800', color: Colors.accent },
  heroCountdown: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.sm },
  heroCd: { fontSize: 24, fontWeight: '800', color: Colors.text, letterSpacing: 1 },
  pairs: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  pairChip: {
    backgroundColor: `${Colors.success}1A`,
    borderColor: `${Colors.success}40`,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
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
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.live,
    marginRight: Spacing.md,
  },
  clockCol: { flex: 1, gap: 2 },
  clockValue: { fontSize: 22, fontWeight: '800', color: Colors.primary },
  clockValueMuted: { fontSize: 22, fontWeight: '800', color: Colors.textMuted },
  divider: { width: 1, height: 40, backgroundColor: Colors.border, marginHorizontal: Spacing.md },
  group: { marginBottom: Spacing.lg },
});
