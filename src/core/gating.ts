export const ALL_PAIRS = [
  'EUR/USD',
  'GBP/USD',
  'USD/JPY',
  'AUD/USD',
  'EUR/GBP',
  'USD/CHF',
  'NZD/USD',
  'USD/CAD',
  'XAU/USD',
  'BTC/USD',
];

export const FREE_PAIRS = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'XAU/USD', 'AUD/USD'];
export const BASIC_PAIRS = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'XAU/USD', 'AUD/USD', 'EUR/GBP'];

export const TIMEFRAMES = ['Todos', 'M15', 'H1', 'H4'];
export const FREE_TIMEFRAMES = ['M15', 'H1'];
export const BASIC_TIMEFRAMES = ['M15', 'H1'];
export const PRO_TIMEFRAMES = ['M15', 'H1', 'H4'];

export const SIGNAL_TYPES = ['Todos', 'BUY', 'SELL', 'AGUARDAR'];

export const TV_INTERVALS: Record<string, string> = {
  M15: '15',
  H1: '60',
  H4: '240',
};

// ── Plan limits ─────────────────────────────────────────────────────────────

export const PLAN_LIMITS = {
  free: {
    maxSignalsPerDay: 1,
    pairs: FREE_PAIRS,
    timeframes: FREE_TIMEFRAMES,
    historyDays: 1,
    pushAlertsPerDay: 0,
    hasAnalysis: false,
    hasRealtimeAlerts: false,
    hasAdvancedBank: false,
    hasLiveSessions: false,
    hasCopyTrading: false,
    hasApiAccess: false,
    hasEarlyAccess: false,
    hasWhatsAppAlerts: false,
    hasWeeklyReports: false,
  },
  basic: {
    maxSignalsPerDay: 5,
    pairs: BASIC_PAIRS,
    timeframes: BASIC_TIMEFRAMES,
    historyDays: 7,
    pushAlertsPerDay: 5,
    hasAnalysis: true,
    hasRealtimeAlerts: false,
    hasAdvancedBank: true,
    hasLiveSessions: false,
    hasCopyTrading: false,
    hasApiAccess: false,
    hasEarlyAccess: false,
    hasWhatsAppAlerts: false,
    hasWeeklyReports: false,
  },
  pro: {
    maxSignalsPerDay: 15,
    pairs: ALL_PAIRS,
    timeframes: PRO_TIMEFRAMES,
    historyDays: 30,
    pushAlertsPerDay: -1, // unlimited
    hasAnalysis: true,
    hasRealtimeAlerts: true,
    hasAdvancedBank: true,
    hasLiveSessions: true,
    hasCopyTrading: false,
    hasApiAccess: false,
    hasEarlyAccess: false,
    hasWhatsAppAlerts: false,
    hasWeeklyReports: false,
  },
  premium: {
    maxSignalsPerDay: -1, // unlimited
    pairs: ALL_PAIRS,
    timeframes: ['M15', 'H1', 'H4'],
    historyDays: -1, // unlimited
    pushAlertsPerDay: -1,
    hasAnalysis: true,
    hasRealtimeAlerts: true,
    hasAdvancedBank: true,
    hasLiveSessions: true,
    hasCopyTrading: true,
    hasApiAccess: true,
    hasEarlyAccess: true,
    hasWhatsAppAlerts: true,
    hasWeeklyReports: true,
  },
} as const;

export type PlanTier = keyof typeof PLAN_LIMITS;

// ── Gating helpers ──────────────────────────────────────────────────────────

export function isPremiumPair(pair: string): boolean {
  return !FREE_PAIRS.includes(pair);
}

export function isPremiumTimeframe(tf: string): boolean {
  return !FREE_TIMEFRAMES.includes(tf);
}

export function getPairGating(pair: string, tier: PlanTier): 'free' | 'basic' | 'pro' | 'premium' {
  if (FREE_PAIRS.includes(pair)) return 'free';
  if (BASIC_PAIRS.includes(pair)) return 'basic';
  return 'pro';
}

export function getTimeframeGating(tf: string, tier: PlanTier): 'free' | 'basic' | 'pro' | 'premium' {
  if (tf === 'M15' || tf === 'H1') return 'free';
  return 'pro';
}

export function canAccessPair(pair: string, tier: PlanTier): boolean {
  const required = getPairGating(pair, tier);
  const order: PlanTier[] = ['free', 'basic', 'pro', 'premium'];
  return order.indexOf(tier) >= order.indexOf(required);
}

export function canAccessTimeframe(tf: string, tier: PlanTier): boolean {
  const required = getTimeframeGating(tf, tier);
  const order: PlanTier[] = ['free', 'basic', 'pro', 'premium'];
  return order.indexOf(tier) >= order.indexOf(required);
}
