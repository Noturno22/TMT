import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { AppButton, AppText, Chip, EmptyState, Screen, Spinner } from '@/components/ui';
import { ChannelRow } from '@/components/community/ChannelRow';
import { CommunityFeed } from '@/components/community/CommunityFeed';
import { DmRow } from '@/components/community/DmRow';
import { PairRoomRow } from '@/components/community/PairRoomRow';
import { WorkspaceSection } from '@/components/community/WorkspaceSection';
import { useChannels } from '@/hooks/useChannels';
import { useConversations } from '@/hooks/useConversations';
import { useProfiles } from '@/hooks/useProfiles';
import { Colors, Spacing } from '@/core/theme';
import type { Channel } from '@/core/types';

type Tab = 'feed' | 'workspace';

export default function ComunidadeScreen() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('workspace');

  const channels = useChannels();
  const conversations = useConversations();
  const profiles = useProfiles();

  const openChannel = (channel: Channel) => {
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

  return (
    <Screen>
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
              <WorkspaceSection title={t('workspace.channels')}>
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
                  <Ionicons
                    name="create-outline"
                    size={20}
                    color={Colors.primary}
                    onPress={() => router.push('/comunidade/novo-dm')}
                  />
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
                    />
                  ))
                )}
              </WorkspaceSection>
            </>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
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
