import type { Href } from 'expo-router';

interface BackRouter {
  canGoBack: () => boolean;
  back: () => void;
  replace: (href: Href) => void;
}

/**
 * Back that always works. On the web, a page opened directly (typed link,
 * reload, link from elsewhere) has no history: router.back() did nothing and
 * the player was stuck on the page. Then we go to a sensible screen instead.
 */
export function goBack(router: BackRouter, fallback: Href = '/(tabs)/today'): void {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
