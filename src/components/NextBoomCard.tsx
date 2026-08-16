import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText, Badge } from '@/components/ui';
import { GradientCard } from '@/components/GradientCard';
import { pad2 } from '@/core/format';
import { Colors, Spacing } from '@/core/theme';

const GRADIENT: readonly [string, string] = ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)'];

function getTimeText(remaining: number): string {
  const hours = Math.floor(remaining / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  if (hours > 0) return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
  return `${pad2(minutes)}:${pad2(seconds)}`;
}

function formatClock(epochMs: number): string {
  const d = new Date(epochMs);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function NextBoomCard({
  nextEpochMs,
  nowEpochMs,
}: {
  nextEpochMs?: number;
  nowEpochMs?: number;
}) {
  const { t } = useTranslation();
  const [now, setNow] = useState(() => nowEpochMs ?? Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (nextEpochMs === undefined || nextEpochMs - now <= 0) {
    return (
      <GradientCard colors={GRADIENT} style={styles.card}>
        <AppText variant="small" style={styles.placeholder}>
          {t('components.nextBoomCard.calculating')}
        </AppText>
      </GradientCard>
    );
  }

  const remaining = nextEpochMs - now;

  return (
    <GradientCard colors={GRADIENT} style={styles.card}>
      <View style={styles.header}>
        <AppText variant="small" style={styles.eyebrow}>{t('components.nextBoomCard.title')}</AppText>
        <Badge color={Colors.accent} bg={`${Colors.accent}1F`}>{t('components.nextBoomCard.boom')}</Badge>
      </View>
      <AppText variant="title" style={styles.countdown}>{getTimeText(remaining)}</AppText>
      <AppText variant="small" style={styles.caption}>
        {t('components.nextBoomCard.launchAt', { time: formatClock(nextEpochMs) })}
      </AppText>
    </GradientCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: Spacing.lg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  eyebrow: { color: Colors.textMuted, fontWeight: '700', letterSpacing: 1 },
  countdown: { color: Colors.accent, letterSpacing: 1, fontVariant: ['tabular-nums'] },
  caption: { color: Colors.textMuted, marginTop: Spacing.xs },
  placeholder: { color: Colors.textMuted },
});
