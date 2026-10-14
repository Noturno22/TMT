import { useEffect, useState } from 'react';
import { Alert, Image, Linking, Pressable, Share, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppText, AppInput } from '@/components/ui';
import { UserAvatar } from '@/components/community/UserAvatar';
import { NetworkEmbed } from '@/components/community/social/NetworkEmbed';
import {
  addComment, deleteComment, deletePost, fetchComments, fetchProfiles, NETWORK_BY_ID, toggleLike,
} from '@/core/communitySocial';
import { timeAgo } from '@/core/format';
import { Radius, Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { isAdminEmail } from '@/lib/supabase';
import type { CommunityPost, PostComment, PostMedia, UserProfile } from '@/core/types';

function MediaBlock({ media }: { media: PostMedia[] }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  if (!media || media.length === 0) return null;
  return (
    <View style={styles.mediaWrap}>
      {media.map((m, i) => {
        if (m.type === 'image') {
          return <Image key={i} source={{ uri: m.url }} style={styles.mediaImage} resizeMode="cover" />;
        }
        return (
          <Pressable key={i} style={styles.mediaOther} onPress={() => Linking.openURL(m.url)}>
            <Ionicons name={m.type === 'video' ? 'videocam-outline' : 'musical-notes-outline'} size={20} color={colors.textMuted} />
            <AppText variant="small" style={{ color: colors.textMuted }}>
              {t('social.media')}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

function VisibilityIcon({ visibility, color }: { visibility: CommunityPost['visibility']; color: string }) {
  const name = visibility === 'private' ? 'lock-closed-outline' : visibility === 'followers' ? 'people-outline' : 'globe-outline';
  return <Ionicons name={name} size={12} color={color} />;
}

export function PostCard({
  post,
  author,
  meId,
  liked,
  onToggleLike,
  onDeletePost,
  onOpenProfile,
}: {
  post: CommunityPost;
  author?: UserProfile;
  meId: string | null;
  liked: boolean;
  onToggleLike: (postId: string, liked: boolean) => void;
  onDeletePost: (postId: string) => void;
  onOpenProfile: (userId: string) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentProfiles, setCommentProfiles] = useState<Record<string, UserProfile>>({});
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const canComment = isPremium || isAdminEmail(user?.email ?? undefined);
  const isOwn = meId === post.author_id;
  const name = author?.display_name || t('common.trader');
  const network = post.network ? NETWORK_BY_ID[post.network] : null;

  useEffect(() => {
    if (!showComments) return;
    let active = true;
    (async () => {
      const list = await fetchComments(post.id);
      if (!active) return;
      setComments(list);
      setCommentProfiles(await fetchProfiles(list.map((c) => c.user_id)));
    })();
    return () => { active = false; };
  }, [showComments, post.id]);

  const send = async () => {
    if (!meId) { Alert.alert(t('social.loginToPost')); return; }
    const value = text.trim();
    if (!value) return;
    setSending(true);
    try {
      const c = await addComment({ postId: post.id, userId: meId, content: value });
      setComments((prev) => [...prev, c]);
      setText('');
    } catch {
      Alert.alert(t('social.postError'));
    } finally {
      setSending(false);
    }
  };

  const removeComment = async (id: string) => {
    try {
      await deleteComment(id);
      setComments((prev) => prev.filter((c) => c.id !== id));
    } catch {
      Alert.alert(t('social.postError'));
    }
  };

  const share = async () => {
    try {
      await Share.share({ message: post.content || post.external_url || 'TMT' });
    } catch {
      // ignore
    }
  };

  const confirmDelete = () => {
    Alert.alert(t('social.deletePost'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('social.deletePost'), style: 'destructive', onPress: () => onDeletePost(post.id) },
    ]);
  };

  return (
    <View style={styles.card}>
      <View style={styles.headRow}>
        <UserAvatar name={name} avatarUrl={author?.avatar_url} role={author?.role} size={44} onPress={() => onOpenProfile(post.author_id)} />
        <View style={styles.headText}>
          <Pressable onPress={() => onOpenProfile(post.author_id)} style={styles.nameRow}>
            <AppText variant="label" numberOfLines={1}>{name}</AppText>
            {author?.is_verified ? <Ionicons name="checkmark-circle" size={15} color={colors.primary} /> : null}
            {author?.account_type === 'platform' ? (
              <View style={styles.tmtTag}><AppText variant="small" style={styles.tmtTagText}>TMT</AppText></View>
            ) : null}
            {network ? (
              <View style={[styles.netTag, { backgroundColor: `${network.color}22` }]}>
                <AppText variant="small" style={{ color: network.color, fontWeight: '800' }}>
                  {network.label.split(' ')[0]}
                </AppText>
              </View>
            ) : null}
          </Pressable>
          <View style={styles.metaRow}>
            <AppText variant="small" style={{ color: colors.textFaint }}>
              {author?.username ? `@${author.username}` : timeAgo(post.created_at)}
            </AppText>
            <VisibilityIcon visibility={post.visibility} color={colors.textFaint} />
          </View>
        </View>
        {isOwn ? (
          <Pressable onPress={confirmDelete} style={styles.menuBtn}>
            <Ionicons name="trash-outline" size={17} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {post.content ? <AppText style={styles.content}>{post.content}</AppText> : null}

      <MediaBlock media={post.media} />

      {post.kind === 'network' && post.embed ? (
        <NetworkEmbed
          link={{
            network: post.network ?? 'x',
            external_id: post.external_id,
            external_url: post.external_url ?? '',
            embed_url: (post.embed as { embed_url?: string }).embed_url ?? null,
          }}
        />
      ) : null}

      <View style={styles.actions}>
        <Pressable style={styles.actionBtn} onPress={() => onToggleLike(post.id, liked)}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={18} color={liked ? colors.destructive : colors.textMuted} />
          <AppText variant="small" style={{ color: liked ? colors.destructive : colors.textMuted, fontWeight: '700' }}>
            {post.like_count}
          </AppText>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={() => setShowComments((v) => !v)}>
          <Ionicons name="chatbubble-outline" size={17} color={colors.textMuted} />
          <AppText variant="small" style={{ color: colors.textMuted, fontWeight: '700' }}>{post.comment_count}</AppText>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={share}>
          <Ionicons name="share-social-outline" size={17} color={colors.textMuted} />
        </Pressable>
      </View>

      {showComments ? (
        <View style={styles.comments}>
          {comments.length === 0 ? (
            <AppText variant="small" style={{ color: colors.textFaint }}>{t('social.noComments')}</AppText>
          ) : (
            comments.map((c) => {
              const cp = commentProfiles[c.user_id];
              return (
                <View key={c.id} style={styles.commentRow}>
                  <UserAvatar name={cp?.display_name || 'T'} avatarUrl={cp?.avatar_url} role={cp?.role} size={26} />
                  <View style={styles.commentBody}>
                    <View style={styles.commentHead}>
                      <AppText variant="small" style={{ fontWeight: '700' }}>{cp?.display_name || t('common.trader')}</AppText>
                      <AppText variant="small" style={{ color: colors.textFaint }}>{timeAgo(c.created_at)}</AppText>
                      {c.user_id === meId ? (
                        <Pressable onPress={() => removeComment(c.id)}>
                          <Ionicons name="trash-outline" size={13} color={colors.destructive} />
                        </Pressable>
                      ) : null}
                    </View>
                    {c.content ? <AppText variant="small">{c.content}</AppText> : null}
                  </View>
                </View>
              );
            })
          )}
          {meId ? (
            canComment ? (
              <View style={styles.commentInputRow}>
                <View style={{ flex: 1 }}>
                  <AppInput
                    value={text}
                    onChangeText={setText}
                    placeholder={t('social.commentPlaceholder')}
                    onSubmitEditing={send}
                    returnKeyType="send"
                  />
                </View>
                <Pressable onPress={send} disabled={sending || !text.trim()} style={styles.sendBtn}>
                  <Ionicons name="send" size={16} color={colors.primary} />
                </Pressable>
              </View>
            ) : (
              <AppText variant="small" style={{ color: colors.textFaint }}>{t('social.commentPremiumOnly')}</AppText>
            )
          ) : (
            <AppText variant="small" style={{ color: colors.textFaint }}>{t('social.loginToPost')}</AppText>
          )}
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    card: {
      marginBottom: Spacing.md,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      padding: Spacing.md,
    },
    headRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
    headText: { flex: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
    tmtTag: { backgroundColor: `${c.accent}22`, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999 },
    tmtTagText: { color: c.accent, fontWeight: '800' },
    netTag: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 },
    menuBtn: { padding: 4 },
    content: { marginTop: Spacing.sm },
    mediaWrap: { marginTop: Spacing.sm, gap: Spacing.sm },
    mediaImage: { width: '100%', height: 220, borderRadius: Radius.lg, borderWidth: 1, borderColor: c.border },
    mediaOther: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      padding: Spacing.md,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: c.border,
    },
    actions: { flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.sm, borderTopWidth: 1, borderTopColor: c.border, paddingTop: Spacing.sm },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    comments: { marginTop: Spacing.sm, gap: Spacing.sm },
    commentRow: { flexDirection: 'row', gap: Spacing.sm },
    commentBody: { flex: 1, backgroundColor: `${c.surfaceElevated}88`, borderRadius: Radius.md, padding: Spacing.sm },
    commentHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 2 },
    commentInputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
    sendBtn: { padding: 10 },
  });
