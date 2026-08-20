// admin-manage — CRUD administrativo para sinais, booms, horas e posts.
// Chamado pelo client com o JWT do utilizador autenticado.
// Verifica se o email está na lista ADMIN_EMAILS (env var).
// Usa service_role para todas as operações de BD (bypassa RLS).

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const adminEmailsRaw = Deno.env.get('ADMIN_EMAILS') ?? '';
const adminEmails = adminEmailsRaw
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

function errorJson(message: string, status = 400): Response {
  return json({ error: message }, status);
}

async function verifyAdmin(req: Request) {
  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '');
  if (!jwt) return { user: null, error: 'Não autenticado.' };

  const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
  if (authError || !user) return { user: null, error: 'Não autenticado.' };

  const email = (user.email ?? '').trim().toLowerCase();
  if (!adminEmails.includes(email)) {
    return { user: null, error: 'Acesso negado.' };
  }

  return { user, error: null };
}

// ── Handlers ────────────────────────────────────────────────────────────────

async function handleAddSignal(body: Record<string, unknown>) {
  const { symbol, timeframe, signal_type, entry_price, stop_loss, target_price, confidence, reasons, smc_setup, analysis, expires_at } = body;

  if (!symbol || !signal_type || !entry_price || !stop_loss || !target_price) {
    return errorJson('Campos obrigatórios em falta.');
  }

  const validSetups = ['BOS', 'CHoCH', 'OB', 'FVG', 'COMBO'];
  const setupVal = typeof smc_setup === 'string' && validSetups.includes(smc_setup.toUpperCase())
    ? smc_setup.toUpperCase() : null;

  const { data, error } = await supabase
    .from('signals')
    .insert({
      symbol: String(symbol).toUpperCase(),
      timeframe: String(timeframe || 'H1').toUpperCase(),
      signal_type: String(signal_type).toUpperCase(),
      entry_price: Number(entry_price),
      stop_loss: Number(stop_loss),
      target_price: Number(target_price),
      confidence: Number(confidence) || 75,
      reasons: Array.isArray(reasons) ? reasons : [],
      status: 'active',
      smc_setup: setupVal,
      analysis: typeof analysis === 'string' ? analysis.trim().slice(0, 500) : null,
      expires_at: typeof expires_at === 'string' ? expires_at : null,
    })
    .select()
    .single();

  if (error) return errorJson(error.message, 500);
  return json({ signal: data });
}

async function handleDeleteSignal(body: Record<string, unknown>) {
  const id = body.id;
  if (!id) return errorJson('id em falta.');

  const { error } = await supabase.from('signals').delete().eq('id', id);
  if (error) return errorJson(error.message, 500);
  return json({ deleted: true });
}

async function handleUpdateStatus(body: Record<string, unknown>) {
  const { id, status } = body;
  if (!id || !status) return errorJson('id e status em falta.');

  const allowed = ['active', 'pending', 'tp', 'sl', 'expired'];
  if (!allowed.includes(String(status))) return errorJson('Status inválido.');

  const { error } = await supabase
    .from('signals')
    .update({ status: String(status) })
    .eq('id', id);
  if (error) return errorJson(error.message, 500);
  return json({ updated: true });
}

async function handleAddBoomHour(body: Record<string, unknown>) {
  const { title, time_wat, time_gmt, pairs, days, description, volatility, badge } = body;
  if (!title || !time_wat) return errorJson('Campos obrigatórios em falta.');

  const { data, error } = await supabase
    .from('boom_hours')
    .insert({
      title: String(title),
      time_wat: String(time_wat),
      time_gmt: String(time_gmt || ''),
      pairs: Array.isArray(pairs) ? pairs : [],
      days: String(days || ''),
      description: String(description || ''),
      volatility: Number(volatility) || 1,
      badge: String(badge || '⚡'),
      is_active: true,
    })
    .select()
    .single();

  if (error) return errorJson(error.message, 500);
  return json({ boom_hour: data });
}

async function handleDeleteBoomHour(body: Record<string, unknown>) {
  const id = body.id;
  if (!id) return errorJson('id em falta.');

  const { error } = await supabase.from('boom_hours').delete().eq('id', id);
  if (error) return errorJson(error.message, 500);
  return json({ deleted: true });
}

