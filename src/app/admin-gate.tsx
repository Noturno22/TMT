import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AppButton, AppInput, AppText } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/core/theme';
import { isAdminEmail } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { ACCESS_CODE, unlockAdmin } from '@/lib/adminGate';
import { useTranslation } from 'react-i18next';

export default function AdminGateScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!user || !isAdminEmail(user.email)) {
    return (
      <View style={styles.bg}>
        <LinearGradient
          colors={['rgba(7,7,15,0.50)', 'rgba(6,6,14,0.72)', 'rgba(4,4,10,0.94)']}
          style={StyleSheet.absoluteFill}>
          <Image
            source={require('@/assets/images/bg-login.png')}
            style={styles.bgLogo}
            resizeMode="contain"
          />
          <View pointerEvents="none" style={styles.aura} />
          <SafeAreaView style={styles.safe}>
            <View style={styles.restricted}>
              <Ionicons name="lock-closed" size={44} color={Colors.textMuted} />
              <AppText variant="h1" style={{ textAlign: 'center' }}>{t('admin.restrictedTitle')}</AppText>
              <AppText variant="muted" style={{ textAlign: 'center' }}>{t('admin.restrictedDesc')}</AppText>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  }

  const submit = () => {
    setError(null);
    if (code.trim() === ACCESS_CODE) {
      setBusy(true);
      unlockAdmin();
      router.replace('/admin');
      return;
    }
    setCode('');
    setError(t('admin.gateWrong'));
  };

  return (
    <View style={styles.bg}>
      <LinearGradient
        colors={['rgba(7,7,15,0.50)', 'rgba(6,6,14,0.72)', 'rgba(4,4,10,0.94)']}
        style={StyleSheet.absoluteFill}>
        <Image
          source={require('@/assets/images/bg-login.png')}
          style={styles.bgLogo}
          resizeMode="contain"
        />
        <View pointerEvents="none" style={styles.aura} />
        <SafeAreaView style={styles.safe}>
          <View style={styles.wrap}>
            <View style={styles.iconWrap}>
              <Ionicons name="shield-checkmark" size={34} color={Colors.accent} />
            </View>
            <AppText variant="h1" style={styles.title}>{t('admin.gateTitle')}</AppText>
            <AppText variant="muted" style={styles.subtitle}>{t('admin.gateSubtitle')}</AppText>

            <AppInput
              label={t('admin.gateCodeLabel')}
              value={code}
              onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
              placeholder="••••••"
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
              autoFocus
              onSubmitEditing={submit}
              icon={<Ionicons name="keypad-outline" size={18} color={Colors.textMuted} />}
            />

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={Colors.destructive} />
                <AppText style={styles.errorText}>{error}</AppText>
              </View>
            ) : null}

            <AppButton title={t('admin.gateCta')} loading={busy} style={styles.cta} onPress={submit} />
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: '#070710',
  },
  bgLogo: {
    ...StyleSheet.absoluteFill,
    width: undefined,
    height: undefined,
  },
  safe: { flex: 1 },
  aura: {
    position: 'absolute',
    top: -160,
    alignSelf: 'center',
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: 'rgba(22,164,58,0.09)',
  },
  restricted: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    padding: Spacing.xl,
  },
  wrap: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingBottom: 120,
    gap: Spacing.md,
  },
  iconWrap: {
    alignSelf: 'center',
    width: 76,
    height: 76,
    borderRadius: 26,
    backgroundColor: `${Colors.accent}18`,
    borderColor: `${Colors.accent}40`,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center', paddingHorizontal: Spacing.md, marginBottom: Spacing.md },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: `${Colors.destructive}12`,
    borderColor: `${Colors.destructive}35`,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  errorText: { color: Colors.destructive, flex: 1, fontSize: 13 },
  cta: { minHeight: 54, borderRadius: Radius.lg, marginTop: Spacing.sm },
});
