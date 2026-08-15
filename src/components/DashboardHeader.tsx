import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppText, Badge } from '@/components/ui';
import { avatarLetter, displayName } from '@/core/format';
import { Colors, Spacing } from '@/core/theme';
import { useAuth } from '@/hooks/useAuth';

export function DashboardHeader({ isPremium }: { isPremium: boolean }) {
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuth();
  const firstName = (displayName(user) || t('common.trader')).split(' ')[0];
  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? t('components.dashboardHeader.morning')
      : hour < 20
        ? t('components.dashboardHeader.afternoon')
        : t('components.dashboardHeader.evening');

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
          <AppText variant="h2">{t('components.dashboardHeader.appName')}</AppText>
        </View>
      </View>
      <View style={styles.right}>
        {isPremium ? (
          <Badge color={Colors.accent} bg={`${Colors.accent}1F`}>{t('components.dashboardHeader.pro')}</Badge>
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
