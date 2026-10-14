import { supabase } from "@/lib/supabaseClient";
import type {
  CommunityPost,
  PostComment,
  PostMedia,
  PostVisibility,
  SocialNetwork,
  UserProfile,
} from "@/lib/types";

export interface NetworkMeta {
  id: SocialNetwork;
  label: string;
  color: string;
  placeholder: string;
}

export const NETWORKS: NetworkMeta[] = [
  { id: "x", label: "X (Twitter)", color: "#e7e9ea", placeholder: "https://x.com/user/status/123" },
  { id: "youtube", label: "YouTube", color: "#ff0000", placeholder: "https://youtube.com/watch?v=..." },
  { id: "tiktok", label: "TikTok", color: "#25f4ee", placeholder: "https://tiktok.com/@user/video/123" },
  { id: "instagram", label: "Instagram", color: "#e1306c", placeholder: "https://instagram.com/p/abc123" },
  { id: "telegram", label: "Telegram", color: "#2aabee", placeholder: "https://t.me/channel/123" },
];

export const NETWORK_BY_ID: Record<SocialNetwork, NetworkMeta> = NETWORKS.reduce(
  (acc, n) => ({ ...acc, [n.id]: n }),
  {} as Record<SocialNetwork, NetworkMeta>,
);

export interface ParsedNetworkLink {
  network: SocialNetwork;
  external_id: string | null;
  external_url: string;
  embed_url: string | null;
}

export function parseNetworkLink(raw: string): ParsedNetworkLink | null {
  const url = raw.trim();
  if (!url) return null;
  let u: URL;
  try {
    u = new URL(url.startsWith("http") ? url : `https://${url}`);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "").toLowerCase();
  const parts = u.pathname.split("/").filter(Boolean);

  if (host === "youtu.be" || host.endsWith("youtube.com")) {
    let id: string | null = null;
    if (host === "youtu.be") id = parts[0] ?? null;
    else if (parts[0] === "watch") id = u.searchParams.get("v");
    else if (parts[0] === "shorts" || parts[0] === "embed") id = parts[1] ?? null;
    return {
      network: "youtube",
      external_id: id,
      external_url: url,
      embed_url: id ? `https://www.youtube.com/embed/${id}` : null,
    };
  }

  if (host === "x.com" || host === "twitter.com" || host === "mobile.twitter.com") {
    const i = parts.indexOf("status");
    const id = i >= 0 ? parts[i + 1] ?? null : null;
    return {
      network: "x",
      external_id: id,
      external_url: url,
      embed_url: id
        ? `https://platform.twitter.com/embed/Tweet.html?id=${id}&...`
        : null,
    };
  }

  if (host.endsWith("tiktok.com")) {
    const i = parts.indexOf("video");
    const id = i >= 0 ? parts[i + 1] ?? null : null;
    return {
      network: "tiktok",
      external_id: id,
      external_url: url,
      embed_url: id ? `https://www.tiktok.com/embed/v2/${id}` : null,
    };
  }

  if (host.endsWith("instagram.com")) {
    const i = parts.indexOf("p");
    const id = i >= 0 ? parts[i + 1] ?? null : parts.indexOf("reel") >= 0 ? parts[parts.indexOf("reel") + 1] ?? null : null;
    return {
      network: "instagram",
      external_id: id,
      external_url: url,
      embed_url: id ? `https://www.instagram.com/p/${id}/embed` : null,
    };
  }

  if (host === "t.me" || host === "telegram.me") {
    const id = parts.length >= 2 ? `${parts[0]}/${parts[1]}` : parts[0] ?? null;
    return {
      network: "telegram",
      external_id: id,
      external_url: url,
      embed_url: id ? `https://t.me/${parts[0]}/${parts[1]}?embed=1` : null,
    };
  }

  return null;
}

export interface FeedOptions {
  authorId?: string;
  network?: SocialNetwork;
  limit?: number;
  before?: string;
}

export async function fetchFeed(opts: FeedOptions = {}): Promise<CommunityPost[]> {
  let q = supabase
    .from("community_posts")
    .select("*")
    .is("deleted_at", null)
    .is("parent_id", null)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 30);

  if (opts.authorId) q = q.eq("author_id", opts.authorId);
  if (opts.network) q = q.eq("network", opts.network);
  if (opts.before) q = q.lt("created_at", opts.before);

  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as CommunityPost[];
}

