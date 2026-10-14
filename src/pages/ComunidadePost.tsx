import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { PostCard } from "@/components/community/social/PostCard";
import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/hooks/useAuth";
import {
  deletePost, fetchLikedPostIds, fetchPost, fetchProfiles, toggleLike,
} from "@/lib/communitySocial";
import type { CommunityPost, UserProfile } from "@/lib/types";

export default function ComunidadePost() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [author, setAuthor] = useState<UserProfile | undefined>();
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!postId) return;
      setLoading(true);
      try {
        const p = await fetchPost(postId);
        if (!active) return;
        setPost(p);
        if (p) {
          const profs = await fetchProfiles([p.author_id]);
          if (active) setAuthor(profs[p.author_id]);
          if (user?.id) {
            const set = await fetchLikedPostIds(user.id, [p.id]);
            if (active) setLiked(set.has(p.id));
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [postId, user?.id]);

  const onToggleLike = async (id: string, isLiked: boolean) => {
    if (!user) return;
    setLiked(!isLiked);
    setPost((prev) => (prev ? { ...prev, like_count: Math.max(0, prev.like_count + (isLiked ? -1 : 1)) } : prev));
    try {
      await toggleLike(id, user.id, isLiked);
    } catch {
      toast.error(t("social.postError"));
    }
  };

  const onDeletePost = async (id: string) => {
    try {
      await deletePost(id);
      navigate("/comunidade", { replace: true });
    } catch {
      toast.error(t("social.postError"));
    }
  };

  return (
    <Layout noFooter>
      <section className="pt-6 pb-24">
        <div className="container mx-auto max-w-2xl px-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("common.back")}
          </button>

          {loading ? (
            <div className="flex justify-center py-24">
              <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : !post ? (
            <p className="py-24 text-center text-sm text-muted-foreground">{t("social.postNotFound")}</p>
          ) : (
            <PostCard
              post={post}
              author={author}
              meId={user?.id ?? null}
              liked={liked}
              onToggleLike={onToggleLike}
              onDeletePost={onDeletePost}
              onOpenProfile={(id) => navigate(`/comunidade/user/${id}`)}
            />
          )}
        </div>
      </section>
    </Layout>
  );
}
