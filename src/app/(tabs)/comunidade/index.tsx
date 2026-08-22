import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { AppButton, AppText, Chip, EmptyState, Screen, Spinner } from '@/components/ui';
import { ChannelRow } from '@/components/community/ChannelRow';
import { ChannelPickerModal } from '@/components/community/ChannelPickerModal';
import { CommunityFeed } from '@/components/community/CommunityFeed';
import { DmRow } from '@/components/community/DmRow';
import { PairRoomRow } from '@/components/community/PairRoomRow';
import { WorkspaceSection } from '@/components/community/WorkspaceSection';
import { useChannels } from '@/hooks/useChannels';
import { useConversations } from '@/hooks/useConversations';
import { useProfiles } from '@/hooks/useProfiles';
import { useQuickCamera } from '@/hooks/useQuickCamera';
import { useSubscription } from '@/hooks/useSubscription';
import { isAdminEmail } from '@/lib/supabase';
import { useTourTarget } from '@/components/tour/registry';
import { Colors, Radius, Spacing } from '@/core/theme';
import type { Channel } from '@/core/types';

type Tab = 'feed' | 'workspace';

export default function ComunidadeScreen() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('workspace');

  const channels = useChannels();
  const conversations = useConversations();
  const profiles = useProfiles();
  const { user, isPremium } = useSubscription();
  const camera = useQuickCamera();

  const canCreateChannel = isAdminEmail(user?.email) || isPremium;
  const searchRef = useTourTarget('tour:comunidade-search');

  const openChannel = (channel: Channel) => {
    if (channel.is_premium && !isPremium) return;
    router.push({
      pathname: '/comunidade/canais/[channelId]',
      params: { channelId: channel.id },
    });
  };

  const openDm = (conversationId: string) => {
    router.push({
      pathname: '/comunidade/dm/[conversationId]',
      params: { conversationId },
    });
  };

  const openProfile = (userId: string) => {
    router.push({ pathname: '/comunidade/user/[userId]', params: { userId } });
  };

  return (
    <Screen safeTop>
      <View ref={searchRef} collapsable={false} style={styles.headerRow}>
        <Pressable onPress={() => router.push('/comunidade/pesquisa')} style={styles.searchBar}>
          <Ionicons name="search" size={18} color={Colors.textMuted} />
          <AppText variant="muted" style={styles.searchText}>{t('workspace.searchPlaceholder')}</AppText>
        </Pressable>
        <Pressable onPress={camera.openCamera} style={styles.cameraBtn}>
          <Ionicons name="camera-outline" size={22} color={Colors.accent} />
        </Pressable>
        <Pressable onPress={() => router.push('/comunidade/loja')} style={styles.cameraBtn}>
          <Ionicons name="storefront-outline" size={22} color={Colors.accent} />
        </Pressable>
      </View>

      <View style={styles.segment}>
        <Chip
          label={t('workspace.segmented')}
          active={tab === 'workspace'}
          onPress={() => setTab('workspace')}
        />
        <Chip label={t('workspace.feed')} active={tab === 'feed'} onPress={() => setTab('feed')} />
      </View>

      {tab === 'feed' ? (
        <CommunityFeed />
      ) : (
        <>
          {channels.error ? (
            <View style={styles.banner}>
              <AppText variant="small" style={{ color: Colors.destructive, flex: 1 }}>
                {t('comunidade.errorTitle')}
              </AppText>
              <AppButton
                title={t('workspace.retry')}
                onPress={channels.refresh}
                disabled={channels.loading}
              />
            </View>
          ) : null}

          {channels.loading ? (
            <Spinner label={t('workspace.loading')} />
          ) : (
            <>
              <WorkspaceSection
                title={t('workspace.channels')}
                right={
                  canCreateChannel ? (
                    <Ionicons
                      name="add-circle-outline"
                      size={22}
                      color={Colors.primary}
                      onPress={() => router.push('/comunidade/novo-canal')}
                    />
                  ) : undefined
                }
              >
                {channels.regular.length === 0 ? (
                  <EmptyState title={t('workspace.emptyChannels')} />
                ) : (
                  channels.regular.map((c) => (
                    <ChannelRow key={c.id} channel={c} onPress={() => openChannel(c)} />
                  ))
                )}
              </WorkspaceSection>

              <WorkspaceSection title={t('workspace.pairRooms')}>
                {channels.pairRooms.length === 0 ? (
                  <EmptyState title={t('workspace.emptyPairRooms')} />
                ) : (
                  channels.pairRooms.map((c) => (
                    <PairRoomRow key={c.id} channel={c} onPress={() => openChannel(c)} />
                  ))
                )}
              </WorkspaceSection>

              <WorkspaceSection
                title={t('workspace.dms')}
                right={
                  isPremium ? (
                    <Ionicons
                      name="create-outline"
                      size={20}
                      color={Colors.primary}
                      onPress={() => router.push('/comunidade/novo-dm')}
                    />
                  ) : undefined
                }
              >
                {conversations.loading ? (
                  <Spinner label={t('workspace.loading')} />
                ) : conversations.dms.length === 0 ? (
                  <EmptyState title={t('workspace.emptyDms')} />
                ) : (
                  conversations.dms.map((dm) => (
                    <DmRow
                      key={dm.conversationId}
                      dm={dm}
                      profiles={profiles.profiles}
                      onPress={() => openDm(dm.conversationId)}
                      onOpenProfile={openProfile}
                    />
                  ))
                )}
              </WorkspaceSection>
            </>
          )}
        </>
      )}

      <ChannelPickerModal
        visible={camera.pickChannel}
        channels={camera.availableChannels}
        onSelect={camera.sendToChannel}
        onCancel={camera.cancel}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  cameraBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchText: { color: Colors.textMuted },
  segment: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: `${Colors.destructive}1F`,
    borderRadius: 8,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
});
