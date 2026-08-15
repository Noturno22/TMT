import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { usePathname, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/core/theme';
import { useAuth } from '@/hooks/useAuth';

const HIDDEN_PREFIXES = ['/(auth)', '/login', '/whatsapp', '/suporte-ia'];

export function AiFab() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuth();
  const pathname = usePathname();

  if (!user) return null;
  if (pathname === '/' || HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <Pressable
        onPress={() => router.push('/suporte-ia')}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        accessibilityRole="button"
        accessibilityLabel={t('components.aiFab.label')}>
        <LinearGradient
          colors={[Colors.primary, 'rgba(22,164,58,0.6)']}
          style={StyleSheet.absoluteFill}
        />
        <Ionicons name="sparkles" size={24} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 16,
    bottom: 100,
    zIndex: 50,
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  fabPressed: { opacity: 0.85, transform: [{ scale: 0.96 }] },
});
