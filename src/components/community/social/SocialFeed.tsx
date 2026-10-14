import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Newspaper } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { PostCard } from "@/components/community/social/PostCard";
import { PostComposer } from "@/components/community/social/PostComposer";
import { useAuth } from "@/hooks/useAuth";
import { useProfiles } from "@/hooks/useProfiles";
import { useSubscription } from "@/hooks/useSubscription";
import { isAdminEmail } from "@/lib/admin";
import { NETWORKS, fetchFeed, fetchLikedPostIds, fetchProfiles, toggleLike, deletePost } from "@/lib/communitySocial";
import { subscribeToChanges } from "@/lib/realtime";
import type { CommunityPost, SocialNetwork, UserProfile } from "@/lib/types";

type FeedFilter = "all" | SocialNetwork;

export function SocialFeed({ onOpenProfile }: { onOpenProfile: (userId: string) => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { profiles } = useProfiles();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [authors, setAuthors] = useState<Record<string, UserProfile>>({});
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FeedFilter>("all");

  const meId = user?.id ?? null;
  const { isPremium, loading: subLoading } = useSubscription();
  const canPost = isPremium || isAdminEmail(user?.email);

  const load = useCallback(async () => {
    try {
      const list = await fetchFeed({ network: filter === "all" ? undefined : filter });
      setPosts(list);
      const fetched = await fetchProfiles(list.map((p) => p.author_id));
      setAuthors(fetched);
      if (meId && list.length) setLiked(await fetchLikedPostIds(meId, list.map((p) => p.id)));
      else setLiked(new Set());
    } catch {
      toast.error(t("social.postError"));
    } finally {
      setLoading(false);
    }
  }, [filter, meId, t]);

  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => loadRef.current(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const cleanup = subscribeToChanges("community-social", [
      { table: "community_posts", onEvent: () => loadRef.current() },
      { table: "post_likes", onEvent: () => loadRef.current() },
      { table: "post_comments", onEvent: () => loadRef.current() },
    ]);
    return cleanup;
  }, []);

  const mergedAuthors = useMemo(() => ({ ...authors, ...profiles }), [authors, profiles]);

  const onToggleLike = async (postId: string, isLiked: boolean) => {
    if (!meId) { toast.error(t("social.loginToPost")); return; }
    setLiked((prev) => {
      const next = new Set(prev);
      if (isLiked) next.delete(postId);
      else next.add(postId);
      return next;
    });
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, like_count: Math.max(0, p.like_count + (isLiked ? -1 : 1)) } : p,
      ),
    );
    try {
      await toggleLike(postId, meId, isLiked);
    } catch {
      toast.error(t("social.postError"));
      load();
    }
  };

  const onDeletePost = async (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    try {
      await deletePost(postId);
    } catch {
      toast.error(t("social.postError"));
      load();
    }
  };

  const onCreated = (post: CommunityPost) => {
    if (filter !== "all" && post.network !== filter) return;
    setPosts((prev) => [post, ...prev]);
  };

  return (
    <div>
      {meId ? (
        subLoading ? null : canPost ? (
          <PostComposer meId={meId} profile={mergedAuthors[meId]} onCreated={onCreated} />
        ) : (
          <div className="mb-5 rounded-3xl border border-border bg-card/80 p-4 text-center text-sm text-muted-foreground">
            {t("social.postPremiumOnly")}
          </div>
        )
      ) : (
        <div className="mb-5 rounded-3xl border border-border bg-card/80 p-4 text-center text-sm text-muted-foreground">
          {t("social.loginToPost")}
        </div>
      )}

      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {(["all", ...NETWORKS.map((n) => n.id)] as FeedFilter[]).map((key) => {
          const active = filter === key;
          const label = key === "all" ? t("social.filterAll") : NETWORKS.find((n) => n.id === key)?.label;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-4 py-24">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : posts.length === 0 ? (
        <div className="py-24 text-center">
          <Newspaper className="mx-auto mb-4 h-16 w-16 text-muted-foreground opacity-20" />
          <h3 className="mb-2 font-display text-lg font-semibold">{t("social.emptyFeed")}</h3>
          <p className="text-sm text-muted-foreground">{t("social.emptyFeedHint")}</p>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              author={mergedAuthors[post.author_id]}
              meId={meId}
              liked={liked.has(post.id)}
              onToggleLike={onToggleLike}
              onDeletePost={onDeletePost}
              onOpenProfile={onOpenProfile}
            />
          ))}
        </motion.div>
      )}
    </div>
  );
}
