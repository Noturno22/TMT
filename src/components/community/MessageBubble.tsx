import { Alert, Image, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppText, Badge } from '@/components/ui';
import { REACTION_EMOJIS } from '@/core/community';
import { timeAgo } from '@/core/format';
import { Colors, Radius, Spacing } from '@/core/theme';
import type { Message, MessageReaction, UserProfile } from '@/core/types';

export function MessageBubble({
  message,
  reactions,
  profile,
  currentUserId,
  onToggleReaction,
  onRetry,
  onDelete,
}: {
  message: Message;
  reactions: MessageReaction[];
  profile?: UserProfile;
  currentUserId: string | null;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onRetry: (message: Message) => void;
  onDelete: (message: Message) => void;
}) {
  const { t } = useTranslation();
  const isOwn = message.user_id === currentUserId;
  const name = profile?.display_name || t('common.trader');
  const avatarColor = profile?.role === 'admin' ? Colors.accent : Colors.primary;

  const grouped = new Map<string, { count: number; mine: boolean }>();
  for (const r of reactions) {
    const g = grouped.get(r.emoji) || { count: 0, mine: false };
    g.count += 1;
    if (r.user_id === currentUserId) g.mine = true;
    grouped.set(r.emoji, g);
  }

  const onLongPress = () => {
    if (!isOwn) return;
    Alert.alert(
      t('workspace.deleteTitle'),
      t('workspace.deleteBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('workspace.deleteMessage'), style: 'destructive', onPress: () => onDelete(message) },
      ],
    );
  };

  const onAddReaction = () => {
    Alert.alert(
      t('workspace.react'),
      undefined,
      [
        ...REACTION_EMOJIS.map((emoji) => ({
          text: emoji,
          onPress: () => onToggleReaction(message.id, emoji),
        })),
        { text: t('common.cancel'), style: 'cancel' },
      ],
    );
  };

  return (
    <View style={[styles.row, isOwn && styles.rowOwn]}>
      {!isOwn ? (
        <View style={[styles.avatar, { backgroundColor: `${avatarColor}2E` }]}>
          <AppText variant="small" style={{ color: avatarColor, fontWeight: '800' }}>
            {(name || 'T')[0].toUpperCase()}
          </AppText>
        </View>
      ) : null}

      <Pressable onLongPress={onLongPress} style={[styles.bubble, isOwn && styles.bubbleOwn]}>
        <View style={styles.meta}>
          {!isOwn ? (
            <AppText variant="small" style={styles.name}>{name}</AppText>
          ) : null}
          {profile?.role === 'admin' ? (
            <Badge color={Colors.accent} bg={`${Colors.accent}1F`}>{t('workspace.bot')}</Badge>
          ) : null}
          <AppText variant="small" style={styles.time}>{timeAgo(message.created_at)}</AppText>
        </View>

        {message.image_url ? (
          <Image source={{ uri: message.image_url }} style={styles.image} resizeMode="cover" />
        ) : null}
        {message.text ? <AppText>{message.text}</AppText> : null}

        {message.failed ? (
          <Pressable onPress={() => onRetry(message)} style={styles.failedRow}>
            <Ionicons name="refresh" size={14} color={Colors.destructive} />
            <AppText variant="small" style={{ color: Colors.destructive, fontWeight: '600' }}>
              {t('workspace.failed')} — {t('workspace.retry')}
            </AppText>
          </Pressable>
        ) : message.pending ? (
          <AppText variant="small" style={{ color: Colors.textFaint }}>{t('workspace.loading')}</AppText>
        ) : null}

        <View style={styles.reactions}>
          {[...grouped.entries()].map(([emoji, g]) => (
            <Pressable
              key={emoji}
              onPress={() => onToggleReaction(message.id, emoji)}
              style={[styles.reactionChip, g.mine && styles.reactionMine]}
            >
              <AppText variant="small">{emoji} {g.count}</AppText>
            </Pressable>
          ))}
          <Pressable onPress={onAddReaction} style={styles.reactionAdd}>
            <Ionicons name="add" size={12} color={Colors.textMuted} />
          </Pressable>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  rowOwn: { justifyContent: 'flex-end' },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  bubble: {
    flexShrink: 1,
    maxWidth: '82%',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  bubbleOwn: { backgroundColor: Colors.surface },
  meta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  name: { fontWeight: '700', flex: 1 },
  time: { color: Colors.textMuted },
  image: { width: 200, height: 140, borderRadius: Radius.sm },
  failedRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  reactions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, alignItems: 'center' },
  reactionChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: `${Colors.primary}1F`,
  },
  reactionMine: { backgroundColor: `${Colors.primary}4D` },
  reactionAdd: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
