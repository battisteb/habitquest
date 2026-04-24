import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Alert, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PixelButton } from '../../src/ui/components/pixel-button';
import { createChallenge } from '../../src/features/social/stores/challenges-store';
import { colors, fontSizes, spacing } from '../../src/ui/theme/tokens';
import { useTheme } from '../../src/ui/theme/theme-context';

const CHALLENGE_TYPES = [
  { key: 'xp_race', label: 'XP Race', description: 'Earn the most XP' },
  {
    key: 'completion_count',
    label: 'Completions',
    description: 'Complete the most habits',
  },
];

const DURATION_OPTIONS = [
  { days: 3, label: '3 days' },
  { days: 7, label: '1 week' },
  { days: 14, label: '2 weeks' },
];

const WAGER_OPTIONS = [5, 10, 25, 50];

export default function CreateChallengeScreen() {
  const { themeKey } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: colors.text,
    letterSpacing: 2,
  },
  opponent: {
    fontSize: fontSizes.sm,
    color: colors.primary,
    fontWeight: 'bold',
    marginTop: 2,
  },
  summary: {
    marginHorizontal: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
  },
  summaryText: {
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
  },
  summaryVal: {
    color: colors.xp,
    fontWeight: 'bold',
  },
  section: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    color: colors.textMuted,
    letterSpacing: 1,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  optionCard: {
    flex: 1,
    minWidth: 120,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.md,
    gap: spacing.xs,
  },
  optionCardActive: {
    borderColor: colors.primary,
  },
  optionLabel: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: colors.text,
  },
  optionLabelActive: {
    color: colors.primary,
  },
  optionDesc: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  chipText: {
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.background,
  },
}), [themeKey]);
  const { opponentId, opponentName } = useLocalSearchParams<{ opponentId: string; opponentName?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [type, setType] = useState('xp_race');
  const [duration, setDuration] = useState(7);
  const [wager, setWager] = useState(10);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-compute target based on type + duration
  function getTarget() {
    if (type === 'xp_race') return duration * 50;       // 50 XP/day pace
    if (type === 'completion_count') return duration * 3; // 3 habits/day pace
    return duration * 10;
  }

  async function handleCreate() {
    if (!opponentId) return;
    setIsSubmitting(true);
    try {
      await createChallenge(opponentId, type, getTarget(), wager, duration);
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to create challenge');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <PixelButton title="Back" onPress={() => router.back()} variant="ghost" />
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.title}>NEW CHALLENGE</Text>
          {opponentName && (
            <Text style={styles.opponent}>vs {opponentName}</Text>
          )}
        </View>
        <View style={{ width: 60 }} />
      </View>

      {/* Challenge type */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>TYPE</Text>
        <View style={styles.optionsRow}>
          {CHALLENGE_TYPES.map((ct) => (
            <Pressable
              key={ct.key}
              style={[styles.optionCard, type === ct.key && styles.optionCardActive]}
              onPress={() => setType(ct.key)}
            >
              <Text
                style={[
                  styles.optionLabel,
                  type === ct.key && styles.optionLabelActive,
                ]}
              >
                {ct.label}
              </Text>
              <Text style={styles.optionDesc}>{ct.description}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Duration */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>DURATION</Text>
        <View style={styles.optionsRow}>
          {DURATION_OPTIONS.map((d) => (
            <Pressable
              key={d.days}
              style={[
                styles.chip,
                duration === d.days && styles.chipActive,
              ]}
              onPress={() => setDuration(d.days)}
            >
              <Text
                style={[
                  styles.chipText,
                  duration === d.days && styles.chipTextActive,
                ]}
              >
                {d.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Wager */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>GOLD WAGER</Text>
        <View style={styles.optionsRow}>
          {WAGER_OPTIONS.map((w) => (
            <Pressable
              key={w}
              style={[styles.chip, wager === w && styles.chipActive]}
              onPress={() => setWager(w)}
            >
              <Text
                style={[styles.chipText, wager === w && styles.chipTextActive]}
              >
                {w}g
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          Target: <Text style={styles.summaryVal}>{getTarget()} {type === 'xp_race' ? 'XP' : 'habits'}</Text>
          {'  ·  '}Wager: <Text style={[styles.summaryVal, { color: colors.accent }]}>{wager}g</Text>
        </Text>
      </View>

      <PixelButton
        title={isSubmitting ? 'Sending...' : '⚔️ Send Challenge'}
        onPress={handleCreate}
        disabled={isSubmitting}
        style={{ margin: spacing.md }}
      />
    </View>
  );
}


