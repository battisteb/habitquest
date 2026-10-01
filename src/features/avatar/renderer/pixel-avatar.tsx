import { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { GRID } from './sprites';
import { DEFAULTS, composeHero, toStrips } from './compose-hero';

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
  /** If provided, locks the bounce frame (use 0 for static previews). Otherwise auto-animates. */
  idleFrame?: number;
  /** Auto-bounce period in ms (default 700). Ignored when `idleFrame` is set. */
  idleIntervalMs?: number;
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
  bare = false,
}: PixelAvatarProps) {
  // Auto-animate when caller doesn't pin the frame. Static frame for previews.
  const [autoFrame, setAutoFrame] = useState(0);
  useEffect(() => {
    if (idleFrame !== undefined) return;
    const id = setInterval(() => setAutoFrame((f) => (f + 1) % 2), idleIntervalMs);
    return () => clearInterval(id);
  }, [idleFrame, idleIntervalMs]);
  const frame = idleFrame ?? autoFrame;

  const strips = useMemo(
    () => toStrips(composeHero({ skin: skinColor, hair: hairColor, eye: eyeColor, hat, outfit, accessory })),
    [skinColor, hairColor, eyeColor, hat, outfit, accessory],
  );

  const cell = size / GRID;
  // Idle bounce: the hero rises by one grid pixel every other frame.
  const bounceY = frame % 2 === 0 ? 0 : -cell;
  const bgColors = background && BG_COLORS[background] ? BG_COLORS[background] : BG_COLORS.default;

  return (
    <View style={[styles.container, bare && styles.bare, { width: size, height: size }]}>
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
            left: x * cell,
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
