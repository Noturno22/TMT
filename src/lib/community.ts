import { supabase } from '@/lib/supabase';

export async function findOrCreateConversation(
  userId: string,
  otherId: string,
): Promise<string> {
  const { data: mine } = await supabase
    .from('conversation_members')
    .select('conversation_id')
    .eq('user_id', userId);

  const ids = (mine || []).map((r) => r.conversation_id);

  if (ids.length > 0) {
    const { data: theirs } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', otherId)
      .in('conversation_id', ids);
    const existing = (theirs || [])[0]?.conversation_id;
    if (existing) return existing;
  }

  const { data: conv, error } = await supabase
    .from('conversations')
    .insert({})
    .select('id')
    .single();
  if (error || !conv) throw new Error('Falha ao criar a conversa.');

  await supabase
    .from('conversation_members')
    .insert({ conversation_id: conv.id, user_id: userId });
  await supabase
    .from('conversation_members')
    .insert({ conversation_id: conv.id, user_id: otherId });

  return conv.id;
}

export async function shareSignalToFeed(
  userId: string,
  signalId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('share_signal', {
    p_signal_id: signalId,
    p_user_id: userId,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: !!data };
}

export async function findSinaisChannelId(): Promise<string | null> {
  const { data } = await supabase
    .from('channels')
    .select('id')
    .eq('name', 'sinais')
    .maybeSingle();
  return data?.id ?? null;
}

export async function uploadCommunityImage(
  userId: string,
  uri: string,
  mimeType: string,
): Promise<string | null> {
  const ext = (uri.split('.').pop() || 'jpg').toLowerCase();
  const name = `img-${Date.now()}.${ext}`;
  const path = `community/${userId}/${name}`;
  const form = new FormData();
  form.append('file', { uri, name, type: mimeType } as any);
  const { error } = await supabase.storage
    .from('community')
    .upload(path, form as any, { contentType: mimeType, upsert: false });
  if (error) return null;
  return supabase.storage.from('community').getPublicUrl(path).data.publicUrl;
}

export async function reportMessage(messageId: string, reason: string, details?: string): Promise<void> {
  const { error } = await supabase.from('message_reports').insert({
    message_id: messageId,
    reporter_id: (await supabase.auth.getUser()).data.user?.id,
    reason,
    details: details || null,
  });
  if (error) throw error;
}
