import { useMemo } from 'react';
import { use$ } from '@legendapp/state/react';
import { shopStore$ } from '../stores/shop-store';
import { ownedThemes } from '../utils/owned-themes';

export function useOwnedThemes() {
  const items = use$(shopStore$.items);
  const ownedIds = use$(shopStore$.ownedItemIds);
  return useMemo(() => ownedThemes(items, ownedIds), [items, ownedIds]);
}
