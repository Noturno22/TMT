import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { getOAuthErrorParams } from '@/lib/googleAuth';

export default function SplashScreen() {
  const router = useRouter();
  const { user, initializing } = useAuth();
  const [oauthError] = useState(() => getOAuthErrorParams().error);
  const [animationDone, setAnimationDone] = useState(false);
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
    ]).start(() => setAnimationDone(true));
    return () => {
      opacity.stopAnimation();
      scale.stopAnimation();
    };
  }, [opacity, scale]);

  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(() => router.replace('/(tabs)/inicio'), 300);
    return () => clearTimeout(timer);
  }, [user, router]);

  useEffect(() => {
    if (initializing || user || !animationDone) return;
    const timer = setTimeout(
      () => router.replace({ pathname: '/(auth)/login', params: oauthError ? { oauthError } : {} }),
      600,
    );
    return () => clearTimeout(timer);
  }, [animationDone, initializing, user, router, oauthError]);

  return (
    <View style={styles.container}>
      <Animated.Image
        source={require('@/assets/images/bg-splash.png')}
        style={[styles.bg, { opacity, transform: [{ scale }] }]}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A14' },
  bg: { width: '100%', height: '100%' },
});
