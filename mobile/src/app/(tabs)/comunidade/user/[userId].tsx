import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { AppButton, AppText, Badge, EmptyState, Spinner } from '@/components/ui';
import { UserAvatar } from '@/components/community/UserAvatar';
import { PostCard } from '@/components/community/social/PostCard';
import { BOT_USER_ID, isUserOnline } from '@/core/community';
import {
  deletePost,
  fetchFeed,
  fetchLikedPostIds,
  follow,
  isFollowing,
  toggleLike,
  unfollow,
} from '@/core/communitySocial';
import { timeAgo } from '@/core/format';
import { Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { useProfiles } from '@/hooks/useProfiles';
import { findOrCreateConversation } from '@/lib/community';
import { supabase } from '@/lib/supabase';
import type { CommunityPost } from '@/core/types';

export default function UserProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { t } = useTranslation();
  const { user } = useAuth();
  const { profiles, loading } = useProfiles();
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [starting, setStarting] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [liked, setLiked] = useState<Set<string>>(new Set());

  const profile = userId ? profiles[userId] : undefined;
  const isOwn = userId === user?.id;
  const meId = user?.id ?? null;

  useEffect(() => {
    let mounted = true;
    (async () => {
      setIsPremium(null);
      if (!userId) return;
      try {
        const { data } = await supabase.rpc('is_premium', { uid: userId });
        if (mounted) setIsPremium(data === true);
      } catch {
        if (mounted) setIsPremium(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [userId]);

  const loadPosts = useCallback(async () => {
    if (!userId) return;
    try {
      const list = await fetchFeed({ authorId: userId });
      setPosts(list);
      if (meId) setLiked(await fetchLikedPostIds(meId, list.map((p) => p.id)));
    } catch {
      // ignore
    }
  }, [userId, meId]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    let active = true;
    if (!userId || !meId || isOwn) {
      setFollowing(false);
      return;
    }
    isFollowing(meId, userId).then((v) => {
      if (active) setFollowing(v);
    });
    return () => {
      active = false;
    };
  }, [userId, meId, isOwn]);

  const toggleFollow = useCallback(async () => {
    if (!meId || !userId) {
      Alert.alert(t('social.loginToPost'));
      return;
    }
    const next = !following;
    setFollowing(next);
    setFollowBusy(true);
    try {
      if (next) await follow(meId, userId);
      else await unfollow(meId, userId);
    } catch {
      setFollowing(!next);
    } finally {
      setFollowBusy(false);
    }
  }, [meId, userId, following, t]);

  const onToggleLike = async (postId: string, isLiked: boolean) => {
    if (!meId) return;
    const next = new Set(liked);
    if (isLiked) next.delete(postId);
    else next.add(postId);
    setLiked(next);
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, like_count: p.like_count + (isLiked ? -1 : 1) } : p)),
    );
    try {
      await toggleLike(postId, meId, isLiked);
    } catch {
      loadPosts();
    }
  };

  const onDeletePost = async (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    try {
      await deletePost(postId);
    } catch {
      loadPosts();
    }
  };

  const openDm = useCallback(async () => {
    if (!user || !userId || profile?.role === 'admin') return;
    setStarting(true);
    try {
      const conversationId = await findOrCreateConversation(user.id, userId);
      router.replace({
        pathname: '/comunidade/dm/[conversationId]',
        params: { conversationId },
      });
    } catch {
      setStarting(false);
      Alert.alert(t('comunidade.errorTitle'), t('workspace.failed'));
    }
  }, [user, userId, profile?.role, t]);

  if (loading && !profile) {
    return (
      <View style={{ flex: 1 }}>
        <Stack.Screen options={{ title: t('userProfile.title') }} />
        <Spinner label={t('workspace.loading')} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={{ flex: 1 }}>
        <Stack.Screen options={{ title: t('userProfile.title') }} />
        <EmptyState title={t('userProfile.notFound')} />
      </View>
    );
  }

  const canDm = !isOwn && profile.role !== 'admin' && profile.user_id !== BOT_USER_ID;
  const online = isUserOnline(profile);

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: t('userProfile.title') }} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <UserAvatar
            name={profile.display_name}
            avatarUrl={profile.avatar_url}
            role={profile.role}
            size={84}
          />
          <View style={styles.nameRow}>
            <AppText variant="h1">{profile.display_name}</AppText>
            {profile.is_verified ? (
              <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
            ) : null}
            {profile.role === 'admin' ? (
              <Badge color={colors.accent} bg={`${colors.accent}20`}>{t('userProfile.admin')}</Badge>
            ) : null}
          </View>

          {profile.username ? (
            <AppText variant="small" style={{ color: colors.textFaint }}>@{profile.username}</AppText>
          ) : null}

          {online ? (
            <View style={styles.statusRow}>
              <View style={styles.onlineDot} />
              <AppText variant="muted">{t('userProfile.online')}</AppText>
            </View>
          ) : (
            <AppText variant="muted" style={styles.lastSeen}>
              {t('userProfile.lastSeenAgo', {
                time: timeAgo(profile.last_seen_at || profile.created_at),
              })}
            </AppText>
          )}

          {profile.bio ? <AppText style={styles.bio}>{profile.bio}</AppText> : null}

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <AppText variant="h2">{profile.posts_count ?? posts.length}</AppText>
              <AppText variant="small" style={{ color: colors.textMuted }}>{t('social.posts')}</AppText>
            </View>
            <View style={styles.stat}>
              <AppText variant="h2">{profile.followers_count ?? 0}</AppText>
              <AppText variant="small" style={{ color: colors.textMuted }}>{t('social.followers')}</AppText>
            </View>
            <View style={styles.stat}>
              <AppText variant="h2">{profile.following_count ?? 0}</AppText>
              <AppText variant="small" style={{ color: colors.textMuted }}>{t('social.following')}</AppText>
            </View>
          </View>

          <AppText variant="small" style={styles.memberSince}>
            {t('userProfile.memberSince', {
              date: new Date(profile.created_at).toLocaleDateString(),
            })}
          </AppText>

          <View style={styles.badgeWrap}>
            {isPremium ? (
              <Badge color={colors.accent} bg={`${colors.accent}20`}>{t('userProfile.premium')}</Badge>
            ) : (
              <Badge color={colors.textMuted} bg={`${colors.textMuted}20`}>{t('userProfile.freePlan')}</Badge>
            )}
          </View>

          {!isOwn ? (
            <AppButton
              title={following ? t('social.following') : t('social.follow')}
              variant={following ? 'outline' : 'primary'}
              onPress={toggleFollow}
              loading={followBusy}
              style={styles.dmButton}
            />
          ) : null}

          {canDm ? (
            <AppButton
              title={t('userProfile.sendMessage')}
              onPress={openDm}
              loading={starting}
              variant={isOwn ? 'primary' : 'secondary'}
              style={styles.dmButton}
            />
          ) : null}
        </View>

        <View style={styles.postsWrap}>
          {posts.length === 0 ? (
            <EmptyState title={t('social.noPosts')} />
          ) : (
            posts.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                author={profile}
                meId={meId}
                liked={liked.has(p.id)}
                onToggleLike={onToggleLike}
                onDeletePost={onDeletePost}
                onOpenProfile={() => {}}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  scroll: { paddingBottom: Spacing.xl * 2 },
  card: {
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.lg,
    marginTop: Spacing.md,
    marginHorizontal: Spacing.md,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  onlineDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.success,
  },
  lastSeen: { textAlign: 'center' },
  bio: { textAlign: 'center', marginTop: Spacing.sm },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.xl,
    marginTop: Spacing.md,
  },
  stat: { alignItems: 'center', minWidth: 64 },
  memberSince: { color: colors.textFaint },
  badgeWrap: { marginTop: Spacing.sm },
  dmButton: { alignSelf: 'stretch', marginTop: Spacing.md },
  postsWrap: { marginHorizontal: Spacing.md, marginTop: Spacing.md },
});
