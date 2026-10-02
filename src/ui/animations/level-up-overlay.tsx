import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { use$ } from '@legendapp/state/react';
import { colors, fontSizes, fonts, pixelSize, spacing } from '../theme/tokens';
import { useT } from '../../lib/i18n';
import { titleLabel } from '../../lib/i18n/labels';
import { getRankForLevel } from '../../lib/constants/game-config';
import { PixelAvatar } from '../../features/avatar/renderer/pixel-avatar';
import { avatarConfigStore$ } from '../../features/avatar/stores/avatar-config-store';
import { shopStore$ } from '../../features/shop/stores/shop-store';

interface LevelUpOverlayProps {
  visible: boolean;
  newLevel: number;
  onComplete?: () => void;
}

/** Retro timing: whole frames, no easing (ADR 011). */
const FPS = 12;
const LAST_FRAME = 40; // ~3.3 s, then it closes by itself
const HERO = 120;
// Eight directions for the pixel sparks.
const DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]] as const;

/**
 * Level-up celebration in the pixel art direction: the player's own hero
 * appears in a blinking pixel aura, square sparks burst out frame by frame,
 * "LEVEL UP!" is typed letter by letter and the level ticks to the new one;
 * a new rank gets its own banner in the rank color. Tap to close.
 */
export function LevelUpOverlay({ visible, newLevel, onComplete }: LevelUpOverlayProps) {
  const T = useT();
  const look = use$(avatarConfigStore$);
  const gear = use$(shopStore$.equippedSlots);
  const [frame, setFrame] = useState(0);
  const done = useRef(false);

  useEffect(() => {
    if (!visible) return;
    done.current = false;
    setFrame(0);
    const id = setInterval(() => setFrame((f) => f + 1), 1000 / FPS);
    return () => clearInterval(id);
  }, [visible]);

  useEffect(() => {
    if (visible && frame >= LAST_FRAME && !done.current) {
      done.current = true;
      onComplete?.();
    }
  }, [frame, visible, onComplete]);

  if (!visible) return null;

  const rank = getRankForLevel(newLevel);
  const newRank = newLevel > 1 && rank.minLevel === newLevel;
  const title = T.level_up_title;
  // Steps: dim in (0-3), hero pops (2-5), sparks (4-16), title typed (6+), level ticks (10), rank (14+), out (37-40).
  const dim = frame >= LAST_FRAME - 3 ? (LAST_FRAME - frame) / 4 : Math.min(1, (frame + 1) / 4);
  const heroScale = frame < 2 ? 0 : frame < 3 ? 0.6 : frame < 4 ? 1.15 : 1;
  const typed = title.slice(0, Math.max(0, frame - 6));
  const levelShown = frame < 10 ? newLevel - 1 : newLevel;
  const auraOn = frame >= 3 && frame % 2 === 0;

  const close = () => {
    if (done.current) return;
    done.current = true;
    onComplete?.();
  };

  return (
    <Pressable style={[styles.overlay, { opacity: Math.max(0, dim) }]} onPress={close} testID="level-up-overlay">
      <View style={styles.stage}>
        {/* Pixel sparks: three rings that step outward and blink. */}
        {frame >= 4 && frame <= 16 &&
          DIRS.flatMap(([dx, dy], i) =>
            [0, 1, 2].map((ring) => {
              const step = frame - 4 - ring * 2;
              if (step < 0 || (step + i) % 3 === 2) return null;
              const dist = HERO * 0.55 + step * 9;
              const size = ring === 0 ? 10 : 6;
              return (
                <View
                  key={`${i}-${ring}`}
                  style={[
                    styles.spark,
                    {
                      width: size,
                      height: size,
                      left: Math.round(dx * dist - size / 2),
                      top: Math.round(dy * dist - size / 2),
                      backgroundColor: ring === 1 ? colors.primary : colors.accent,
                    },
                  ]}
                />
              );
            }),
          )}

        {/* Hero in a square frame with a blinking aura. */}
        <View
          style={[
            styles.heroFrame,
            {
              borderColor: auraOn ? colors.accent : newRank ? rank.color : colors.primary,
              transform: [{ scale: heroScale }],
            },
          ]}
        >
          <PixelAvatar
            size={HERO}
            idleFrame={frame % 4 < 2 ? 0 : 1}
            skinColor={look.skinColor}
            hairColor={look.hairColor}
            eyeColor={look.eyeColor}
            hat={gear.hat?.item?.sprite_key}
            outfit={gear.outfit?.item?.sprite_key}
            accessory={gear.accessory?.item?.sprite_key}
          />
        </View>
      </View>

      <Text style={styles.title}>{typed || ' '}</Text>

      {/* Everything below keeps its place from the start, so the hero never moves. */}
      <View style={[styles.levelRow, { opacity: frame >= 8 ? 1 : 0 }]}>
          <Text style={styles.levelLabel}>{T.level_up_level}</Text>
          <View style={[styles.levelBox, frame === 10 && styles.levelBoxFlash]}>
            <Text style={styles.levelNumber}>{levelShown}</Text>
          </View>
      </View>

      {newRank && (
        <View style={[styles.rankBanner, { borderColor: rank.color, opacity: frame >= 14 ? 1 : 0 }]}>
          <Text style={[styles.rankText, { color: rank.color }]}>
            {T.level_up_new_rank.replace('{rank}', titleLabel(T, rank.name).toUpperCase())}
          </Text>
        </View>
      )}

      <Text style={[styles.subtitle, { opacity: frame >= 16 ? 1 : 0 }]}>{T.level_up_subtitle}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 5, 14, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    zIndex: 100,
  },
  stage: {
    width: HERO * 2.4,
    height: HERO * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spark: {
    position: 'absolute',
    marginLeft: HERO * 1.2,
    marginTop: HERO,
  },
  heroFrame: {
    borderWidth: 6,
    backgroundColor: colors.surface,
    padding: 6,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: pixelSize(fontSizes.xxl),
    color: colors.accent,
    letterSpacing: 3,
    textShadowColor: '#000',
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 0,
    minHeight: pixelSize(fontSizes.xxl) * 1.3,
  },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  levelLabel: { fontFamily: fonts.bold, fontSize: pixelSize(fontSizes.lg), color: colors.text, letterSpacing: 2 },
  levelBox: {
    minWidth: 64,
    paddingHorizontal: spacing.sm,
    borderWidth: 4,
    borderColor: colors.accent,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  levelBoxFlash: { backgroundColor: colors.accent },
  levelNumber: { fontFamily: fonts.bold, fontSize: pixelSize(fontSizes.xxl), color: colors.text },
  rankBanner: {
    borderWidth: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
  },
  rankText: { fontFamily: fonts.bold, fontSize: pixelSize(fontSizes.md), letterSpacing: 2 },
  subtitle: { fontSize: fontSizes.sm, color: colors.textSecondary },
});
