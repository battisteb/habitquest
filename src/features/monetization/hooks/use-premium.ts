import { use$ } from '@legendapp/state/react';
import { useRouter } from 'expo-router';
import { subscriptionStore$ } from '../stores/subscription-store';
import { profileStore$, isServerPremium } from '../../gamification/stores/profile-store';
import {
  getMaxFreezeTokens,
  getFreezeCost,
  getDuelCooldownHours,
  canStartDuel,
  duelCooldownRemainingMinutes,
  getStatsHistoryDays,
  canViewShopItem,
} from '../utils/feature-gates';

export function usePremium() {
  const profile = use$(profileStore$.profile);
  // RevenueCat on phones, or the server status (webhook), the only source on the web.
  const isPremium = use$(subscriptionStore$.isPremium) || (!!profile && isServerPremium(profile));
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
    // Duels
    duelCooldownHours: getDuelCooldownHours(),
    canStartDuel: (lastDuelAt: string | null) => canStartDuel(lastDuelAt),
    duelCooldownRemainingMinutes: (lastDuelAt: string | null) =>
      duelCooldownRemainingMinutes(lastDuelAt),
    // Stats
    statsHistoryDays: getStatsHistoryDays(),
    canViewFullHistory: isPremium,
    // Shop
    canViewShopItem: (rarity: string) => canViewShopItem(rarity),
  };
}
