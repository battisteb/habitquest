import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PixelButton } from '../../../ui/components/pixel-button';
import { PixelFrame } from '../../../ui/components/pixel-frame';
import { useT } from '../../../lib/i18n';
import { colors, fontSizes, fonts, pixelSize, spacing } from '../../../ui/theme/tokens';
import { useTheme } from '../../../ui/theme/theme-context';

/** Each mechanic: what research says, then where it lives in the app (G8). */
export const HOW_SECTIONS = ['regular', 'anchor', 'mini', 'identity', 'why', 'social', 'fresh', 'calm'] as const;
type Section = (typeof HOW_SECTIONS)[number];

/**
 * "How HabitQuest helps you": the game's mechanics explained honestly, with
 * their sources, and what a game cannot do.
 */
export default function HowItHelpsScreen() {
  const T = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { themeKey } = useTheme();
  const styles = useMemo(createStyles, [themeKey]);
  const text = (s: Section, part: 'title' | 'body' | 'app') => T[`how_${s}_${part}`];

  return (
    <ScrollView
      style={[styles.screen, { paddingTop: insets.top }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
    >
      <PixelButton title={T.common_back} onPress={() => router.back()} variant="ghost" style={styles.back} />
      <Text style={styles.title}>{T.how_title}</Text>
      <Text style={styles.intro}>{T.how_intro}</Text>

      {HOW_SECTIONS.map((s) => (
        <PixelFrame key={s} backgroundColor={colors.surface} contentStyle={styles.card}>
          <Text style={styles.cardTitle}>{text(s, 'title')}</Text>
          <Text style={styles.body}>{text(s, 'body')}</Text>
          <View style={styles.appBox} testID={`how-${s}`}>
            <Text style={styles.appLabel}>{T.how_in_app}</Text>
            <Text style={styles.appText}>{text(s, 'app')}</Text>
          </View>
        </PixelFrame>
      ))}

      <PixelFrame backgroundColor={colors.surface} borderColor={colors.accent} contentStyle={styles.card}>
        <Text style={[styles.cardTitle, { color: colors.accent }]}>{T.how_honest_title}</Text>
        <Text style={styles.body}>{T.how_honest_body}</Text>
      </PixelFrame>
    </ScrollView>
  );
}

function createStyles() {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.md, gap: spacing.md },
    back: { alignSelf: 'flex-start' },
    title: { color: colors.text, fontFamily: fonts.bold, fontSize: pixelSize(fontSizes.xl), letterSpacing: 2 },
    intro: { color: colors.textSecondary, fontSize: fontSizes.md, lineHeight: 22 },
    card: { padding: spacing.md, gap: spacing.sm },
    cardTitle: { color: colors.primary, fontFamily: fonts.bold, fontSize: pixelSize(fontSizes.md), letterSpacing: 1 },
    body: { color: colors.text, fontSize: fontSizes.sm, lineHeight: 20 },
    appBox: { borderLeftWidth: 3, borderLeftColor: colors.primary, paddingLeft: spacing.sm, gap: 2 },
    appLabel: { color: colors.textSecondary, fontFamily: fonts.bold, fontSize: pixelSize(fontSizes.xs), letterSpacing: 1 },
    appText: { color: colors.textSecondary, fontSize: fontSizes.sm, lineHeight: 20 },
  });
}
