import { useEffect } from 'react';
import { useRouter, type Href } from 'expo-router';
import { getInitialNotificationUrl, subscribeToNotificationResponses } from '@/lib/notifications';

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
