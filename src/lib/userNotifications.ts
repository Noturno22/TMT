import { supabase } from '@/lib/supabase';

export interface UserNotification {
  id: string;
  title: string;
  body: string;
  kind: string;
  created_at: string;
}

async function currentUserId(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

/**
 * Notificações persistentes gravadas pelo servidor (ex.: resultado da
 * análise de comprovativos). RLS garante que cada utilizador só vê as suas.
 */
export async function fetchUserNotifications(limit = 30): Promise<UserNotification[]> {
  const userId = await currentUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('user_notifications')
    .select('id, title, body, kind, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as UserNotification[];
}

export async function deleteUserNotification(id: string): Promise<void> {
  await supabase.from('user_notifications').delete().eq('id', id);
}

export async function clearUserNotifications(): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;
  await supabase.from('user_notifications').delete().eq('user_id', userId);
}
