import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase/client';
import { readSessionTokens, readOAuthError } from '../../src/features/auth/utils/oauth';
import { PixelButton } from '../../src/ui/components/pixel-button';
import { colors, spacing, fontSizes } from '../../src/ui/theme/tokens';
import { useTheme } from '../../src/ui/theme/theme-context';
import { useT } from '../../src/lib/i18n';

/**
 * Where Google sends the player back (web). The session is in the link
 * fragment; once stored, the auth guard opens the onboarding or the app.
 * In the mobile app the in-app browser handles the link itself.
 */
export default function AuthCallbackScreen() {
  const T = useT();
  const router = useRouter();
  const { themeKey } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg, backgroundColor: colors.background, gap: spacing.md },
    message: { fontSize: fontSizes.md, color: colors.danger, textAlign: 'center' },
  }), [themeKey]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      router.replace('/(auth)/sign-in');
      return;
    }
    const url = window.location.href;
    const tokens = readSessionTokens(url);
    if (!tokens || readOAuthError(url)) {
      setFailed(true);
      return;
    }
    supabase.auth
      .setSession(tokens)
      .then(({ error }) => {
        // Drop the tokens from the address bar once they are in the session.
        window.history.replaceState(null, '', window.location.pathname);
        if (error) setFailed(true);
      })
      .catch(() => setFailed(true));
  }, [router]);

  return (
    <View style={styles.container}>
      {failed ? (
        <>
          <Text style={styles.message}>{T.auth_oauth_failed}</Text>
          <PixelButton title={T.auth_oauth_back} onPress={() => router.replace('/(auth)/sign-in')} />
        </>
      ) : (
        <ActivityIndicator size="large" color={colors.primary} />
      )}
    </View>
  );
}
