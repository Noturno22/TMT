import { useEffect, useState } from 'react';
import { Animated, Easing, ImageBackground, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AppButton, AppText } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/core/theme';
import { signInWithGoogle } from '@/lib/googleAuth';
import { useAuth } from '@/hooks/useAuth';

const WA_GREEN = '#25D366';

const fadeSlide = (value: Animated.Value, fromY = 24) => ({
  opacity: value,
  transform: [
    {
      translateY: value.interpolate({ inputRange: [0, 1], outputRange: [fromY, 0] }),
    },
  ],
});

export default function LoginScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { oauthError } = useLocalSearchParams<{ oauthError?: string }>();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(oauthError ?? null);

  const [brandAnim] = useState(() => new Animated.Value(0));
  const [formAnim] = useState(() => new Animated.Value(0));
  const [footerAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.stagger(120, [
      Animated.timing(brandAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(formAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(footerAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [brandAnim, formAnim, footerAnim]);

  useEffect(() => {
    if (user) router.replace('/(tabs)/inicio');
  }, [user, router]);

  if (user) return null;

  const loginGoogle = async () => {
    setGoogleLoading(true);
    setError(null);
    const { error } = await signInWithGoogle();
    setGoogleLoading(false);
    if (error) setError(error);
  };

  return (
    <ImageBackground
      source={require('@/assets/images/bg-login.png')}
      style={styles.bg}
      resizeMode="cover">
      <LinearGradient
        colors={['rgba(7,7,15,0.55)', 'rgba(5,5,13,0.78)', 'rgba(5,5,13,0.92)']}
        style={styles.bg}>
        <View pointerEvents="none" style={styles.aura} />
        <View pointerEvents="none" style={styles.auraBottom} />
        <SafeAreaView style={styles.safe}>
          <View style={styles.container}>
            <Animated.View style={[styles.brand, fadeSlide(brandAnim, 30)]}>
              <View style={styles.logoGlow}>
                <Ionicons name="sparkles" size={52} color={Colors.primary} />
              </View>
              <AppText variant="title" style={styles.logo}>The Magic Trader</AppText>
              <AppText variant="muted" style={styles.tagline}>
                Análise inteligente. Entradas estratégicas.
              </AppText>
            </Animated.View>

            <Animated.View style={[styles.formCard, fadeSlide(formAnim)]}>
              {error ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={18} color={Colors.destructive} />
                  <AppText style={styles.errorText}>{error}</AppText>
                </View>
              ) : null}

              <AppButton
                title="Continuar com Google"
                variant="outline"
                loading={googleLoading}
                onPress={loginGoogle}
                icon={
                  <View style={styles.googleBadge}>
                    <AppText style={styles.googleG}>G</AppText>
                  </View>
                }
              />
              <AppButton
                title="Entrar com WhatsApp"
                variant="outline"
                onPress={() => router.push('/(auth)/whatsapp')}
                icon={
                  <View style={styles.waBadge}>
                    <Ionicons name="logo-whatsapp" size={18} color={WA_GREEN} />
                  </View>
                }
              />
            </Animated.View>

            <Animated.View style={[styles.footer, fadeSlide(footerAnim, 24)]}>
              <AppText variant="small" style={styles.legal}>
                Ao continuar aceitas os nossos{' '}
                <AppText
                  variant="small"
                  style={{ color: Colors.primary, fontWeight: '700' }}
                  onPress={() => router.push('/termos')}>
                  Termos
                </AppText>{' '}
                e a nossa{' '}
                <AppText
                  variant="small"
                  style={{ color: Colors.primary, fontWeight: '700' }}
                  onPress={() => router.push('/privacidade')}>
                  Política de Privacidade
                </AppText>
                .
              </AppText>
            </Animated.View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  safe: { flex: 1 },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: Spacing.lg },
  aura: {
    position: 'absolute',
    top: -160,
    alignSelf: 'center',
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: 'rgba(22,164,58,0.08)',
  },
  auraBottom: {
    position: 'absolute',
    bottom: -200,
    alignSelf: 'center',
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: 'rgba(255,201,21,0.04)',
  },
  brand: { gap: Spacing.sm, alignItems: 'center' },
  logoGlow: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: 'rgba(22,164,58,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(22,164,58,0.25)',
    marginBottom: Spacing.sm,
  },
  logo: { color: Colors.text, letterSpacing: 0.5 },
  tagline: { textAlign: 'center' },
  formCard: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(239,68,68,0.10)',
    borderColor: 'rgba(239,68,68,0.35)',
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  errorText: { color: Colors.destructive, flex: 1, fontSize: 13 },
  googleBadge: {
    width: 20,
    height: 20,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleG: { color: Colors.destructive, fontSize: 14, fontWeight: '800' },
  waBadge: {
    width: 20,
    height: 20,
    borderRadius: 5,
    backgroundColor: '#0B141A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: { alignItems: 'center' },
  legal: { color: Colors.textMuted, textAlign: 'center', paddingHorizontal: Spacing.md },
});
