import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  MODES,
  getActiveMode,
  activateMode,
  deactivateMode,
  getRemainingDays,
  getModeDefinition,
  type ContextualModeKey,
} from '../../src/features/habits/utils/contextual-mode';
import { PixelButton } from '../../src/ui/components/pixel-button';
import { colors, fontSizes, spacing } from '../../src/ui/theme/tokens';
import { useTheme } from '../../src/ui/theme/theme-context';

export default function ContextualModeScreen() {
  const { themeKey } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: colors.text,
    letterSpacing: 2,
  },

  // Active banner
  activeBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primary + '18',
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 4,
    padding: spacing.md,
    gap: spacing.sm,
  },
  activeBannerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  activeBannerEmoji: {
    fontSize: 28,
  },
  activeBannerName: {
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
    color: colors.primary,
    letterSpacing: 1,
  },
  activeBannerDays: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  deactivateButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.danger,
  },
  deactivateButtonText: {
    color: colors.danger,
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },

  // Description
  description: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    lineHeight: 18,
  },

  // Mode card
  card: {
    backgroundColor: colors.surface,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  cardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardEmoji: {
    fontSize: 32,
  },
  cardTitleBlock: {
    flex: 1,
  },
  cardName: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: colors.text,
    letterSpacing: 1,
  },
  cardNameActive: {
    color: colors.primary,
  },
  cardDuration: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  cardDescription: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  // Category chips
  categoriesRow: {
    gap: spacing.sm,
  },
  categoryGroup: {
    gap: spacing.xs,
  },
  categoryGroupLabel: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    color: colors.textMuted,
    letterSpacing: 1,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chipFocus: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: colors.success,
    backgroundColor: colors.success + '18',
  },
  chipFocusText: {
    fontSize: fontSizes.xs,
    color: colors.success,
    fontWeight: 'bold',
  },
  chipPause: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: colors.textMuted,
    backgroundColor: colors.border,
  },
  chipPauseText: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
  },

  // Active tag
  activeTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.primary + '22',
  },
  activeTagText: {
    color: colors.primary,
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
}), [themeKey]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeMode, setActiveMode] = useState(() => getActiveMode());

  function handleActivate(key: ContextualModeKey) {
    activateMode(key);
    router.back();
  }

  function handleDeactivate() {
    deactivateMode();
    setActiveMode(null);
  }

  const activeDef = activeMode ? getModeDefinition(activeMode.key) : null;

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <View style={styles.header}>
        <PixelButton title="Back" onPress={() => router.back()} variant="ghost" />
        <Text style={styles.title}>FOCUS MODE</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Active mode banner */}
      {activeMode && activeDef && (
        <View style={styles.activeBanner}>
          <View style={styles.activeBannerInfo}>
            <Text style={styles.activeBannerEmoji}>{activeDef.emoji}</Text>
            <View>
              <Text style={styles.activeBannerName}>{activeDef.name.toUpperCase()}</Text>
              <Text style={styles.activeBannerDays}>{getRemainingDays(activeMode)} days remaining</Text>
            </View>
          </View>
          <Pressable style={styles.deactivateButton} onPress={handleDeactivate}>
            <Text style={styles.deactivateButtonText}>DEACTIVATE</Text>
          </Pressable>
        </View>
      )}

      {/* Description */}
      <Text style={styles.description}>
        Focus modes temporarily adjust which habit categories are active. Paused categories keep their streaks frozen.
      </Text>

      {/* Mode cards */}
      {MODES.map((mode) => {
        const isActive = activeMode?.key === mode.key;
        return (
          <View key={mode.key} style={[styles.card, isActive && styles.cardActive]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardEmoji}>{mode.emoji}</Text>
              <View style={styles.cardTitleBlock}>
                <Text style={[styles.cardName, isActive && styles.cardNameActive]}>
                  {mode.name.toUpperCase()}
                </Text>
                <Text style={styles.cardDuration}>{mode.durationDays} days</Text>
              </View>
            </View>

            <Text style={styles.cardDescription}>{mode.description}</Text>

            <View style={styles.categoriesRow}>
              <View style={styles.categoryGroup}>
                <Text style={styles.categoryGroupLabel}>FOCUS</Text>
                <View style={styles.chips}>
                  {mode.focusCategories.map((cat) => (
                    <View key={cat} style={styles.chipFocus}>
                      <Text style={styles.chipFocusText}>{cat}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <View style={styles.categoryGroup}>
                <Text style={styles.categoryGroupLabel}>PAUSE</Text>
                <View style={styles.chips}>
                  {mode.pauseCategories.map((cat) => (
                    <View key={cat} style={styles.chipPause}>
                      <Text style={styles.chipPauseText}>{cat}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {!isActive && (
              <PixelButton
                title="Activate"
                onPress={() => handleActivate(mode.key)}
                variant="primary"
              />
            )}
            {isActive && (
              <View style={styles.activeTag}>
                <Text style={styles.activeTagText}>ACTIVE</Text>
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}


