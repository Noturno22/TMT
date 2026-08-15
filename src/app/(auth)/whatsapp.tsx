import { useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AppButton, AppInput, AppText } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/core/theme';
import { useAuth } from '@/hooks/useAuth';

const WA_GREEN = '#25D366';

export default function WhatsappScreen() {
  const router = useRouter();
  const { user, signInTest } = useAuth();

  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [anim]);

  useEffect(() => {
    if (user) router.replace('/(tabs)/inicio');
  }, [user, router]);

  if (user) return null;

  const normalizedPhone = () => phone.replace(/\D/g, '');

  const enterTest = async () => {
    const digits = normalizedPhone();
    if (digits.length < 8 || digits.length > 15) {
      setError('Introduz um número de WhatsApp válido com o código do país.');
      return;
    }
    setLoading(true);
    setError(null);
    await signInTest(`+${digits}`);
  };

  const fadeSlide = {
    opacity: anim,
    transform: [
      {
        translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }),
      },
    ],
  };

  return (
    <LinearGradient colors={['#07070F', '#0A0A14', '#05050D']} style={styles.bg}>
      <View pointerEvents="none" style={styles.aura} />
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.container}>
          <Animated.View style={[styles.header, fadeSlide]}>
            <Pressable
              onPress={() => router.back()}
              hitSlop={10}
              style={styles.back}
              accessibilityRole="button"
              accessibilityLabel="Voltar">
              <Ionicons name="arrow-back" size={22} color={Colors.textMuted} />
            </Pressable>
            <View style={styles.logoGlow}>
              <Ionicons name="logo-whatsapp" size={44} color={WA_GREEN} />
            </View>
            <AppText variant="title" style={styles.logo}>Entrar com WhatsApp</AppText>
            <AppText variant="muted" style={styles.tagline}>
              Modo de teste — introduz o número e entra de imediato, sem código.
            </AppText>
          </Animated.View>

          <Animated.View style={[styles.formCard, fadeSlide]}>
            <View style={styles.testBadge}>
              <Ionicons name="flask" size={14} color={WA_GREEN} />
              <AppText variant="small" style={styles.testBadgeText}>
                MODO TESTE · login imediato sem SMS
              </AppText>
            </View>

            <AppInput
              label="NÚMERO DE WHATSAPP"
              value={phone}
              onChangeText={setPhone}
              placeholder="+244 9xx xxx xxx"
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              returnKeyType="done"
              onSubmitEditing={enterTest}
              icon={<Ionicons name="call-outline" size={18} color={Colors.textMuted} />}
            />

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={Colors.destructive} />
                <AppText style={styles.errorText}>{error}</AppText>
              </View>
            ) : null}

            <AppButton
              title="Entrar na app"
              onPress={enterTest}
              loading={loading}
              icon={<Ionicons name="log-in-outline" size={18} color="#FFFFFF" />}
            />
          </Animated.View>

          <Animated.View style={[styles.footer, fadeSlide]}>
            <AppText variant="small" style={styles.legal}>
              Ao continuar aceitas os nossos{' '}
              <AppText
                variant="small"
                style={{ color: Colors.primary }}
                onPress={() => router.push('/termos')}>
                Termos
              </AppText>{' '}
              e a nossa{' '}
              <AppText
                variant="small"
                style={{ color: Colors.primary }}
                onPress={() => router.push('/privacidade')}>
                Política de Privacidade
              </AppText>
              .
            </AppText>
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
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
    backgroundColor: 'rgba(37,211,102,0.06)',
  },
  header: { gap: Spacing.sm, alignItems: 'center' },
  back: {
    position: 'absolute',
    top: 0,
    left: 0,
    padding: Spacing.xs,
  },
  logoGlow: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(37,211,102,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(37,211,102,0.30)',
    marginBottom: Spacing.sm,
  },
  logo: { color: Colors.text, letterSpacing: 0.5, textAlign: 'center' },
  tagline: { textAlign: 'center' },
  formCard: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  testBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(37,211,102,0.08)',
    borderColor: 'rgba(37,211,102,0.25)',
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
  },
  testBadgeText: { color: WA_GREEN, fontWeight: '700', letterSpacing: 0.3 },
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
  footer: { alignItems: 'center' },
  legal: { color: Colors.textMuted, textAlign: 'center', paddingHorizontal: Spacing.md },
});
