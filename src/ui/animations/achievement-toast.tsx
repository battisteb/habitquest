import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Pressable } from 'react-native';
import { colors, fontSizes, spacing } from '../theme/tokens';

const CATEGORY_ICONS: Record<string, string> = {
  streak: '🔥',
  completion: '✅',
  xp: '⭐',
  social: '👥',
  shop: '🛒',
  special: '🏆',
};

interface AchievementToastProps {
  name: string;
  description: string;
  category: string;
  xpReward: number;
  goldReward: number;
  onDismiss: () => void;
}

export function AchievementToast({
  name,
  description,
  category,
  xpReward,
  goldReward,
  onDismiss,
}: AchievementToastProps) {
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Slide in
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        tension: 80,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-dismiss after 3.5s
    const timer = setTimeout(() => dismiss(), 3500);
    return () => clearTimeout(timer);
  }, []);

  function dismiss() {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss());
  }

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }], opacity }]}>
      <Pressable style={styles.inner} onPress={dismiss}>
        <View style={styles.badge}>
          <Text style={styles.badgeIcon}>🏅</Text>
        </View>
        <View style={styles.content}>
          <Text style={styles.label}>ACHIEVEMENT UNLOCKED</Text>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.description} numberOfLines={1}>{description}</Text>
          {(xpReward > 0 || goldReward > 0) && (
            <View style={styles.rewards}>
              {xpReward > 0 && (
                <Text style={styles.xpReward}>+{xpReward} XP</Text>
              )}
              {goldReward > 0 && (
                <Text style={styles.goldReward}>+{goldReward}g</Text>
              )}
            </View>
          )}
        </View>
        <Text style={styles.categoryIcon}>
          {CATEGORY_ICONS[category] ?? '🏅'}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    zIndex: 999,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.accent,
    borderRadius: 4,
    borderBottomWidth: 4,
    padding: spacing.sm,
    gap: spacing.sm,
    shadowColor: colors.accent,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent + '22',
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeIcon: { fontSize: 22 },
  content: { flex: 1, gap: 1 },
  label: {
    color: colors.accent,
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  name: {
    color: colors.text,
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
  },
  description: {
    color: colors.textMuted,
    fontSize: 10,
  },
  rewards: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 2,
  },
  xpReward: {
    color: colors.xp,
    fontSize: 10,
    fontWeight: 'bold',
  },
  goldReward: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: 'bold',
  },
  categoryIcon: { fontSize: 24 },
});
