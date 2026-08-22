import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText } from '@/components/ui';
import {
  formatClosesIn,
  pairRoomClosesInMs,
  pairRoomState,
} from '@/core/community';
import { Colors, Radius, Spacing } from '@/core/theme';
import type { Channel } from '@/core/types';

export function PairRoomCard({
  channel,
  index = 0,
  onPress,
}: {
  channel: Channel;
  index?: number;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const [, tick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const active = pairRoomState(channel) === 'active';
  const closesIn = formatClosesIn(pairRoomClosesInMs(channel));
  const pair = channel.pair || channel.display_name;

  return (
    <Animated.View entering={FadeInUp.delay(index * 60).springify()}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
        <LinearGradient
          colors={
            active
              ? ['rgba(48,209,88,0.20)', 'rgba(22,164,58,0.06)']
              : ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']
          }
          style={styles.tile}>
          <AppText style={[styles.tileIcon, !active && styles.tileIconMuted]}>🤖</AppText>
        </LinearGradient>

        <View style={styles.info}>
          <View style={styles.titleRow}>
            <AppText numberOfLines={1} style={styles.pair}>
              {pair}
            </AppText>
            {channel.is_premium ? (
              <View style={styles.crownChip}>
                <Ionicons name="diamond" size={9} color={Colors.accent} />
                <AppText variant="small" style={styles.crownText}>PRO</AppText>
              </View>
            ) : null}
          </View>

          {active ? (
            <View style={styles.statusRow}>
              <View style={styles.liveDot} />
              <AppText variant="small" style={styles.liveText}>
                {t('workspace.liveBadge')}
              </AppText>
              <AppText variant="small" style={styles.dotSep}>·</AppText>
              <AppText variant="small" style={styles.timer} numberOfLines={1}>
                {t('workspace.closesIn', { time: closesIn })}
              </AppText>
            </View>
          ) : (
            <View style={styles.statusRow}>
              <Ionicons name="lock-closed" size={11} color={Colors.textFaint} />
              <AppText variant="small" style={styles.closedText}>
                {t('workspace.closed')}
              </AppText>
            </View>
          )}
        </View>

        <View style={[styles.enterChip, !active && styles.enterChipMuted]}>
          <AppText variant="small" style={active ? styles.enterText : styles.enterTextMuted}>
            {t('workspace.enterRoom')}
          </AppText>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.sm + 2,
  },
  pressed: { backgroundColor: Colors.surfaceElevated, transform: [{ scale: 0.99 }] },
  tile: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileIcon: { fontSize: 19 },
  tileIconMuted: { opacity: 0.45 },
  info: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pair: { color: Colors.text, fontWeight: '800', flexShrink: 1 },
  crownChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: `${Colors.accent}1A`,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  crownText: { color: Colors.accent, fontWeight: '800', fontSize: 9, letterSpacing: 0.5 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.live,
  },
  liveText: { color: Colors.live, fontWeight: '800' },
  dotSep: { color: Colors.textFaint },
  timer: { color: Colors.textMuted, flexShrink: 1 },
  closedText: { color: Colors.textFaint },
  enterChip: {
    backgroundColor: Colors.primaryDim,
    borderColor: `${Colors.primary}55`,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  enterChipMuted: { backgroundColor: Colors.surfaceElevated, borderColor: Colors.border },
  enterText: { color: Colors.primary, fontWeight: '700' },
  enterTextMuted: { color: Colors.textFaint },
});
