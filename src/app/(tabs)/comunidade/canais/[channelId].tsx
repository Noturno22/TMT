import { StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppText, Screen } from '@/components/ui';
import { Composer } from '@/components/community/Composer';
import { MessageList } from '@/components/community/MessageList';
import { useAuth } from '@/hooks/useAuth';
import { useChannels } from '@/hooks/useChannels';
import { useMessages } from '@/hooks/useMessages';
import { useProfiles } from '@/hooks/useProfiles';
import { Colors } from '@/core/theme';

export default function ChannelScreen() {
  const { channelId } = useLocalSearchParams<{ channelId: string }>();
  const { t } = useTranslation();
  const { user } = useAuth();
  const channels = useChannels();
  const profiles = useProfiles();

  const channel = channels.regular.find((c) => c.id === channelId);
  const messages = useMessages({ channelId });

  return (
    <Screen scroll={false}>
      <Stack.Screen options={{ title: channel?.display_name || '#' }} />
      <View style={styles.container}>
        <MessageList
          messages={messages.messages}
          reactions={messages.reactions}
          profiles={profiles.profiles}
          currentUserId={user?.id ?? null}
          hasOlder={messages.hasOlder}
          loadingOlder={messages.loadingOlder}
          error={messages.error}
          onLoadOlder={messages.loadOlder}
          onToggleReaction={messages.toggleReaction}
          onRetry={messages.retry}
          onDelete={(message) => messages.softDelete(message.id)}
          onReload={messages.refresh}
        />
        <Composer onSend={(text, imageUrl) => messages.send(text, imageUrl)} />
      </View>
      {!channel && !channels.loading ? (
        <AppText style={styles.missing}>{t('workspace.emptyChannels')}</AppText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  missing: { position: 'absolute', bottom: 0, left: 16, right: 16, color: Colors.textMuted },
});
