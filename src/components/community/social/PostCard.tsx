import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BadgeCheck, Heart, Lock, MessageCircle, MoreHorizontal,
  Send, Share2, Trash2, Users, Globe,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { NetworkEmbed } from "@/components/community/social/NetworkEmbed";
import { UserAvatar } from "@/components/community/UserAvatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { isAdminEmail } from "@/lib/admin";
import {
  addComment, deleteComment, deletePost, fetchComments, fetchProfiles,
  toggleLike, NETWORK_BY_ID,
} from "@/lib/communitySocial";
import { timeAgo } from "@/lib/format";
import type { CommunityPost, PostComment, PostMedia, UserProfile } from "@/lib/types";

function MediaGrid({ media }: { media: PostMedia[] }) {
  if (!media || media.length === 0) return null;
  return (
    <div className={`mt-3 grid gap-2 ${media.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
      {media.map((m, i) => {
        if (m.type === "video") {
          return (
            <video key={i} src={m.url} controls className="w-full rounded-2xl border border-border" />
          );
        }
        if (m.type === "audio") {
          return <audio key={i} src={m.url} controls className="w-full" />;
        }
        return (
          <img
            key={i}
            src={m.url}
            alt=""
            className="w-full rounded-2xl border border-border object-cover"
            loading="lazy"
          />
        );
      })}
    </div>
  );
}

function VisibilityIcon({ visibility }: { visibility: CommunityPost["visibility"] }) {
  if (visibility === "private") return <Lock className="h-3.5 w-3.5" />;
  if (visibility === "followers") return <Users className="h-3.5 w-3.5" />;
  return <Globe className="h-3.5 w-3.5" />;
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
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const canComment = isPremium || isAdminEmail(user?.email);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentProfiles, setCommentProfiles] = useState<Record<string, UserProfile>>({});
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const isOwn = meId === post.author_id;
  const name = author?.display_name || "Trader";
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
    if (!meId) { toast.error(t("social.loginToPost")); return; }
    const value = text.trim();
    if (!value) return;
    setSending(true);
    try {
      const c = await addComment({ postId: post.id, userId: meId, content: value });
      setComments((prev) => [...prev, c]);
      setCommentProfiles((prev) => ({ ...prev, [meId]: author ?? prev[meId] }));
      setText("");
    } catch {
      toast.error(t("social.postError"));
    } finally {
      setSending(false);
    }
  };

  const removeComment = async (id: string) => {
    try {
      await deleteComment(id);
      setComments((prev) => prev.filter((c) => c.id !== id));
    } catch {
      toast.error(t("social.postError"));
    }
  };

  const share = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/comunidade/post/${post.id}`);
      toast.success(t("social.shareCopied"));
    } catch {
      toast.error(t("social.postError"));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 rounded-3xl border border-border bg-card/80 p-4 backdrop-blur-xl"
    >
      <div className="flex items-start gap-3">
        <UserAvatar
          name={name}
          avatarUrl={author?.avatar_url}
          role={author?.role}
          size={44}
          onPress={() => onOpenProfile(post.author_id)}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onOpenProfile(post.author_id)}
              className="truncate text-sm font-bold hover:underline"
            >
              {name}
            </button>
            {author?.is_verified ? <BadgeCheck className="h-4 w-4 shrink-0 text-primary" /> : null}
            {author?.account_type === "platform" ? (
              <span className="rounded-full bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
                TMT
              </span>
            ) : null}
            {network ? (
              <span
                className="ml-1 rounded-md px-1.5 py-0.5 text-[10px] font-black uppercase"
                style={{ backgroundColor: `${network.color}22`, color: network.color }}
              >
                {network.label.split(" ")[0]}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>{author?.username ? `@${author.username}` : timeAgo(post.created_at)}</span>
            <span>·</span>
            <VisibilityIcon visibility={post.visibility} />
          </div>
        </div>

        {isOwn ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            <AnimatePresence>
              {menuOpen ? (
                <motion.button
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  type="button"
                  onClick={() => { setMenuOpen(false); onDeletePost(post.id); }}
                  className="absolute right-0 top-9 z-10 flex items-center gap-2 whitespace-nowrap rounded-xl border border-border bg-popover px-3 py-2 text-xs font-semibold text-destructive shadow-lg"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t("social.deletePost")}
                </motion.button>
              ) : null}
            </AnimatePresence>
          </div>
        ) : null}
      </div>

      {post.content ? <p className="mt-3 whitespace-pre-wrap text-sm">{post.content}</p> : null}

      <MediaGrid media={post.media} />

      {post.kind === "network" && post.embed ? (
        <div className="mt-3">
          <NetworkEmbed
            link={{
              network: post.network ?? "x",
              external_id: post.external_id,
              external_url: post.external_url ?? "",
              embed_url: (post.embed as { embed_url?: string }).embed_url ?? null,
            }}
          />
        </div>
      ) : null}

      <div className="mt-3 flex items-center gap-1 border-t border-border/50 pt-2">
        <button
          type="button"
          onClick={() => onToggleLike(post.id, liked)}
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold transition-colors ${
            liked ? "text-destructive" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
          {post.like_count}
        </button>
        <button
          type="button"
          onClick={() => setShowComments((v) => !v)}
          className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <MessageCircle className="h-4 w-4" />
          {post.comment_count}
        </button>
        <button
          type="button"
          onClick={share}
          className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <Share2 className="h-4 w-4" />
        </button>
      </div>

      <AnimatePresence>
        {showComments ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-3">
              {comments.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t("social.noComments")}</p>
              ) : (
                comments.map((c) => {
                  const cp = commentProfiles[c.user_id];
                  return (
                    <div key={c.id} className="flex gap-2">
                      <UserAvatar
                        name={cp?.display_name || "Trader"}
                        avatarUrl={cp?.avatar_url}
                        role={cp?.role}
                        size={28}
                        onPress={() => onOpenProfile(c.user_id)}
                      />
                      <div className="flex-1 rounded-2xl bg-secondary/40 px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold">{cp?.display_name || "Trader"}</span>
                          {cp?.is_verified ? <BadgeCheck className="h-3 w-3 text-primary" /> : null}
                          <span className="ml-auto text-[10px] text-muted-foreground">{timeAgo(c.created_at)}</span>
                          {c.user_id === meId ? (
                            <button type="button" onClick={() => removeComment(c.id)} className="text-destructive">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          ) : null}
                        </div>
                        {c.content ? <p className="text-sm">{c.content}</p> : null}
                      </div>
                    </div>
                  );
                })
              )}

              {meId ? (
                canComment ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") send(); }}
                      placeholder={t("social.commentPlaceholder")}
                      className="flex-1 rounded-full border border-border bg-secondary/50 px-4 py-2 text-sm outline-none focus:border-primary/50"
                    />
                    <Button size="icon" onClick={send} disabled={sending || !text.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">{t("social.commentPremiumOnly")}</p>
                )
              ) : (
                <p className="text-xs text-muted-foreground">{t("social.loginToPost")}</p>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
