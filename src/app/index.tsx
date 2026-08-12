import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppButton, AppText } from '@/components/ui';
import { Colors } from '@/core/theme';
import { useAuth } from '@/hooks/useAuth';

export default function SplashScreen() {
  const router = useRouter();
  const { user, initializing } = useAuth();
  const [opacity] = useState(() => new Animated.Value(0));
  const [scale] = useState(() => new Animated.Value(0.8));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(
      () => router.replace(user ? '/(tabs)/inicio' : '/(auth)/login'),
      2500,
    );
    return () => clearTimeout(timer);
  }, [opacity, scale, router, user]);

  if (initializing) return <LinearGradient colors={['#0A0A14', '#0D0D1A']} style={styles.container} />;

  return (
    <LinearGradient colors={['#0A0A14', '#0D0D1A']} style={styles.container}>
      <View style={styles.content}>
        <View style={styles.glow}>
          <Animated.View style={{ opacity, transform: [{ scale }] }}>
            <Ionicons name="sparkles" size={72} color={Colors.primary} />
          </Animated.View>
        </View>

        <Animated.Text style={[styles.logo, { opacity, transform: [{ scale }] }]}>
          THE MAGIC TRADER
        </Animated.Text>
        <AppText variant="muted" style={styles.tagline}>
          Análise inteligente. Entradas estratégicas.
        </AppText>

        <View style={styles.cta}>
          <AppButton title="Começar" style={styles.button} onPress={() => router.replace('/(auth)/registro')} />
          <AppText
            variant="small"
            style={styles.link}
            onPress={() => router.replace('/(auth)/login')}>
            Já tenho conta? Entrar
          </AppText>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  glow: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(22,164,58,0.10)',
    marginBottom: 24,
  },
  logo: {
    color: Colors.text,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 1,
  },
  tagline: { textAlign: 'center', marginTop: 12 },
  cta: {
    width: '100%',
    alignItems: 'center',
    marginTop: 40,
  },
  button: { width: '70%', alignSelf: 'center' },
  link: { color: Colors.secondary, marginTop: 16 },
});
