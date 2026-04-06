import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSizes, spacing } from '../../../ui/theme/tokens';

const CATEGORY_ICONS: Record<string, string> = {
  streak: '🔥',
  completion: '✅',
  xp: '⭐',
  social: '👥',
  shop: '🛒',
  special: '🏆',
};

interface AchievementCardProps {
  name: string;
  description: string;
  category: string;
  isUnlocked: boolean;
  xpReward: number;
  goldReward: number;
  threshold: number;
  currentValue: number;
}

export function AchievementCard({
  name,
  description,
  category,
  isUnlocked,
  xpReward,
  goldReward,
  threshold,
  currentValue,
}: AchievementCardProps) {
  const progress = threshold > 0 ? Math.min(currentValue / threshold, 1) : 0;
  const showProgress = !isUnlocked && threshold > 0 && currentValue > 0;

  return (
    <View style={[styles.card, !isUnlocked && styles.locked]}>
      <Text style={styles.icon}>
        {isUnlocked ? CATEGORY_ICONS[category] ?? '🏅' : '🔒'}
      </Text>
      <View style={styles.info}>
        <Text style={[styles.name, !isUnlocked && styles.lockedText]}>
          {name}
        </Text>
        <Text style={styles.description}>{description}</Text>

        {showProgress && (
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
            <Text style={styles.progressLabel}>
              {currentValue} / {threshold}
            </Text>
          </View>
        )}

        {(xpReward > 0 || goldReward > 0) && (
          <View style={styles.rewards}>
            {xpReward > 0 && <Text style={styles.xpReward}>+{xpReward} XP</Text>}
            {goldReward > 0 && (
              <Text style={styles.goldReward}>+{goldReward}g</Text>
            )}
          </View>
        )}
      </View>
      {isUnlocked && <Text style={styles.checkmark}>✓</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.md,
    gap: spacing.md,
  },
  locked: {
    opacity: 0.6,
  },
  icon: {
    fontSize: 24,
    width: 32,
    textAlign: 'center',
    marginTop: 2,
  },
  info: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: colors.text,
  },
  lockedText: {
    color: colors.textMuted,
  },
  description: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 4,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.xp,
    borderRadius: 2,
  },
  progressLabel: {
    fontSize: 9,
    color: colors.textMuted,
    fontWeight: 'bold',
    minWidth: 40,
    textAlign: 'right',
  },
  rewards: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 2,
  },
  xpReward: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    color: colors.xp,
  },
  goldReward: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    color: colors.accent,
  },
  checkmark: {
    fontSize: fontSizes.lg,
    color: colors.success,
    fontWeight: 'bold',
    marginTop: 2,
  },
});
