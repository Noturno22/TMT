import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AppText, Badge } from '@/components/ui';
import { avatarLetter, displayName } from '@/core/format';
import { Colors, Spacing } from '@/core/theme';
import { useAuth } from '@/hooks/useAuth';

export function DashboardHeader({ isPremium }: { isPremium: boolean }) {
  const router = useRouter();
  const { user } = useAuth();
  const firstName = (displayName(user) || 'Trader').split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 20 ? 'Boa tarde' : 'Boa noite';

  return (
    <View style={styles.row}>
      <View style={styles.userWrap}>
        <View style={styles.avatar}>
          <AppText style={styles.avatarText}>{avatarLetter(user)}</AppText>
        </View>
        <View style={styles.textWrap}>
          <AppText variant="small" style={styles.greeting}>
            {greeting}{user ? `, ${firstName}` : ''}
          </AppText>
          <AppText variant="h2">The Magic Trader</AppText>
        </View>
      </View>
      <View style={styles.right}>
        {isPremium ? (
          <Badge color={Colors.accent} bg={`${Colors.accent}1F`}>PRO</Badge>
        ) : null}
        <Pressable hitSlop={8} onPress={() => router.push('/notificacoes')}>
          <Ionicons name="notifications" size={20} color={Colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  userWrap: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryDim,
    borderColor: Colors.primary,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: Colors.text, fontWeight: '800', fontSize: 16 },
  textWrap: { gap: 1 },
  greeting: { color: Colors.textMuted },
  right: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
});
