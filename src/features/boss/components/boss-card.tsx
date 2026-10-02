import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { use$ } from '@legendapp/state/react';
import { habitsStore$ } from '../../habits/stores/habits-store';
import { strips } from '../../companion/components/companion';
import { PixelFrame } from '../../../ui/components/pixel-frame';
import { colors, fontSizes, fonts, pixelSize, spacing } from '../../../ui/theme/tokens';
import { useTheme } from '../../../ui/theme/theme-context';
import { useT } from '../../../lib/i18n';
import { hitsToDefeat } from '../../../lib/constants/game-config';
import { BOSS_GRID, BOSS_PALETTES, BOSS_SPRITES, type BossKey } from '../sprites';
import { fetchWeeklyBoss, type WeeklyBoss } from '../api';

function BossSprite({ bossKey, size, defeated }: { bossKey: BossKey; size: number; defeated: boolean }) {
  const parts = useMemo(() => strips(BOSS_SPRITES[bossKey], BOSS_PALETTES[bossKey]), [bossKey]);
  const cell = size / BOSS_GRID;
  return (
    <View style={{ width: size, height: size, opacity: defeated ? 0.35 : 1 }}>
      {parts.map(([x, y, w, color], i) => (
        <View
          key={i}
          style={{ position: 'absolute', left: x * cell, top: y * cell, width: w * cell + 0.5, height: cell + 0.5, backgroundColor: color }}
        />
      ))}
    </View>
  );
}

/**
 * The boss of the week (I9) on the Quests screen: one compact line with its
 * HP; a tap shows its story. It shakes when a validated quest hits it.
 */
export function BossCard() {
  const T = useT();
  const { themeKey } = useTheme();
  const styles = useMemo(createStyles, [themeKey]);
  const [boss, setBoss] = useState<WeeklyBoss | null>(null);
  const [open, setOpen] = useState(false);
  const shake = useRef(new Animated.Value(0)).current;
  const completions = use$(habitsStore$.todayCompletions);
  const doneToday = Object.values(completions).filter(Boolean).length;

  useEffect(() => {
    let cancelled = false;
    fetchWeeklyBoss()
      .then((b) => {
        if (cancelled) return;
        setBoss((prev) => {
          if (prev && b.damage > prev.damage) {
            Animated.sequence(
              [6, -6, 4, -4, 0].map((x) => Animated.timing(shake, { toValue: x, duration: 60, useNativeDriver: true })),
            ).start();
          }
          return b;
        });
      })
      .catch(() => {
        // Offline: the card just stays hidden.
      });
    return () => {
      cancelled = true;
    };
  }, [doneToday, shake]);

  if (!boss) return null;
  const name = T[`boss_${boss.boss_key}_name`];
  const left = Math.max(0, boss.hp_max - boss.damage);
  const pct = boss.hp_max > 0 ? left / boss.hp_max : 0;
  const hits = hitsToDefeat(boss.hp_max, boss.damage);

  return (
    <Pressable onPress={() => setOpen((o) => !o)} accessibilityRole="button" accessibilityState={{ expanded: open }} testID="boss-card">
      <PixelFrame borderColor={boss.defeated ? colors.success : colors.danger} backgroundColor={colors.surface} contentStyle={styles.card}>
        <View style={styles.row}>
          <Animated.View style={{ transform: [{ translateX: shake }] }}>
            <BossSprite bossKey={boss.boss_key} size={44} defeated={boss.defeated} />
          </Animated.View>
          <View style={styles.info}>
            <Text style={styles.kicker}>{T.boss_kicker}</Text>
            <Text style={styles.name} numberOfLines={1}>{name}</Text>
            {boss.defeated ? (
              <Text style={styles.won} testID="boss-defeated">
                {T.boss_defeated.replace('{xp}', String(boss.reward_xp)).replace('{gold}', String(boss.reward_gold))}
              </Text>
            ) : (
              <View style={styles.hpRow}>
                <View style={styles.hpTrack}>
                  <View style={[styles.hpFill, { width: `${Math.round(pct * 100)}%` }]} />
                </View>
                <Text style={styles.hpText} testID="boss-hp">{left}/{boss.hp_max}</Text>
              </View>
            )}
          </View>
          <Text style={styles.chevron}>{open ? '▲' : '▼'}</Text>
        </View>
        {open && (
          <View style={styles.more}>
            <Text style={styles.story}>{T[`boss_${boss.boss_key}_story`]}</Text>
            <Text style={styles.rule}>
              {boss.defeated
                ? T.boss_next_week
                : T.boss_rule.replace('{n}', String(hits))
                    .replace('{xp}', String(boss.reward_xp)).replace('{gold}', String(boss.reward_gold))}
            </Text>
          </View>
        )}
      </PixelFrame>
    </Pressable>
  );
}

function createStyles() {
  return StyleSheet.create({
    card: { padding: spacing.sm, gap: spacing.sm },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    info: { flex: 1, minWidth: 0, gap: 2 },
    kicker: { color: colors.danger, fontFamily: fonts.bold, fontSize: pixelSize(fontSizes.xs), letterSpacing: 1.5 },
    name: { color: colors.text, fontFamily: fonts.bold, fontSize: pixelSize(fontSizes.md) },
    hpRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    hpTrack: { flex: 1, height: 8, backgroundColor: colors.background, borderWidth: 2, borderColor: colors.border },
    hpFill: { height: '100%', backgroundColor: colors.danger },
    hpText: { color: colors.textSecondary, fontFamily: fonts.bold, fontSize: pixelSize(fontSizes.xs) },
    won: { color: colors.success, fontFamily: fonts.bold, fontSize: pixelSize(fontSizes.sm) },
    chevron: { color: colors.textMuted, fontSize: 12 },
    more: { gap: spacing.xs },
    story: { color: colors.textSecondary, fontSize: fontSizes.sm, lineHeight: 19, fontStyle: 'italic' },
    rule: { color: colors.text, fontSize: fontSizes.sm, lineHeight: 19 },
  });
}