async function handleAddBoomTime(body: Record<string, unknown>) {
  const { pair, boom_time, confidence, result, image_url, audio_url } = body;
  if (!pair || !boom_time) return errorJson('Campos obrigatórios em falta.');

  const { data, error } = await supabase
    .from('boom_times')
    .insert({
      pair: String(pair).toUpperCase(),
      boom_time: String(boom_time),
      confidence: Number(confidence) || 75,
      result: String(result || ''),
      image_url: String(image_url || ''),
      audio_url: String(audio_url || ''),
      is_active: true,
    })
    .select()
    .single();

  if (error) return errorJson(error.message, 500);

  // Publica o boom como mensagem no canal #sinais
  try {
    const { data: sinais } = await supabase
      .from('channels')
      .select('id')
      .eq('name', 'sinais')
      .single();
    if (sinais?.id && data) {
      const botId = '11111111-1111-1111-1111-111111111111';
      await supabase.from('messages').insert({
        channel_id: sinais.id,
        user_id: botId,
        text: `🎯 ${String(pair).toUpperCase()} — Boom`,
        image_url: String(image_url || ''),
        boom_id: data.id,
      });
    }
  } catch (e) {
    console.error('admin-manage: falha ao publicar boom no #sinais', e);
  }

  return json({ boom_time: data });
}

async function handleUpdateBoomResult(body: Record<string, unknown>) {
  const { id, result } = body;
  if (!id) return errorJson('id em falta.');

  const { error } = await supabase
    .from('boom_times')
    .update({ result: String(result || '') })
    .eq('id', id);
  if (error) return errorJson(error.message, 500);
  return json({ updated: true });
}

async function handleDeleteBoomTime(body: Record<string, unknown>) {
  const id = body.id;
  if (!id) return errorJson('id em falta.');

  const { error } = await supabase.from('boom_times').delete().eq('id', id);
  if (error) return errorJson(error.message, 500);
  return json({ deleted: true });
}

async function handleAddPost(body: Record<string, unknown>) {
  const { title, content, pair, signal_type, image_url, audio_url } = body;
  if (!title) return errorJson('title em falta.');

  const { data, error } = await supabase
    .from('posts')
    .insert({
      title: String(title),
      content: String(content || ''),
      pair: String(pair || ''),
      signal_type: String(signal_type || 'NEUTRO'),
      image_url: String(image_url || ''),
      audio_url: String(audio_url || ''),
      is_active: true,
    })
    .select()
    .single();

  if (error) return errorJson(error.message, 500);
  return json({ post: data });
}

async function handleDeletePost(body: Record<string, unknown>) {
  const id = body.id;
  if (!id) return errorJson('id em falta.');

  const { error } = await supabase.from('posts').delete().eq('id', id);
  if (error) return errorJson(error.message, 500);
  return json({ deleted: true });
}

async function handleListUsers() {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) return errorJson(error.message, 500);

  const userIds = (data.users ?? []).map((u) => u.id);

  const { data: subs } = await supabase
    .from('subscriptions')
    .select('user_id, plan, status, current_period_end')
    .in('user_id', userIds);

  const subMap = new Map<string, { plan: string; status: string; current_period_end: string }>();
  (subs ?? []).forEach((s) => subMap.set(s.user_id, s));

  const users = (data.users ?? []).map((u) => {
    const sub = subMap.get(u.id);
    const role = sub?.status === 'active' ? (sub.plan || 'free') : 'free';
    return {
      id: u.id,
      email: u.email ?? '',
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      role,
      subscription_status: sub?.status ?? null,
      subscription_expires: sub?.current_period_end ?? null,
    };
  });

  return json({ users });
}

async function handlePremiumCount() {
  const { count, error } = await supabase
    .from('subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active');

  if (error) return errorJson(error.message, 500);
  return json({ count: count ?? 0 });
}

// ── Payment Receipts ─────────────────────────────────────────────────────

