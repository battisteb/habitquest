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
}

export function AchievementCard({
  name,
  description,
  category,
  isUnlocked,
  xpReward,
  goldReward,
}: AchievementCardProps) {
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
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.md,
    gap: spacing.md,
  },
  locked: {
    opacity: 0.5,
  },
  icon: {
    fontSize: 24,
    width: 32,
    textAlign: 'center',
  },
  info: {
    flex: 1,
    gap: 2,
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
  },
});
