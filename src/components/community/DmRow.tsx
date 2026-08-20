import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/ui';
import { UserAvatar } from '@/components/community/UserAvatar';
import { isUserOnline } from '@/core/community';
import { Spacing } from '@/core/theme';
import type { UserProfile } from '@/core/types';
import type { DmSummary } from '@/hooks/useConversations';

export function DmRow({
  dm,
  profiles,
  onPress,
  onOpenProfile,
}: {
  dm: DmSummary;
  profiles: Record<string, UserProfile>;
  onPress: () => void;
  onOpenProfile?: (userId: string) => void;
}) {
  const { t } = useTranslation();
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const profile = profiles[dm.memberId];
  const name = profile?.display_name || t('common.trader');

  return (
    <Pressable onPress={onPress} style={styles.row}>
      <UserAvatar
        name={name}
        avatarUrl={profile?.avatar_url}
        role={profile?.role}
        online={isUserOnline(profile)}
        onPress={onOpenProfile ? () => onOpenProfile(dm.memberId) : undefined}
      />
      <AppText style={{ fontWeight: '600' }}>{name}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 8 },
});
