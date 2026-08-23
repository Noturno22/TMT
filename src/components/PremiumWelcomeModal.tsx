import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppButton, AppText } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/core/theme';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';

const SEEN_PREFIX = 'premium_welcome_seen_';

function Perk({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.perk}>
      <View style={styles.perkIcon}>
        <Ionicons name={icon} size={13} color={Colors.accent} />
      </View>
      <AppText variant="small" style={styles.perkLabel}>{label}</AppText>
    </View>
  );
}

/**
 * Celebração mostrada uma única vez por período quando o utilizador passa
 * de free para premium, com CTAs para configurar a Banca ou explorar sinais.
 */
export function PremiumWelcomeModal() {
  const { user } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const { isPremium, subscription, loading } = useSubscription();
  const [visible, setVisible] = useState(false);
  const prevPremium = useRef<boolean | null>(null);

  useEffect(() => {
    if (loading) return;
    const was = prevPremium.current;
    prevPremium.current = isPremium;
    if (was !== false || !isPremium || !user) return;

    const period = subscription?.current_period_end ?? 'none';
    let cancelled = false;
    (async () => {
      try {
        const seen = await AsyncStorage.getItem(`${SEEN_PREFIX}${period}`);
        if (!seen && !cancelled) setVisible(true);
      } catch {
        if (!cancelled) setVisible(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isPremium, loading, subscription, user]);

  const close = () => {
    setVisible(false);
    const period = subscription?.current_period_end ?? 'none';
    AsyncStorage.setItem(`${SEEN_PREFIX}${period}`, new Date().toISOString()).catch(() => {});
  };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.overlay} onPress={close}>
        <Pressable style={styles.card} onPress={() => {}}>
          <LinearGradient
            colors={['rgba(240,185,43,0.14)', 'rgba(22,164,58,0.10)']}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View style={styles.iconWrap}>
            <Ionicons name="trophy" size={30} color={Colors.accent} />
          </View>
          <AppText variant="h2" style={styles.title}>{t('premiumWelcome.title')}</AppText>
          <AppText variant="body" style={styles.body}>{t('premiumWelcome.body')}</AppText>
          <View style={styles.perks}>
            <Perk icon="wallet" label={t('premiumWelcome.perkBank')} />
            <Perk icon="infinite" label={t('premiumWelcome.perkSignals')} />
            <Perk icon="people" label={t('premiumWelcome.perkChannels')} />
            <Perk icon="storefront" label={t('premiumWelcome.perkStore')} />
          </View>
          <AppButton
            title={t('premiumWelcome.ctaBank')}
            variant="gold"
            onPress={() => {
              close();
              router.push('/banca');
            }}
            style={styles.cta}
          />
          <AppButton title={t('premiumWelcome.ctaExplore')} variant="ghost" onPress={close} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    overflow: 'hidden',
    alignItems: 'center',
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${Colors.accent}1F`,
    marginBottom: Spacing.md,
  },
  title: {
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  body: {
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  perks: {
    alignSelf: 'stretch',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  perk: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  perkIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${Colors.accent}1A`,
  },
  perkLabel: {
    flex: 1,
    color: Colors.textBody,
  },
  cta: {
    alignSelf: 'stretch',
    marginBottom: Spacing.sm,
  },
});
