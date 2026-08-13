import { supabase } from '@/lib/supabase';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/env';

const ADMIN_FN = `${SUPABASE_URL}/functions/v1/admin-manage`;

async function callAdminFn(action: string, payload: Record<string, unknown> = {}): Promise<any> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Não autenticado');

  const res = await fetch(ADMIN_FN, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ action, ...payload }),
  });

  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || 'Erro desconhecido');
  return data;
}

export async function addSignal(signal: {
  symbol: string;
  timeframe: string;
  signal_type: string;
  entry_price: number;
  stop_loss: number;
  target_price: number;
  confidence: number;
  reasons: string[];
}) {
  return callAdminFn('add_signal', signal);
}

export async function deleteSignal(id: string) {
  return callAdminFn('delete_signal', { id });
}

export async function updateSignalStatus(id: string, status: string) {
  return callAdminFn('update_status', { id, status });
}

export async function deleteAllActiveSignals() {
  return callAdminFn('delete_all_active');
}

export async function addBoomHour(data: {
  title: string;
  time_gmt: string;
  time_wat: string;
  pairs: string[];
  days: string;
  description: string;
  volatility: number;
  badge: string;
}) {
  return callAdminFn('add_boom_hour', data);
}

export async function deleteBoomHour(id: string) {
  return callAdminFn('delete_boom_hour', { id });
}

export async function addBoomTime(data: {
  pair: string;
  boom_time: string;
  confidence: number;
  result: string;
  image_url: string;
  audio_url: string;
}) {
  return callAdminFn('add_boom_time', data);
}

export async function updateBoomResult(id: string, result: string) {
  return callAdminFn('update_boom_result', { id, result });
}

export async function deleteBoomTime(id: string) {
  return callAdminFn('delete_boom_time', { id });
}

export async function addPost(data: {
  title: string;
  content: string;
  pair: string;
  signal_type: string;
  image_url?: string;
  audio_url?: string;
}) {
  return callAdminFn('add_post', data);
}

export async function deletePost(id: string) {
  return callAdminFn('delete_post', { id });
}

export async function listUsers(): Promise<{ id: string; email: string; created_at: string; last_sign_in_at: string | null }[]> {
  const data = await callAdminFn('list_users');
  return data.users ?? [];
}

export async function premiumCount(): Promise<number> {
  const data = await callAdminFn('premium_count');
  return data.count ?? 0;
}

export async function generateSignals(): Promise<number> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Não autenticado');

  const body = [
    'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'EURGBP',
    'USDCHF', 'NZDUSD', 'USDCAD', 'XAUUSD', 'BTCUSD',
  ].map((symbol) => ({ symbol, timeframe: '1h' }));

  const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-signal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || 'Erro ao gerar sinais');
  return data.results?.length ?? 0;
}

export async function closeSignals(): Promise<number> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Não autenticado');

  const res = await fetch(`${SUPABASE_URL}/functions/v1/close-signals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({}),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || 'Erro ao fechar sinais');
  return data.closed ?? 0;
}
