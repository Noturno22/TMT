import type { SignalType } from './types';

export function formatSymbol(symbol: string): string {
  if (!symbol) return 'N/A';
  if (symbol.includes('/')) return symbol;
  if (symbol.length === 6) return symbol.slice(0, 3) + '/' + symbol.slice(3);
  return symbol;
}

export function formatTimeframe(tf: string): string {
  if (!tf) return 'H1';
  const map: Record<string, string> = {
    '1m': 'M1', '5m': 'M5', '15m': 'M15', '30m': 'M30',
    '1h': 'H1', '4h': 'H4', '1d': 'D1',
    M1: 'M1', M5: 'M5', M15: 'M15', M30: 'M30',
    H1: 'H1', H4: 'H4', D1: 'D1',
  };
  return map[tf] ?? tf.toUpperCase();
}

export function formatType(type: string): SignalType {
  const upper = (type || '').toUpperCase();
  if (upper === 'BUY') return 'BUY';
  if (upper === 'SELL') return 'SELL';
  return 'AGUARDAR';
}

export function formatNumber(n: number, decimals = 5): string {
  if (!isFinite(n)) return '—';
  return n.toFixed(decimals);
}

export function formatPrice(n: number, decimals = 2): string {
  if (!isFinite(n)) return '—';
  return n.toFixed(decimals);
}

export function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'agora mesmo';
  if (diff < 3600) return `há ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
  return `há ${Math.floor(diff / 86400)}d`;
}

const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export function formatLongDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()} de ${MONTHS_PT[d.getMonth()]} de ${d.getFullYear()}`;
}

export function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

export function formatDateTimeWAT(dateStr: string): string {
  const d = new Date(dateStr);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()} às ${hh}:${min} WAT`;
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function displayName(user: { user_metadata?: Record<string, unknown>; email?: string } | null): string {
  const meta = user?.user_metadata as Record<string, unknown> | undefined;
  const full = typeof meta?.full_name === 'string' ? meta.full_name : '';
  if (full) return full;
  const email = user?.email || '';
  return email.split('@')[0] || 'Trader';
}

export function avatarLetter(user: { user_metadata?: Record<string, unknown>; email?: string } | null): string {
  return (displayName(user) || 'T')[0].toUpperCase();
}

export function formatPips(n: number): string {
  if (!isFinite(n)) return '—';
  const v = Math.round(n * 10) / 10;
  return v > 0 ? `+${v}` : `${v}`;
}