async function handleListReceipts(body: Record<string, unknown>) {
  const status = body.status as string | undefined;
  let query = supabase
    .from('payment_receipts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return errorJson(error.message, 500);
  return json({ receipts: data ?? [] });
}

async function handleApproveReceipt(body: Record<string, unknown>) {
  const { id, reviewed_by } = body;
  if (!id) return errorJson('id em falta.');

  const { data: receipt, error: fetchErr } = await supabase
    .from('payment_receipts')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchErr || !receipt) return errorJson('Comprovativo não encontrado.', 404);

  const { error: updateErr } = await supabase
    .from('payment_receipts')
    .update({
      status: 'approved',
      reviewed_by: reviewed_by ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (updateErr) return errorJson(updateErr.message, 500);

  // Upsert subscription
  if (receipt.user_id && receipt.plan) {
    const planName = String(receipt.plan).toLowerCase();
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    await supabase
      .from('subscriptions')
      .upsert(
        {
          user_id: receipt.user_id,
          plan: planName,
          status: 'active',
          current_period_end: periodEnd.toISOString(),
          updated_at: now.toISOString(),
        },
        { onConflict: 'user_id' },
      );
  }

  return json({ approved: true });
}

async function handleRejectReceipt(body: Record<string, unknown>) {
  const { id, reviewed_by } = body;
  if (!id) return errorJson('id em falta.');

  const { error } = await supabase
    .from('payment_receipts')
    .update({
      status: 'rejected',
      reviewed_by: reviewed_by ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) return errorJson(error.message, 500);
  return json({ rejected: true });
}

async function handleDeleteReceipt(body: Record<string, unknown>) {
  const id = body.id;
  if (!id) return errorJson('id em falta.');

  const { error } = await supabase.from('payment_receipts').delete().eq('id', id);
  if (error) return errorJson(error.message, 500);
  return json({ deleted: true });
}

async function handleSaveReceipt(body: Record<string, unknown>) {
  const { user_id, user_email, proof_url, plan, method, amount, currency } = body;
  if (!user_id || !proof_url) return errorJson('Campos obrigatórios em falta.');

  const { data, error } = await supabase
    .from('payment_receipts')
    .insert({
      user_id: String(user_id),
      user_email: String(user_email || ''),
      proof_url: String(proof_url),
      plan: String(plan || ''),
      method: String(method || ''),
      amount: Number(amount) || 0,
      currency: String(currency || 'usd'),
      status: 'pending',
    })
    .select()
    .single();

  if (error) return errorJson(error.message, 500);
  return json({ receipt: data });
}

// ── Admin → User DM ────────────────────────────────────────────────────────

const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send';

async function sendExpoPush(tokens: string[], title: string, body: string, data?: Record<string, unknown>) {
  const expoToken = Deno.env.get('EXPO_PUSH_ACCESS_TOKEN') ?? '';
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (expoToken) headers['Authorization'] = `Bearer ${expoToken}`;

  let sent = 0;
  for (let i = 0; i < tokens.length; i += 100) {
    const chunk = tokens.slice(i, i + 100).map((t) => ({
      to: t,
      title,
      body: body.length > 140 ? body.slice(0, 139) + '…' : body,
      sound: 'default',
      channelId: 'comunidade',
      ...(data ? { data } : {}),
    }));
    try {
      const res = await fetch(EXPO_PUSH_API, { method: 'POST', headers, body: JSON.stringify(chunk) });
      if (!res.ok) continue;
      const result = await res.json().catch(() => ({}));
      const tickets = Array.isArray(result?.data) ? result.data : [];
      for (const t of tickets) {
        if (t?.status !== 'error') sent += 1;
      }
    } catch { /* skip */ }
  }
  return sent;
}

async function handleSendDm(body: Record<string, unknown>) {
  const { user_id, text } = body;
  if (!user_id || !text) return errorJson('user_id e text em falta.');

  const adminBotId = '11111111-1111-1111-1111-111111111111';

  const { data: existing } = await supabase
    .from('conversation_members')
    .select('conversation_id')
    .eq('user_id', user_id);

  let conversationId: string | null = null;

  for (const row of existing ?? []) {
    const { data: otherMember } = await supabase
      .from('conversation_members')
      .select('user_id')
      .eq('conversation_id', row.conversation_id)
      .neq('user_id', user_id)
      .maybeSingle();
    if (!otherMember) {
      conversationId = row.conversation_id;
      break;
    }
  }

  if (!conversationId) {
    const { data: newConv, error: convErr } = await supabase
      .from('conversations')
      .insert({})
      .select('id')
      .single();
    if (convErr) return errorJson(convErr.message, 500);
    conversationId = newConv.id;

    await supabase.from('conversation_members').insert([
      { conversation_id: conversationId, user_id: adminBotId },
      { conversation_id: conversationId, user_id },
    ]);
  }

  const { data: msg, error: msgErr } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      user_id: adminBotId,
      text: String(text),
    })
    .select('id')
    .single();
  if (msgErr) return errorJson(msgErr.message, 500);

  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('user_id', user_id);
  const tokenList = (tokens ?? []).map((t: { token: string }) => t.token);

  let notified = 0;
  if (tokenList.length > 0) {
    notified = await sendExpoPush(tokenList, 'TMT Admin', String(text), {
      url: `/comunidade/dm/${conversationId}`,
    });
  }

  return json({ dm: true, conversation_id: conversationId, message_id: msg.id, notified });
}

async function handleSendPush(body: Record<string, unknown>) {
  const { user_ids, title, message } = body;
  if (!title || !message) return errorJson('title e message em falta.');

  let userIds: string[];
  if (Array.isArray(user_ids) && user_ids.length > 0) {
    userIds = user_ids.map(String);
  } else {
    const { data: allTokens } = await supabase.from('push_tokens').select('user_id');
    userIds = [...new Set((allTokens ?? []).map((t: { user_id: string }) => t.user_id))];
  }

  if (userIds.length === 0) return json({ notified: 0 });

  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('user_id, token')
    .in('user_id', userIds);

  const tokenList = (tokens ?? []).map((t: { token: string }) => t.token);
  if (tokenList.length === 0) return json({ notified: 0 });

  const notified = await sendExpoPush(tokenList, String(title), String(message));
  return json({ notified, target_users: userIds.length });
}

// ── Main ────────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') return errorJson('Método não permitido.', 405);

  const { user, error: authError } = await verifyAdmin(req);
  if (authError) return errorJson(authError, 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorJson('JSON inválido.', 400);
  }

  const action = String(body.action ?? '');

  switch (action) {
    case 'add_signal':
      return handleAddSignal(body);
    case 'delete_signal':
      return handleDeleteSignal(body);
    case 'update_status':
      return handleUpdateStatus(body);
    case 'add_boom_hour':
      return handleAddBoomHour(body);
    case 'delete_boom_hour':
      return handleDeleteBoomHour(body);
    case 'add_boom_time':
      return handleAddBoomTime(body);
    case 'update_boom_result':
      return handleUpdateBoomResult(body);
    case 'delete_boom_time':
      return handleDeleteBoomTime(body);
    case 'add_post':
      return handleAddPost(body);
    case 'delete_post':
      return handleDeletePost(body);
    case 'list_users':
      return handleListUsers();
    case 'premium_count':
      return handlePremiumCount();
    case 'list_receipts':
      return handleListReceipts(body);
    case 'approve_receipt':
      return handleApproveReceipt({ ...body, reviewed_by: user.id });
    case 'reject_receipt':
      return handleRejectReceipt({ ...body, reviewed_by: user.id });
    case 'delete_receipt':
      return handleDeleteReceipt(body);
    case 'save_receipt':
      return handleSaveReceipt(body);
    case 'send_dm':
      return handleSendDm(body);
    case 'send_push':
      return handleSendPush(body);
    case 'list_notifications': {
      const { limit = 50 } = body;
      const { data, error } = await supabase
        .from('admin_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) return errorJson(error.message, 500);
      return json({ data });
    }
    case 'mark_notification_read': {
      const { id } = body;
      if (!id) return errorJson('id em falta.');
      const { error } = await supabase
        .from('admin_notifications')
        .update({ read: true })
        .eq('id', id);
      if (error) return errorJson(error.message, 500);
      return json({ updated: true });
    }
    case 'mark_all_notifications_read': {
      const { error } = await supabase
        .from('admin_notifications')
        .update({ read: true })
        .eq('read', false);
      if (error) return errorJson(error.message, 500);
      return json({ updated: true });
    }
    case 'unread_count': {
      const { count, error } = await supabase
        .from('admin_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('read', false);
      if (error) return errorJson(error.message, 500);
      return json({ count: count ?? 0 });
    }
    case 'ban_user': {
      const { user_id } = body;
      if (!user_id) return errorJson('user_id em falta.');
      const { error } = await supabase.auth.admin.updateUserById(user_id, {
        user_metadata: { banned: true },
      });
      if (error) return errorJson(error.message, 500);
      return json({ banned: true });
    }
    case 'update_user_role': {
      const { user_id, role } = body;
      if (!user_id || !role) return errorJson('user_id e role em falta.');
      const { error } = await supabase.auth.admin.updateUserById(user_id, {
        user_metadata: { role },
      });
      if (error) return errorJson(error.message, 500);
      return json({ updated: true });
    }
    case 'update_subscription_expiry': {
      const { user_id, expires_at } = body;
      if (!user_id) return errorJson('user_id em falta.');
      const { error } = await supabase
        .from('subscriptions')
        .upsert(
          {
            user_id,
            expires_at,
            status: expires_at && new Date(expires_at) > new Date() ? 'active' : 'expired',
          },
          { onConflict: 'user_id' },
        );
      if (error) return errorJson(error.message, 500);
      return json({ updated: true });
    }
    case 'expiring_count': {
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      const { count, error } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .lte('expires_at', sevenDaysFromNow.toISOString())
        .gte('expires_at', new Date().toISOString());
      if (error) return errorJson(error.message, 500);
      return json({ count: count ?? 0 });
    }
    case 'bulk_delete_signals': {
      const { ids } = body;
      if (!Array.isArray(ids) || ids.length === 0) return errorJson('ids em falta.');
      const { error } = await supabase.from('signals').delete().in('id', ids);
      if (error) return errorJson(error.message, 500);
      return json({ deleted: ids.length });
    }
    case 'bulk_delete_boom_hours': {
      const { ids } = body;
      if (!Array.isArray(ids) || ids.length === 0) return errorJson('ids em falta.');
      const { error } = await supabase.from('boom_hours').delete().in('id', ids);
      if (error) return errorJson(error.message, 500);
      return json({ deleted: ids.length });
    }
    case 'bulk_delete_boom_times': {
      const { ids } = body;
      if (!Array.isArray(ids) || ids.length === 0) return errorJson('ids em falta.');
      const { error } = await supabase.from('boom_times').delete().in('id', ids);
      if (error) return errorJson(error.message, 500);
      return json({ deleted: ids.length });
    }
    case 'bulk_delete_posts': {
      const { ids } = body;
      if (!Array.isArray(ids) || ids.length === 0) return errorJson('ids em falta.');
      const { error } = await supabase.from('posts').delete().in('id', ids);
      if (error) return errorJson(error.message, 500);
      return json({ deleted: ids.length });
    }
    // ── Withdrawal Requests ────────────────────────────────────────────
    case 'list_withdrawals': {
      let query = supabase.from('withdrawal_requests').select('*').order('created_at', { ascending: false });
      if (body.status) query = query.eq('status', body.status);
      const { data, error } = await query;
      if (error) return errorJson(error.message, 500);
      return json({ withdrawals: data });
    }
    case 'approve_withdrawal': {
      const { id } = body;
      if (!id) return errorJson('id em falta.');
      const { error } = await supabase.from('withdrawal_requests').update({
        status: 'approved',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) return errorJson(error.message, 500);
      return json({ ok: true });
    }
    case 'reject_withdrawal': {
      const { id } = body;
      if (!id) return errorJson('id em falta.');
      const { error } = await supabase.from('withdrawal_requests').update({
        status: 'rejected',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) return errorJson(error.message, 500);
      return json({ ok: true });
    }
    default:
      return errorJson(`Ação desconhecida: ${action}`, 400);
  }
});
