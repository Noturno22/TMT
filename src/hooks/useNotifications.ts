import { useEffect } from 'react';
import { useRouter, type Href } from 'expo-router';
import { getInitialNotificationUrl, scheduleUpgradePrompt, subscribeToNotificationResponses } from '@/lib/notifications';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';

export function useNotificationNavigation() {
  const router = useRouter();

  useEffect(() => {
    let active = true;

    getInitialNotificationUrl().then((url) => {
      if (active && url) router.push(url as Href);
    });

    const sub = subscribeToNotificationResponses((url) => router.push(url as Href));

    return () => {
      active = false;
      sub.remove();
    };
  }, [router]);
}

export function useUpgradeNotification(delayMs = 6000) {
  const { user } = useAuth();
  const { isPremium, loading } = useSubscription();

  useEffect(() => {
    if (!user || loading || isPremium) return;
    const timer = setTimeout(() => {
      scheduleUpgradePrompt(user.id).catch(() => {});
    }, delayMs);
    return () => clearTimeout(timer);
  }, [user, isPremium, loading, delayMs]);
}
