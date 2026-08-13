import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { subscribeToChanges } from '@/lib/realtime';
import { STRIPE_CHECKOUT_URL, SUPABASE_ANON_KEY } from '@/lib/env';
import { useAuth } from '@/hooks/useAuth';
import type { Subscription } from '@/core/types';

export interface CheckoutResult {
  ok: boolean;
  url?: string;
  error?: string;
}

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    setSubscription((data as Subscription | null) ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 0);
    if (!user) return () => clearTimeout(timer);

    const cleanup = subscribeToChanges('subscriptions', [
      {
        table: 'subscriptions',
        filter: `user_id=eq.${user.id}`,
        onEvent: () => fetchData(),
      },
    ]);

    return () => {
      clearTimeout(timer);
      cleanup();
    };
  }, [user, fetchData]);

  const isPremium = subscription?.status === 'active';

  const checkout = async (priceId: string, currency: string): Promise<CheckoutResult> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { ok: false, error: 'no_session' };

    try {
      const res = await fetch(STRIPE_CHECKOUT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ priceId, currency }),
      });
      const data = await res.json();
      if (data.error) return { ok: false, error: data.error };
      if (!data.url) return { ok: false, error: 'URL de pagamento não recebida.' };
      return { ok: true, url: data.url };
    } catch {
      return { ok: false, error: 'Erro de ligação. Tenta novamente.' };
    }
  };

  return { user, subscription, isPremium, loading, checkout };
}
