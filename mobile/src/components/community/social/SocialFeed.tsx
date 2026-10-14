import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText, Chip, EmptyState, Spinner } from '@/components/ui';
import { PostCard } from '@/components/community/social/PostCard';
import { PostComposer } from '@/components/community/social/PostComposer';
import {
  deletePost,
  fetchFeed,
  fetchLikedPostIds,
  NETWORKS,
  toggleLike,
} from '@/core/communitySocial';
import { subscribeToChanges } from '@/lib/realtime';
import { Radius, Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { useProfiles } from '@/hooks/useProfiles';
import { useSubscription } from '@/hooks/useSubscription';
import { isAdminEmail } from '@/lib/supabase';
import type { CommunityPost, SocialNetwork } from '@/core/types';

export function SocialFeed({ onOpenProfile }: { onOpenProfile: (userId: string) => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { user } = useAuth();
  const { profiles, refresh: refreshProfiles } = useProfiles();
  const { isPremium, loading: subLoading } = useSubscription();
  const canPost = isPremium || isAdminEmail(user?.email ?? undefined);

  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<SocialNetwork | null>(null);
  const [composing, setComposing] = useState(false);

  const meId = user?.id ?? null;
  const loadRef = useRef<() => void>(() => {});

  const load = useCallback(async () => {
    try {
      const list = await fetchFeed({ network: filter ?? undefined });
      setPosts(list);
      if (meId) {
        setLiked(await fetchLikedPostIds(meId, list.map((p) => p.id)));
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [filter, meId]);

  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  useEffect(() => {
    const cleanup = subscribeToChanges('social-feed', [
      { table: 'community_posts', onEvent: () => loadRef.current() },
      { table: 'post_likes', onEvent: () => loadRef.current() },
      { table: 'post_comments', onEvent: () => loadRef.current() },
    ]);
    return cleanup;
  }, []);

  const onToggleLike = async (postId: string, isLiked: boolean) => {
    if (!meId) {
      Alert.alert(t('social.loginToPost'));
      return;
    }
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
      load();
    }
  };

  const onDeletePost = async (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    try {
      await deletePost(postId);
    } catch {
      load();
    }
  };

  const afterPost = useCallback(() => {
    setComposing(false);
    refreshProfiles();
    load();
  }, [load, refreshProfiles]);

  return (
    <View style={styles.wrap}>
      {meId ? (
        subLoading ? null : canPost ? (
          composing ? (
            <PostComposer userId={meId} onPosted={afterPost} onCancel={() => setComposing(false)} />
          ) : (
            <View style={styles.composeTrigger}>
              <AppText
                variant="muted"
                style={styles.composePlaceholder}
                onPress={() => setComposing(true)}>
                {t('social.composerPlaceholder')}
              </AppText>
            </View>
          )
        ) : (
          <View style={styles.lockedBox}>
            <AppText variant="muted" style={styles.lockedText}>
              {t('social.postPremiumOnly')}
            </AppText>
          </View>
        )
      ) : null}

      <View style={styles.filters}>
        <Chip label={t('social.filterAll')} active={filter === null} onPress={() => setFilter(null)} />
        {NETWORKS.map((n) => (
          <Chip
            key={n.id}
            label={n.label.split(' ')[0]}
            active={filter === n.id}
            onPress={() => setFilter(filter === n.id ? null : n.id)}
          />
        ))}
      </View>

      {loading ? (
        <Spinner />
      ) : posts.length === 0 ? (
        <EmptyState title={t('social.emptyFeed')} subtitle={t('social.emptyFeedHint')} />
      ) : (
        posts.map((p) => (
          <PostCard
            key={p.id}
            post={p}
            author={profiles[p.author_id]}
            meId={meId}
            liked={liked.has(p.id)}
            onToggleLike={onToggleLike}
            onDeletePost={onDeletePost}
            onOpenProfile={onOpenProfile}
          />
        ))
      )}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    wrap: { gap: Spacing.md },
    composeTrigger: {
      backgroundColor: c.surface,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: Spacing.md,
      paddingVertical: 13,
    },
    composePlaceholder: { color: c.textMuted },
    lockedBox: {
      backgroundColor: c.surface,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: Radius.lg,
      padding: Spacing.md,
    },
    lockedText: { textAlign: 'center' },
    filters: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  });
