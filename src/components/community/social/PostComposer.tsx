import { useRef, useState } from "react";
import { Globe, Image as ImageIcon, Link2, Loader2, Lock, Music, Users, Video, X } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { UserAvatar } from "@/components/community/UserAvatar";
import { Button } from "@/components/ui/button";
import { createPost, parseNetworkLink, uploadPostMedia } from "@/lib/communitySocial";
import type { CommunityPost, PostMedia, PostVisibility, SocialNetwork } from "@/lib/types";
import type { UserProfile } from "@/lib/types";

const VISIBILITIES: { id: PostVisibility; icon: typeof Globe; key: string }[] = [
  { id: "public", icon: Globe, key: "social.visibilityPublic" },
  { id: "followers", icon: Users, key: "social.visibilityFollowers" },
  { id: "private", icon: Lock, key: "social.visibilityPrivate" },
];

export function PostComposer({
  meId,
  profile,
  onCreated,
}: {
  meId: string;
  profile?: UserProfile;
  onCreated: (post: CommunityPost) => void;
}) {
  const { t } = useTranslation();
  const [content, setContent] = useState("");
  const [media, setMedia] = useState<PostMedia[]>([]);
  const [link, setLink] = useState("");
  const [visibility, setVisibility] = useState<PostVisibility>("public");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const mediaRef = useRef<HTMLInputElement>(null);

  const parsed = link.trim() ? parseNetworkLink(link) : null;

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded: PostMedia[] = [];
      for (const file of Array.from(files).slice(0, 4)) {
        const m = await uploadPostMedia(meId, file);
        if (m) uploaded.push(m);
      }
      if (uploaded.length) setMedia((prev) => [...prev, ...uploaded]);
      else toast.error(t("social.postError"));
    } finally {
      setUploading(false);
      if (mediaRef.current) mediaRef.current.value = "";
    }
  };

  const publish = async () => {
    const value = content.trim();
    if (!value && media.length === 0 && !parsed) return;
    setBusy(true);
    try {
      const post = await createPost({
        authorId: meId,
        content: value,
        media,
        visibility,
        network: (parsed?.network ?? null) as SocialNetwork | null,
        externalUrl: parsed?.external_url ?? null,
        externalId: parsed?.external_id ?? null,
        embed: parsed ? { embed_url: parsed.embed_url } : null,
      });
      onCreated(post);
      setContent("");
      setMedia([]);
      setLink("");
      setVisibility("public");
      toast.success(t("social.postCreated"));
    } catch {
      toast.error(t("social.postError"));
    } finally {
      setBusy(false);
    }
  };

  const disabled = busy || uploading || (!content.trim() && media.length === 0 && !parsed);

  return (
    <div className="mb-5 rounded-3xl border border-border bg-card/80 p-4 backdrop-blur-xl">
      <div className="flex gap-3">
        <UserAvatar
          name={profile?.display_name || "T"}
          avatarUrl={profile?.avatar_url}
          role={profile?.role}
          size={44}
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t("social.composerPlaceholder")}
          className="min-h-[64px] flex-1 resize-none bg-transparent pt-1 text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      {media.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {media.map((m, i) => (
            <div key={i} className="relative h-20 w-20 overflow-hidden rounded-xl border border-border">
              {m.type === "image" ? (
                <img src={m.url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-secondary text-muted-foreground">
                  {m.type === "video" ? <Video className="h-5 w-5" /> : <Music className="h-5 w-5" />}
                </div>
              )}
              <button
                type="button"
                onClick={() => setMedia((prev) => prev.filter((_, idx) => idx !== i))}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-3 flex items-center gap-2 rounded-full border border-border bg-secondary/40 px-3 py-1.5">
        <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder={t("social.linkPlaceholder")}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {parsed ? (
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
            {parsed.network}
          </span>
        ) : null}
      </div>

      <input
        ref={mediaRef}
        type="file"
        accept="image/*,video/*,audio/*"
        multiple
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
      />

      <div className="mt-3 flex items-center gap-1.5 border-t border-border/50 pt-3">
        <button
          type="button"
          onClick={() => mediaRef.current?.click()}
          className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-primary"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
          {t("social.media")}
        </button>

        <div className="ml-1 flex items-center gap-0.5 rounded-full border border-border p-0.5">
          {VISIBILITIES.map(({ id, icon: Icon, key }) => (
            <button
              key={id}
              type="button"
              title={t(key)}
              onClick={() => setVisibility(id)}
              className={`rounded-full p-1.5 transition-colors ${
                visibility === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>

        <Button size="sm" className="ml-auto" onClick={publish} disabled={disabled}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("social.publish")}
        </Button>
      </div>
    </div>
  );
}
