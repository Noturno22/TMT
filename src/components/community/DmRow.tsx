import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/ui';
import { Colors, Spacing } from '@/core/theme';
import type { UserProfile } from '@/core/types';
import type { DmSummary } from '@/hooks/useConversations';

export function DmRow({
  dm,
  profiles,
  onPress,
}: {
  dm: DmSummary;
  profiles: Record<string, UserProfile>;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const name = profiles[dm.memberId]?.display_name || t('common.trader');
  const letter = (name || 'T')[0].toUpperCase();
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View style={[styles.avatar, { backgroundColor: `${Colors.primary}2E` }]}>
        <AppText variant="small" style={{ color: Colors.primary, fontWeight: '800' }}>
          {letter}
        </AppText>
      </View>
      <AppText style={{ fontWeight: '600' }}>{name}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 8 },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
