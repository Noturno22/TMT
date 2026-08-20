import { StyleSheet, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppText, Screen } from '@/components/ui';
import { Composer } from '@/components/community/Composer';
import { MessageList } from '@/components/community/MessageList';
import { useAuth } from '@/hooks/useAuth';
import { useConversations } from '@/hooks/useConversations';
import { useMessages } from '@/hooks/useMessages';
import { useProfiles } from '@/hooks/useProfiles';
import { Colors } from '@/core/theme';

export default function DmScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const { t } = useTranslation();
  const { user } = useAuth();
  const conversations = useConversations();
  const profiles = useProfiles();

  const dm = conversations.dms.find((d) => d.conversationId === conversationId);
  const messages = useMessages({ conversationId });

  const otherName = dm ? profiles.profiles[dm.memberId]?.display_name : undefined;

  const openProfile = (userId: string) => {
    router.push({ pathname: '/comunidade/user/[userId]', params: { userId } });
  };

  return (
    <Screen scroll={false}>
      <Stack.Screen options={{ title: otherName || '…' }} />
      <View style={styles.container}>
        <MessageList
          messages={messages.messages}
          reactions={messages.reactions}
          mentionsByMessage={messages.mentionsByMessage}
          profiles={profiles.profiles}
          currentUserId={user?.id ?? null}
          hasOlder={messages.hasOlder}
          loadingOlder={messages.loadingOlder}
          error={messages.error}
          onLoadOlder={messages.loadOlder}
          onToggleReaction={messages.toggleReaction}
          onRetry={messages.retry}
          onDelete={(message) => messages.softDelete(message.id)}
          onEdit={(message, text) => messages.edit(message, text)}
          onReload={messages.refresh}
          onOpenProfile={openProfile}
        />
        <Composer
          onSend={(text, imageUrl, mentionIds) => messages.send(text, imageUrl, mentionIds)}
          profiles={profiles.profiles}
          currentUserId={user?.id ?? null}
        />
      </View>
      {!dm && !conversations.loading ? (
        <AppText style={styles.missing}>{t('workspace.emptyDms')}</AppText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  missing: { position: 'absolute', bottom: 0, left: 16, right: 16, color: Colors.textMuted },
});
