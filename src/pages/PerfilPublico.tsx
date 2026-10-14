import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, Crown, UserPlus, UserCheck } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { PostCard } from "@/components/community/social/PostCard";
import { UserAvatar } from "@/components/community/UserAvatar";
import { Layout } from "@/components/layout/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useProfiles } from "@/hooks/useProfiles";
import {
  BOT_USER_ID, findOrCreateConversation, isUserOnline,
} from "@/lib/community";
import {
  deletePost, fetchFeed, fetchLikedPostIds, follow, isFollowing, toggleLike, unfollow,
} from "@/lib/communitySocial";
import { timeAgo } from "@/lib/format";
import { supabase } from "@/lib/supabaseClient";
import type { CommunityPost } from "@/lib/types";

export default function PerfilPublico() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { profiles, loading } = useProfiles();
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [starting, setStarting] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [postsLoading, setPostsLoading] = useState(true);

  const profile = userId ? profiles[userId] : undefined;
  const isOwn = userId === user?.id;

  useEffect(() => {
    let mounted = true;
    (async () => {
      setIsPremium(null);
      if (!userId) return;
      try {
        const { data } = await supabase.rpc("is_premium", { uid: userId });
        if (mounted) setIsPremium(data === true);
      } catch {
        if (mounted) setIsPremium(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [userId]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!userId) return;
      setPostsLoading(true);
      try {
        const list = await fetchFeed({ authorId: userId });
        if (!active) return;
        setPosts(list);
        if (user?.id && list.length) {
          setLiked(await fetchLikedPostIds(user.id, list.map((p) => p.id)));
        }
      } catch {
        // ignore
      } finally {
        if (active) setPostsLoading(false);
      }
    })();
    return () => { active = false; };
  }, [userId, user?.id]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!user?.id || !userId || user.id === userId) { setFollowing(false); return; }
      if (active) setFollowing(await isFollowing(user.id, userId));
    })();
    return () => { active = false; };
  }, [user?.id, userId]);

  const toggleFollow = useCallback(async () => {
    if (!user?.id || !userId) return;
    setFollowBusy(true);
    const next = !following;
    setFollowing(next);
    try {
      if (next) await follow(user.id, userId);
      else await unfollow(user.id, userId);
    } catch {
      setFollowing(!next);
      toast.error(t("common.error"));
    } finally {
      setFollowBusy(false);
    }
  }, [user?.id, userId, following, t]);

  const openDm = useCallback(async () => {
    if (!user || !userId || profile?.role === "admin") return;
    setStarting(true);
    try {
      const conversationId = await findOrCreateConversation(user.id, userId);
      navigate(`/comunidade/dm/${conversationId}`, { replace: true });
    } catch {
      setStarting(false);
      toast.error(t("common.error"), { description: t("workspace.failed") });
    }
  }, [user, userId, profile?.role, navigate, t]);

  const onToggleLike = async (postId: string, isLiked: boolean) => {
    if (!user) return;
    setLiked((prev) => {
      const next = new Set(prev);
      if (isLiked) next.delete(postId); else next.add(postId);
      return next;
    });
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, like_count: Math.max(0, p.like_count + (isLiked ? -1 : 1)) } : p)),
    );
    try {
      await toggleLike(postId, user.id, isLiked);
    } catch {
      toast.error(t("social.postError"));
    }
  };

  const onDeletePost = async (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    try {
      await deletePost(postId);
    } catch {
      toast.error(t("social.postError"));
    }
  };

  if (loading && !profile) {
    return (
      <Layout noFooter>
        <section className="flex items-center justify-center gap-3 py-24">
          <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        </section>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout noFooter>
        <section className="py-24 text-center">
          <p className="text-sm text-muted-foreground">{t("userProfile.notFound")}</p>
        </section>
      </Layout>
    );
  }

  const canDm = !isOwn && profile.role !== "admin" && profile.user_id !== BOT_USER_ID;
  const online = isUserOnline(profile);

  return (
    <Layout noFooter>
      <section className="pt-6 pb-24">
        <div className="container mx-auto max-w-2xl px-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("common.back")}
          </button>

          <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-6 text-center">
            <UserAvatar
              name={profile.display_name}
              avatarUrl={profile.avatar_url}
              role={profile.role}
              size={84}
            />
            <div className="flex items-center gap-2">
              <h1 className="font-display text-xl font-bold">{profile.display_name}</h1>
              {profile.is_verified ? <BadgeCheck className="h-5 w-5 text-primary" /> : null}
              {profile.role === "admin" ? (
                <Badge className="border-amber-400/30 bg-amber-400/10 text-amber-400">{t("userProfile.admin")}</Badge>
              ) : null}
            </div>

            {profile.username ? (
              <span className="text-sm text-muted-foreground">@{profile.username}</span>
            ) : null}

            {profile.bio ? (
              <p className="max-w-md text-sm text-muted-foreground">{profile.bio}</p>
            ) : null}

            {online ? (
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {t("userProfile.online")}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">
                {t("userProfile.lastSeenAgo", { time: timeAgo(profile.last_seen_at || profile.created_at) })}
              </span>
            )}

            <div className="mt-2 flex items-center gap-5 text-sm">
              <span><b className="font-bold">{profile.posts_count ?? 0}</b> <span className="text-muted-foreground">{t("social.postsCount")}</span></span>
              <span><b className="font-bold">{profile.followers_count ?? 0}</b> <span className="text-muted-foreground">{t("social.followers")}</span></span>
              <span><b className="font-bold">{profile.following_count ?? 0}</b> <span className="text-muted-foreground">{t("social.followingCount")}</span></span>
            </div>

            <span className="text-xs text-muted-foreground">
              {t("userProfile.memberSince", { date: new Date(profile.created_at).toLocaleDateString() })}
            </span>

            <div className="mt-2">
              {isPremium ? (
                <Badge className="border-amber-400/30 bg-amber-400/10 text-amber-400">
                  <Crown className="mr-1 h-3 w-3" />
                  {t("userProfile.premium")}
                </Badge>
              ) : (
                <Badge className="border-border bg-muted/50 text-muted-foreground">{t("userProfile.freePlan")}</Badge>
              )}
            </div>

            {!isOwn ? (
              <div className="mt-3 flex w-full gap-2">
                <Button
                  variant={following ? "outline" : "default"}
                  className="flex-1"
                  onClick={toggleFollow}
                  disabled={followBusy}
                >
                  {following ? <UserCheck className="mr-1.5 h-4 w-4" /> : <UserPlus className="mr-1.5 h-4 w-4" />}
                  {following ? t("social.following") : t("social.follow")}
                </Button>
                {canDm ? (
                  <Button className="flex-1" variant="secondary" onClick={openDm} disabled={starting}>
                    {starting ? t("common.loading") : t("userProfile.sendMessage")}
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="mt-6">
            {postsLoading ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            ) : posts.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">{t("social.noPosts")}</p>
            ) : (
              posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  author={profile}
                  meId={user?.id ?? null}
                  liked={liked.has(post.id)}
                  onToggleLike={onToggleLike}
                  onDeletePost={onDeletePost}
                  onOpenProfile={() => {}}
                />
              ))
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
}
