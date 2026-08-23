import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { countUnreadUserNotifications } from '@/lib/userNotifications';

const QUERY_KEY = ['user-notifications-unread'];

/**
 * Conta notificações server-side não lidas (user_notifications.read = false).
 * Atualiza em tempo real via postgres_changes e faz polling de segurança.
 * Usado pelo sino no header do dashboard.
 */
export function useUnreadUserNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [...QUERY_KEY, user?.id ?? 'anon'],
    queryFn: countUnreadUserNotifications,
    enabled: !!user,
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`user-notifs-unread-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return { unread: query.data ?? 0 };
}
