import { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { use$ } from '@legendapp/state/react';
import { GRID } from './sprites';
import { DEFAULTS, toStrips } from './compose-hero';
import { poseHero, type HeroPose } from './poses';
import { IDLE_LOOP, REACTIONS, type HeroFrame } from '../utils/hero-animation';
import { heroReaction$ } from '../stores/hero-reaction-store';

export { composeHero, toStrips, tint, type HeroLook } from './compose-hero';

export interface PixelAvatarProps {
  size?: number;
  skinColor?: string;
  hairColor?: string;
  eyeColor?: string;
  hat?: string;
  outfit?: string;
  accessory?: string;
  background?: string;
  /** If provided, the hero stays still (use 0 for static previews). Otherwise it breathes. */
  idleFrame?: number;
  /** Pace of the breathing in ms per image (default 700). Ignored when `idleFrame` is set. */
  idleIntervalMs?: number;
  /** A still pose instead of the breathing loop (e.g. 'rest' on a rest day). */
  pose?: HeroPose;
  /** Plays the hero's reactions to game events (quest done, boss hit, boss defeated). */
  reactive?: boolean;
  /** Hero only, without its square and background: for scenes such as HeroStage. */
  bare?: boolean;
}

// ──────────────────────────────────────────
// Backgrounds (shop "décors")
// ──────────────────────────────────────────
export const BG_COLORS: Record<string, string[]> = {
  bg_forest:    ['#2d5a1e', '#1a3a10'],
  bg_castle:    ['#4a4a5a', '#3a3a4a'],
  bg_volcano:   ['#5a1a0a', '#3a0a00'],
  bg_starfield: ['#0a0a2e', '#050520'],
  bg_ocean:     ['#0077B6', '#023E8A'],
  bg_sunset:    ['#FF6B35', '#C62828'],
  bg_ice:       ['#B3E5FC', '#4FC3F7'],
  bg_neon:      ['#1a0033', '#4a0066'],
  default:      ['#1a1a2e', '#16213e'],
};

export function PixelAvatar({
  size = 200,
  skinColor = DEFAULTS.skin,
  hairColor = DEFAULTS.hair,
  eyeColor = DEFAULTS.eye,
  hat,
  outfit,
  accessory,
  background,
  idleFrame,
  idleIntervalMs = 700,
  pose,
  reactive = false,
  bare = false,
}: PixelAvatarProps) {
  const frame = useHeroFrame({ still: idleFrame !== undefined || !!pose, pose, idleIntervalMs, reactive });

  const strips = useMemo(
    () => toStrips(poseHero({ skin: skinColor, hair: hairColor, eye: eyeColor, hat, outfit, accessory }, frame.pose)),
    [skinColor, hairColor, eyeColor, hat, outfit, accessory, frame.pose],
  );

  const cell = size / GRID;
  const shiftX = (frame.dx ?? 0) * cell;
  const bounceY = (frame.dy ?? 0) * cell;
  const bgColors = background && BG_COLORS[background] ? BG_COLORS[background] : BG_COLORS.default;

  return (
    <View style={[styles.container, bare && styles.bare, { width: size, height: size }]} testID={`hero-pose-${frame.pose}`}>
      {!bare && (
        <>
          <View style={{ position: 'absolute', top: 0, left: 0, width: size, height: size, backgroundColor: bgColors[0] }} />
          <View style={{ position: 'absolute', top: size * 0.6, left: 0, width: size, height: size * 0.4, backgroundColor: bgColors[1] }} />
        </>
      )}
      {strips.map(([x, y, w, color], i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: x * cell + shiftX,
            top: y * cell + bounceY,
            // +0.5 hides hairline gaps between strips at fractional sizes.
            width: w * cell + 0.5,
            height: cell + 0.5,
            backgroundColor: color,
          }}
        />
      ))}
    </View>
  );
}

/**
 * The image to show: the still pose, or the breathing loop; a reaction (when `reactive`) plays its
 * sequence once, then the hero goes back to its rest.
 */
function useHeroFrame({ still, pose, idleIntervalMs, reactive }: { still: boolean; pose?: HeroPose; idleIntervalMs: number; reactive: boolean }): HeroFrame {
  const rest: HeroFrame = { pose: pose ?? 'idle', ms: 0 };
  const [loopIndex, setLoopIndex] = useState(0);
  const [played, setPlayed] = useState<HeroFrame | null>(null);
  const reactionId = use$(heroReaction$.id);
  const seenId = useRef(reactionId);

  useEffect(() => {
    if (still) return;
    const id = setInterval(() => setLoopIndex((i) => (i + 1) % IDLE_LOOP.length), idleIntervalMs);
    return () => clearInterval(id);
  }, [still, idleIntervalMs]);

  useEffect(() => {
    if (!reactive || reactionId === seenId.current) return;
    seenId.current = reactionId;
    const reaction = heroReaction$.reaction.get();
    if (!reaction) return;
    const frames = REACTIONS[reaction];
    const timers: ReturnType<typeof setTimeout>[] = [];
    let t = 0;
    frames.forEach((f) => {
      timers.push(setTimeout(() => setPlayed(f), t));
      t += f.ms;
    });
    timers.push(setTimeout(() => setPlayed(null), t));
    return () => timers.forEach(clearTimeout);
  }, [reactive, reactionId]);

  if (played) return played;
  return still ? rest : IDLE_LOOP[loopIndex];
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 0,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#2a2a4a',
  },
  bare: {
    borderWidth: 0,
    overflow: 'visible',
  },
});
