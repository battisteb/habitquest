import { useEffect, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { use$ } from '@legendapp/state/react';
import { EvolvedAvatar } from './evolved-avatar';
import { avatarConfigStore$, loadAvatarConfig } from '../stores/avatar-config-store';
import { shopStore$ } from '../../shop/stores/shop-store';
import { authStore$ } from '../../auth/stores/auth-store';
import { heroLine, heroText } from '../utils/hero-line';
import { PixelFrame } from '../../../ui/components/pixel-frame';
import { useTourTarget } from '../../onboarding/tour/tour-targets';
import { colors, spacing, fontSizes, isLightTheme } from '../../../ui/theme/tokens';
import { useTheme } from '../../../ui/theme/theme-context';
import { useT } from '../../../lib/i18n';
import { MoodPip } from '../../mood/components/mood-pip';

interface HeroGreetingProps {
  totalHabits: number;
  /** Quests exist but none is planned today. */
  restDay?: boolean;
  pendingStreaks: number[];
  xp: number;
  level: number;
  /** Pip joins the bubble to ask for and show the mood of the day (from day 7). */
  showMood?: boolean;
}

/** The player's hero on the Today screen, commenting on the day in a speech bubble. */
export function HeroGreeting({ totalHabits, restDay, pendingStreaks, xp, level, showMood = false }: HeroGreetingProps) {
  const T = useT();
  const router = useRouter();
  const { themeKey } = useTheme();
  const styles = useMemo(createStyles, [themeKey]);
  const skinColor = use$(avatarConfigStore$.skinColor);
  const hairColor = use$(avatarConfigStore$.hairColor);
  const eyeColor = use$(avatarConfigStore$.eyeColor);
  const equippedSlots = use$(shopStore$.equippedSlots);
  const tourTarget = useTourTarget('hero');

  useEffect(() => {
    loadAvatarConfig(authStore$.user.get()?.id);
  }, []);

  const text = heroText(T, heroLine({ totalHabits, restDay, pendingStreaks, xp, level }));

  return (
    <View style={styles.row} {...tourTarget}>
      <Pressable
        onPress={() => router.push('/(tabs)/profile')}
        accessibilityRole="button"
        accessibilityLabel={T.hero_a11y}
      >
        <PixelFrame backgroundColor={colors.surface} contentStyle={styles.portrait}>
          <EvolvedAvatar
            level={level}
            size={52}
            hat={equippedSlots?.hat?.item?.sprite_key}
            outfit={equippedSlots?.outfit?.item?.sprite_key}
            accessory={equippedSlots?.accessory?.item?.sprite_key}
            skinColor={skinColor}
            hairColor={hairColor}
            eyeColor={eyeColor}
          />
        </PixelFrame>
      </Pressable>
      <PixelFrame
        style={styles.bubble}
        borderColor={colors.text}
        backgroundColor={isLightTheme() ? colors.surface : colors.text}
        contentStyle={styles.bubbleFace}
      >
        {showMood ? (
          <MoodPip>
            <Text style={styles.bubbleText} testID="hero-line">{text}</Text>
          </MoodPip>
        ) : (
          <Text style={styles.bubbleText} testID="hero-line">{text}</Text>
        )}
      </PixelFrame>
    </View>
  );
}

function createStyles() {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
    },
    portrait: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    bubble: { flex: 1, marginBottom: spacing.sm },
    bubbleFace: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs + 2 },
    bubbleText: { color: isLightTheme() ? colors.text : colors.background, fontSize: fontSizes.sm, fontWeight: '500', lineHeight: 17 },
  });
}
