import { useState, type ReactNode } from 'react';
import { Alert, Image, Pressable, StyleSheet, TextInput, View, type AlertButton } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppButton, AppText, Badge } from '@/components/ui';
import { UserAvatar } from '@/components/community/UserAvatar';
import { isUserOnline, REACTION_EMOJIS } from '@/core/community';
import { timeAgo } from '@/core/format';
import { Colors, Radius, Spacing } from '@/core/theme';
import type { Message, MessageReaction, UserProfile } from '@/core/types';

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function renderMentionedText(text: string, mentionNames: string[]): ReactNode {
  if (mentionNames.length === 0) return <AppText>{text}</AppText>;
  const names = [...mentionNames].sort((a, b) => b.length - a.length);
  const pattern = new RegExp(`(${names.map((n) => `@${escapeRegex(n)}`).join('|')})`, 'g');
  const parts = text.split(pattern);
  const isMention = (part: string) => names.some((n) => part === `@${n}`);
  return (
    <AppText>
      {parts.map((part, i) =>
        isMention(part) ? (
          <AppText key={i} style={styles.mention}>
            {part}
          </AppText>
        ) : (
          <AppText key={i}>{part}</AppText>
        ),
      )}
    </AppText>
  );
}

export function MessageBubble({
  message,
  reactions,
  mentionNames = [],
  profile,
  currentUserId,
  onToggleReaction,
  onRetry,
  onDelete,
  onEdit,
  onOpenProfile,
}: {
  message: Message;
  reactions: MessageReaction[];
  mentionNames?: string[];
  profile?: UserProfile;
  currentUserId: string | null;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onRetry: (message: Message) => void;
  onDelete: (message: Message) => void;
  onEdit: (message: Message, text: string) => void;
  onOpenProfile?: (userId: string) => void;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const isOwn = message.user_id === currentUserId;
  const name = profile?.display_name || t('common.trader');
  const editable =
    isOwn && !message.boom_id && !message.pending && !message.failed;

  const openProfile = () => {
    if (onOpenProfile && profile) onOpenProfile(profile.user_id);
  };

  const grouped = new Map<string, { count: number; mine: boolean }>();
  for (const r of reactions) {
    const g = grouped.get(r.emoji) || { count: 0, mine: false };
    g.count += 1;
    if (r.user_id === currentUserId) g.mine = true;
    grouped.set(r.emoji, g);
  }

  const onLongPress = () => {
    if (!isOwn) return;
    const actions: AlertButton[] = [];
    if (editable) {
      actions.push({
        text: t('workspace.edit'),
        onPress: () => {
          setDraft(message.text);
          setEditing(true);
        },
      });
    }
    actions.push({
      text: t('workspace.deleteMessage'),
      style: 'destructive',
      onPress: () => onDelete(message),
    });
    Alert.alert(t('workspace.messageActions'), undefined, [
      ...actions,
      { text: t('common.cancel'), style: 'cancel' },
    ]);
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

  const cancelEdit = () => {
    setEditing(false);
    setDraft('');
  };

  const saveEdit = () => {
    if (!draft.trim()) return;
    onEdit(message, draft);
    setEditing(false);
    setDraft('');
  };

  return (
    <View style={[styles.row, isOwn && styles.rowOwn]}>
      {!isOwn ? (
        <UserAvatar
          name={name}
          avatarUrl={profile?.avatar_url}
          role={profile?.role}
          size={28}
          online={isUserOnline(profile)}
          onPress={onOpenProfile ? openProfile : undefined}
          style={styles.avatar}
        />
      ) : null}

      <Pressable
        onLongPress={onLongPress}
        style={[styles.bubble, isOwn && styles.bubbleOwn]}
      >
        <View style={styles.meta}>
          {!isOwn ? (
            <Pressable onPress={openProfile} disabled={!onOpenProfile} style={styles.name}>
              <AppText variant="small" style={styles.nameText}>{name}</AppText>
            </Pressable>
          ) : null}
          {profile?.role === 'admin' ? (
            <Badge color={Colors.accent} bg={`${Colors.accent}1F`}>{t('workspace.bot')}</Badge>
          ) : null}
          <AppText variant="small" style={styles.time}>{timeAgo(message.created_at)}</AppText>
          {message.edited_at ? (
            <AppText variant="small" style={styles.edited}>{t('workspace.edited')}</AppText>
          ) : null}
        </View>

        {message.image_url ? (
          <Image source={{ uri: message.image_url }} style={styles.image} resizeMode="cover" />
        ) : null}

        {editing ? (
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={t('workspace.editPlaceholder')}
            placeholderTextColor={Colors.textMuted}
            autoFocus
            multiline
            style={styles.editInput}
          />
        ) : message.text ? (
          renderMentionedText(message.text, mentionNames)
        ) : null}

        {editing ? (
          <View style={styles.editActions}>
            <AppButton
              title={t('workspace.save')}
              onPress={saveEdit}
              disabled={!draft.trim()}
              style={styles.editSave}
            />
            <AppButton
              title={t('common.cancel')}
              variant="ghost"
              onPress={cancelEdit}
              style={styles.editCancel}
            />
          </View>
        ) : null}

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
  name: { flex: 1 },
  nameText: { fontWeight: '700' },
  mention: { color: Colors.primary, fontWeight: '700' },
  time: { color: Colors.textMuted },
  edited: { color: Colors.textFaint, fontStyle: 'italic' },
  image: { width: 200, height: 140, borderRadius: Radius.sm },
  editInput: {
    backgroundColor: Colors.bg,
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: Colors.text,
    maxHeight: 120,
  },
  editActions: { flexDirection: 'row', gap: Spacing.sm },
  editSave: { paddingVertical: 6, paddingHorizontal: 16 },
  editCancel: { paddingVertical: 6, paddingHorizontal: 16 },
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
