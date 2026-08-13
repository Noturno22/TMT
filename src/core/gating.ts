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

export const FREE_PAIRS = ['EUR/USD', 'GBP/USD', 'USD/JPY'];

export const TIMEFRAMES = ['Todos', 'M15', 'H1', 'H4'];
export const FREE_TIMEFRAMES = ['M15'];

export const SIGNAL_TYPES = ['Todos', 'BUY', 'SELL', 'AGUARDAR'];

export const TV_INTERVALS: Record<string, string> = {
  M15: '15',
  H1: '60',
  H4: '240',
};

export function isPremiumPair(pair: string): boolean {
  return !FREE_PAIRS.includes(pair);
}

export function isPremiumTimeframe(tf: string): boolean {
  return !FREE_TIMEFRAMES.includes(tf);
}
