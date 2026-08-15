export type SignalType = 'BUY' | 'SELL' | 'AGUARDAR';
export type SignalStatus = 'active' | 'pending' | 'tp' | 'sl' | 'expired';
export type SignalTier = 'free' | 'pro' | 'premium';
export type BoomStatus = 'upcoming' | 'live' | 'expired';

export interface Signal {
  id: string;
  pair: string;
  timeframe: string;
  type: SignalType;
  confidence: number;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  reasons: string[];
  status: SignalStatus;
  createdAt: string;
  // Novos campos para modelo Pro
  tier: SignalTier;
  riskReward?: number;        // R:R ratio (ex: 1:2.5)
  expiresAt?: string;         // expiração do sinal
  analysis?: string;          // análise técnica detalhada (Pro/Premium)
  probabilityScore?: number;  // 0-100 score interno de qualidade
}

export interface HistorySignal {
  id: string;
  pair: string;
  timeframe: string;
  type: SignalType;
  confidence: number;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  result: 'tp' | 'sl';
  date: string;
  profitPips: number;
}

export interface HistoryStats {
  total: number;
  tp: number;
  sl: number;
  winRate: number;
  totalPips: number;
}

export interface Subscription {
  id: string;
  user_id: string;
  status: string;
  plan?: string | null;
  currency?: string | null;
  stripe_price_id?: string | null;
  current_period_end?: string | null;
}

export interface BoomHour {
  id: string;
  title: string;
  time_gmt: string;
  time_wat: string;
  pairs: string[];
  days: string;
  description: string;
  volatility: number;
  badge: string;
  is_active: boolean;
  created_at: string;
}

export interface BoomTime {
  id: string;
  pair: string;
  boom_time: string;
  confidence: number;
  result: 'BUY' | 'SELL' | 'NEUTRO' | null;
  image_url: string;
  audio_url: string;
  is_active: boolean;
  created_at: string;
}

export interface BoomComment {
  id: string;
  boom_id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  text: string;
  audio_url: string;
  is_premium: boolean;
  created_at: string;
}

export interface BoomVote {
  id?: string;
  boom_id: string;
  user_id: string;
  vote: 'BUY' | 'SELL';
}

export interface PriceData {
  price: string;
  change: number;
}

export interface AppUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}

export interface BancaConfig {
  capital: number;
  achieved: number;
  metaPercent: number;
  riskPercent: number;
  metaMonths: string;
}

export type ChannelType = 'regular' | 'pair';
export type PairRoomState = 'active' | 'closed';

export interface Channel {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  icon: string | null;
  type: ChannelType;
  pair: string | null;
  opened_at: string | null;
  is_premium: boolean;
  created_at: string;
}

export interface Conversation {
  id: string;
  created_at: string;
}

export interface ConversationMember {
  conversation_id: string;
  user_id: string;
  joined_at: string;
}

export interface UserProfile {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  role: 'admin' | 'member';
  status: string;
  last_seen_at: string | null;
  created_at: string;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface Message {
  id: string;
  channel_id: string | null;
  conversation_id: string | null;
  user_id: string;
  parent_id: string | null;
  text: string;
  image_url: string | null;
  boom_id: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  client_msg_id: string;
  created_at: string;
  pending?: boolean;
  failed?: boolean;
}