export async function fetchPost(postId: string): Promise<CommunityPost | null> {
  const { data, error } = await supabase
    .from("community_posts")
    .select("*")
    .eq("id", postId)
    .maybeSingle();
  if (error) throw error;
  return (data as CommunityPost) ?? null;
}

export async function fetchProfiles(ids: string[]): Promise<Record<string, UserProfile>> {  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return {};
  const { data } = await supabase.from("user_profiles").select("*").in("user_id", unique);
  const map: Record<string, UserProfile> = {};
  for (const p of (data || []) as UserProfile[]) map[p.user_id] = p;
  return map;
}

export interface CreatePostInput {
  authorId: string;
  content: string;
  media?: PostMedia[];
  visibility?: PostVisibility;
  network?: SocialNetwork | null;
  externalUrl?: string | null;
  externalId?: string | null;
  embed?: Record<string, unknown> | null;
}

export async function createPost(input: CreatePostInput): Promise<CommunityPost> {
  const { data, error } = await supabase
    .from("community_posts")
    .insert({
      author_id: input.authorId,
      content: input.content,
      media: input.media ?? [],
      visibility: input.visibility ?? "public",
      kind: input.network ? "network" : "post",
      network: input.network ?? null,
      external_url: input.externalUrl ?? null,
      external_id: input.externalId ?? null,
      embed: input.embed ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as CommunityPost;
}

export async function deletePost(postId: string): Promise<void> {
  const { error } = await supabase
    .from("community_posts")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", postId);
  if (error) throw error;
}

export async function toggleLike(postId: string, userId: string, liked: boolean): Promise<void> {
  if (liked) {
    const { error } = await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", userId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("post_likes").insert({ post_id: postId, user_id: userId });
    if (error) throw error;
  }
}

export async function fetchLikedPostIds(userId: string, postIds: string[]): Promise<Set<string>> {
  if (postIds.length === 0) return new Set();
  const { data } = await supabase
    .from("post_likes")
    .select("post_id")
    .eq("user_id", userId)
    .in("post_id", postIds);
  return new Set((data || []).map((r) => r.post_id as string));
}

export async function fetchComments(postId: string): Promise<PostComment[]> {
  const { data, error } = await supabase
    .from("post_comments")
    .select("*")
    .eq("post_id", postId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []) as PostComment[];
}

export async function addComment(input: {
  postId: string;
  userId: string;
  content: string;
  media?: PostMedia[];
  parentId?: string | null;
}): Promise<PostComment> {
  const { data, error } = await supabase
    .from("post_comments")
    .insert({
      post_id: input.postId,
      user_id: input.userId,
      content: input.content,
      media: input.media ?? [],
      parent_id: input.parentId ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as PostComment;
}

export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase
    .from("post_comments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", commentId);
  if (error) throw error;
}

export async function isFollowing(userId: string, targetId: string): Promise<boolean> {
  const { data } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", userId)
    .eq("following_id", targetId)
    .maybeSingle();
  return !!data;
}

export async function follow(userId: string, targetId: string): Promise<void> {
  const { error } = await supabase
    .from("follows")
    .insert({ follower_id: userId, following_id: targetId });
  if (error && error.code !== "23505") throw error;
}

export async function unfollow(userId: string, targetId: string): Promise<void> {
  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", userId)
    .eq("following_id", targetId);
  if (error) throw error;
}

export async function fetchFollowers(userId: string): Promise<UserProfile[]> {
  const { data } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("following_id", userId);
  return Object.values(await fetchProfiles((data || []).map((r) => r.follower_id as string)));
}

export async function fetchFollowing(userId: string): Promise<UserProfile[]> {
  const { data } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId);
  return Object.values(await fetchProfiles((data || []).map((r) => r.following_id as string)));
}

export function mediaFromFile(file: File, url: string): PostMedia {
  const type = file.type.startsWith("video")
    ? "video"
    : file.type.startsWith("audio")
      ? "audio"
      : "image";
  return { type, url };
}

export async function uploadPostMedia(
  userId: string,
  file: File,
): Promise<PostMedia | null> {
  try {
    const ext = (file.name.split(".").pop() || "bin").toLowerCase().split("?")[0];
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const path = `${userId}/${name}`;
    const { error } = await supabase.storage.from("community").upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
    if (error) {
      console.warn("[uploadPostMedia] Supabase error:", error.message);
      return null;
    }
    const url = supabase.storage.from("community").getPublicUrl(path).data.publicUrl;
    return mediaFromFile(file, url);
  } catch (err) {
    console.warn("[uploadPostMedia] Exception:", err);
    return null;
  }
}
