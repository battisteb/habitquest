/**
 * Sentry error & crash monitoring.
 *
 * Fully gated on EXPO_PUBLIC_SENTRY_DSN: with no DSN set (the default), every
 * function here is a no-op and the SDK never initialises — so merging this is
 * safe and changes nothing until a DSN is configured. See
 * docs/monitoring-sentry.md for the one-time setup.
 */
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

/** True once a DSN is configured (Sentry is active). */
export const sentryEnabled = Boolean(DSN);

/** Initialise Sentry. No-op without a DSN, and silent in development. */
export function initSentry(): void {
  if (!DSN) return;
  const version = Constants.expoConfig?.version;
  Sentry.init({
    dsn: DSN,
    // Don't send events while developing; only real builds report.
    enabled: !__DEV__,
    environment: __DEV__ ? 'development' : 'production',
    release: version ? `habitquest@${version}` : undefined,
    // No personal data: we only want the stack trace and app context.
    sendDefaultPii: false,
    // Light performance sampling; raise later if we want more traces.
    tracesSampleRate: 0.2,
  });
}

/**
 * Wrap the root component so render errors and performance are captured.
 * Returns the component unchanged when Sentry is disabled.
 */
export function wrapRoot<C>(component: C): C {
  return DSN ? (Sentry.wrap(component as never) as C) : component;
}

export { Sentry };
