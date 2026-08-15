import type { Channel, Message } from '@/core/types';

export const BOT_USER_ID = '11111111-1111-1111-1111-111111111111';

export const REACTION_EMOJIS = ['👍', '❤️', '🔥', '🚀', '🎯'] as const;

export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

const PAIR_ROOM_LIFETIME_MS = 24 * 60 * 60 * 1000;

export function pairRoomState(channel: Channel): 'active' | 'closed' {
  if (channel.type !== 'pair' || !channel.opened_at) return 'closed';
  return Date.now() - new Date(channel.opened_at).getTime() < PAIR_ROOM_LIFETIME_MS
    ? 'active'
    : 'closed';
}

export function pairRoomClosesInMs(channel: Channel): number {
  if (!channel.opened_at) return 0;
  const closesAt = new Date(channel.opened_at).getTime() + PAIR_ROOM_LIFETIME_MS;
  return Math.max(0, closesAt - Date.now());
}

export function formatClosesIn(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}min`;
}

export function mergeMessages(current: Message[], server: Message[]): Message[] {
  const serverIds = new Set(server.map((m) => m.id));
  const serverClientIds = new Set(server.map((m) => m.client_msg_id));
  const inFlight = current.filter(
    (m) =>
      (m.pending || m.failed) &&
      !serverIds.has(m.id) &&
      !serverClientIds.has(m.client_msg_id),
  );
  return [...server, ...inFlight].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );
}
