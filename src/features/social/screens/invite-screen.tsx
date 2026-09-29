import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { PixelButton } from '../../../ui/components/pixel-button';
import { colors, fontSizes, spacing, fonts, pixelSize } from '../../../ui/theme/tokens';
import { useTheme } from '../../../ui/theme/theme-context';
import { useT } from '../../../lib/i18n';
import { acceptInvite, type InviteResult } from '../utils/invite';
import { fetchFriends } from '../stores/friends-store';

/** Landing screen of https://habitquest.expo.app/invite/<code>. */
export default function InviteScreen() {
  const T = useT();
  const { themeKey } = useTheme();
  const styles = useMemo(createStyles, [themeKey]);
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code: string }>();
  const [result, setResult] = useState<InviteResult | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!code) return;
    acceptInvite(code)
      .then((r) => {
        setResult(r);
        if (r.status === 'friends' || r.status === 'already_friends') fetchFriends().catch(() => {});
      })
      .catch(() => setFailed(true));
  }, [code]);

  if (!result && !failed) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  let emoji = '⚠️';
  let title = T.invite_invalid_title;
  let body = T.invite_invalid_body;
  if (failed) {
    body = T.invite_error_body;
  } else if (result?.status === 'friends' || result?.status === 'already_friends') {
    emoji = '🤝';
    title = T.invite_friends_title.replace('{name}', result.username);
    body = result.status === 'friends' ? T.invite_friends_body : T.invite_already_body;
  } else if (result?.status === 'self') {
    emoji = '🙃';
    title = T.invite_self_title;
    body = T.invite_self_body;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      <PixelButton title={T.invite_cta} onPress={() => router.replace('/(tabs)/social')} />
    </View>
  );
}

function createStyles() {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
      gap: spacing.md,
    },
    emoji: { fontSize: 64 },
    title: { fontSize: pixelSize(fontSizes.xl), fontFamily: fonts.bold, color: colors.text, textAlign: 'center' },
    body: { fontSize: fontSizes.md, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.md },
  });
}
