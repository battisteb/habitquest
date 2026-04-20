import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';

/**
 * Listens for notification tap responses and routes to the screen
 * specified in the notification's `data.route` payload.
 *
 * Also handles the initial notification that launched the app cold
 * (getLastNotificationResponseAsync).
 */
export function useNotificationObserver(): void {
  const router = useRouter();
  const handledRef = useRef<string | null>(null);

  function navigate(route: string) {
    if (handledRef.current === route) return;
    handledRef.current = route;
    // Small delay to let the navigator mount
    setTimeout(() => router.push(route as never), 300);
  }

  useEffect(() => {
    if (Platform.OS === 'web') return;

    let subscription: { remove: () => void } | null = null;

    (async () => {
      try {
        const Notifications = await import('expo-notifications');

        // Handle cold-start: app opened via notification tap
        const lastResponse = await Notifications.getLastNotificationResponseAsync();
        if (lastResponse) {
          const route = (lastResponse.notification.request.content.data as any)?.route;
          if (typeof route === 'string') navigate(route);
        }

        // Handle warm/foreground tap responses
        subscription = Notifications.addNotificationResponseReceivedListener((response) => {
          const route = (response.notification.request.content.data as any)?.route;
          if (typeof route === 'string') navigate(route);
        });
      } catch {
        // expo-notifications not available (web or unbuilt native)
      }
    })();

    return () => {
      subscription?.remove();
    };
  }, []);
}
