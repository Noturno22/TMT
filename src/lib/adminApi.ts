import { supabase } from '@/lib/supabase';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/env';
import { i18n } from '@/lib/i18n';

const ADMIN_FN = `${SUPABASE_URL}/functions/v1/admin-manage`;

async function callAdminFn(action: string, payload: Record<string, unknown> = {}): Promise<any> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error(i18n.t('adminErrors.notAuthenticated'));

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
  if (!res.ok || data.error) throw new Error(data.error || i18n.t('adminErrors.unknown'));
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

export async function listUsers(): Promise<{ id: string; email: string; created_at: string; last_sign_in_at: string | null; role?: string; subscription_status?: string; subscription_expires?: string }[]> {
  const data = await callAdminFn('list_users');
  return data.users ?? [];
}

export async function premiumCount(): Promise<number> {
  const data = await callAdminFn('premium_count');
  return data.count ?? 0;
}

export async function closeSignals(): Promise<number> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error(i18n.t('adminErrors.notAuthenticated'));

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
  if (!res.ok || data.error) throw new Error(data.error || i18n.t('adminErrors.close'));
  return data.closed ?? 0;
}

// ── Payment Receipts ────────────────────────────────────────────────────

export interface PaymentReceipt {
  id: string;
  user_id: string;
  user_email: string;
  proof_url: string;
  plan: string;
  method: string;
  amount: number;
  currency: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export async function listReceipts(status?: string): Promise<PaymentReceipt[]> {
  const data = await callAdminFn('list_receipts', status ? { status } : {});
  return data.receipts ?? [];
}

export async function approveReceipt(id: string): Promise<void> {
  await callAdminFn('approve_receipt', { id });
}

export async function rejectReceipt(id: string): Promise<void> {
  await callAdminFn('reject_receipt', { id });
}

export async function deleteReceipt(id: string): Promise<void> {
  await callAdminFn('delete_receipt', { id });
}

export async function saveReceipt(receipt: {
  user_id: string;
  user_email?: string;
  proof_url: string;
  plan: string;
  method: string;
  amount: number;
  currency: string;
}): Promise<void> {
  await callAdminFn('save_receipt', receipt);
}

// ── Notifications ──────────────────────────────────────────────────────

export async function getNotifications(limit = 50) {
  const data = await callAdminFn('list_notifications', { limit });
  return data;
}

export async function markNotificationRead(id: string) {
  await callAdminFn('mark_notification_read', { id });
}

export async function markAllNotificationsRead() {
  await callAdminFn('mark_all_notifications_read');
}

export async function getUnreadCount() {
  const data = await callAdminFn('unread_count');
  return data?.count ?? 0;
}

// ── User Management ────────────────────────────────────────────────────

export async function banUser(userId: string) {
  await callAdminFn('ban_user', { user_id: userId });
}

export async function updateUserRole(userId: string, role: string) {
  await callAdminFn('update_user_role', { user_id: userId, role });
}

export async function updateSubscriptionExpiry(userId: string, expiresAt: string | null) {
  await callAdminFn('update_subscription_expiry', { user_id: userId, expires_at: expiresAt });
}

export async function expiringCount() {
  const data = await callAdminFn('expiring_count');
  return data?.count ?? 0;
}

// ── Bulk Delete ────────────────────────────────────────────────────────

export async function bulkDeleteSignals(ids: string[]) {
  await callAdminFn('bulk_delete_signals', { ids });
}

export async function bulkDeleteBoomHours(ids: string[]) {
  await callAdminFn('bulk_delete_boom_hours', { ids });
}

export async function bulkDeleteBoomTimes(ids: string[]) {
  await callAdminFn('bulk_delete_boom_times', { ids });
}

export async function bulkDeletePosts(ids: string[]) {
  await callAdminFn('bulk_delete_posts', { ids });
}

// ── Withdrawal Requests ──────────────────────────────────────────────

export interface WithdrawalRequest {
  id: string;
  user_id: string;
  method: string;
  amount: number;
  currency: string;
  details: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  reviewed_by: string | null;
  reviewed_at: string | null;
  notes: string | null;
  created_at: string;
}

export async function submitWithdrawalRequest(req: {
  method: string;
  amount: number;
  currency: string;
  details?: string;
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { error } = await supabase.from('withdrawal_requests').insert({
    user_id: user.id,
    method: req.method,
    amount: req.amount,
    currency: req.currency,
    details: req.details ?? null,
  });
  if (error) throw error;
}

export async function listWithdrawals(status?: string): Promise<WithdrawalRequest[]> {
  const data = await callAdminFn('list_withdrawals', status ? { status } : {});
  return data.withdrawals ?? [];
}

export async function approveWithdrawal(id: string): Promise<void> {
  await callAdminFn('approve_withdrawal', { id });
}

export async function rejectWithdrawal(id: string): Promise<void> {
  await callAdminFn('reject_withdrawal', { id });
}
