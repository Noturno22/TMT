export type SignalType = 'BUY' | 'SELL' | 'AGUARDAR';
export type SignalStatus = 'active' | 'pending' | 'tp' | 'sl';
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
