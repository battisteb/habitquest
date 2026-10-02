import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useRouter } from 'expo-router';
import { use$ } from '@legendapp/state/react';
import { tutorialSeen$ } from '../../onboarding/tutorial-state';
import { subscriptionStore$ } from '../stores/subscription-store';
import { premium$ } from '../stores/premium';
import {
  loadTrialOfferState,
  recordTrialOfferRefused,
  recordTrialOfferShown,
  shouldOfferTrialAfterTutorial,
  shouldRemindTrial,
  trialEndNoticeAt,
} from '../utils/trial-offer';
import { scheduleTrialEndingNotice } from '../../notifications/utils/notification-service';
import { showDialog } from '../../../lib/app-alert';
import { getStrings } from '../../../lib/i18n';

/**
 * Offers the 14-day free trial: the Premium screen once right after the
 * tutorial, then a small reminder now and then (rules in utils/trial-offer).
 * Also schedules the "trial ends in 2 days" notification. Renders nothing.
 */
export function TrialOfferHost() {
  const router = useRouter();
  const tutorialSeen = use$(tutorialSeen$);
  const trialProducts = use$(subscriptionStore$.trialProducts);
  const isPremium = use$(premium$);
  const trialEndsAt = use$(subscriptionStore$.trialEndsAt);
  const eligible = trialProducts.length > 0;

  // Right after the tutorial (or as soon as the store answers).
  useEffect(() => {
    if (!tutorialSeen) return;
    const state = loadTrialOfferState();
    if (shouldOfferTrialAfterTutorial(state, { eligible, isPremium })) {
      recordTrialOfferShown(true);
      router.push('/paywall?from=tutorial');
    }
  }, [tutorialSeen, eligible, isPremium, router]);

  // Reminders, checked when the app comes back to the foreground.
  useEffect(() => {
    const check = () => {
      if (!tutorialSeen$.get()) return;
      const state = loadTrialOfferState();
      if (!state.introShown) return;
      const ctx = { eligible: subscriptionStore$.trialProducts.get().length > 0, isPremium: premium$.get() };
      if (!shouldRemindTrial(state, ctx)) return;
      recordTrialOfferShown(false);
      const T = getStrings();
      showDialog(T.trial_reminder_title, T.trial_reminder_msg, [
        { text: T.trial_reminder_later, style: 'cancel', onPress: () => recordTrialOfferRefused() },
        { text: T.trial_reminder_try, onPress: () => router.push('/paywall?from=reminder') },
      ]);
    };
    check();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') check();
    });
    return () => sub.remove();
  }, [router]);

  // Warn 2 days before the trial turns into a paid subscription.
  useEffect(() => {
    scheduleTrialEndingNotice(trialEndNoticeAt(trialEndsAt)).catch(() => {});
  }, [trialEndsAt]);

  return null;
}
