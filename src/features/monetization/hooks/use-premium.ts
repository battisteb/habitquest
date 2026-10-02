import { use$ } from '@legendapp/state/react';
import { useRouter } from 'expo-router';
import { subscriptionStore$ } from '../stores/subscription-store';
import {
  getMaxFreezeTokens,
  getFreezeCost,
  getStatsHistoryDays,
  canViewShopItem,
} from '../utils/feature-gates';
import { premium$ } from '../stores/premium';

export function usePremium() {
  const isPremium = use$(premium$);
  const isLoading = use$(subscriptionStore$.isLoading);
  const router = useRouter();

  function openPaywall() {
    router.push('/paywall');
  }

  return {
    isPremium,
    isLoading,
    openPaywall,
    // Freeze
    maxFreezeTokens: getMaxFreezeTokens(),
    freezeCost: getFreezeCost(),
    // Stats
    statsHistoryDays: getStatsHistoryDays(),
    canViewFullHistory: isPremium,
    // Shop
    canViewShopItem: (rarity: string) => canViewShopItem(rarity),
  };
}
