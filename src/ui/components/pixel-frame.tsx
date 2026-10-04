import type { ReactNode } from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { colors, PIXEL } from '../theme/tokens';

interface PixelFrameProps {
  children?: ReactNode;
  /** Border color (defaults to the theme border). */
  borderColor?: string;
  /** Hard shadow under the frame (defaults to a darker border). */
  ledgeColor?: string;
  backgroundColor?: string;
  /** Pressed: the frame drops by one pixel and its ledge disappears. */
  pressed?: boolean;
  /** Without ledge (flat elements such as inputs or banners). */
  flat?: boolean;
  step?: number;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Darkens a #rrggbb color; other formats are returned unchanged. */
/** `hex` moved towards `other` by t (0 = hex, 1 = other), e.g. a pale tint on light themes. */
export function mix(hex: string, other: string, t: number): string {
  const rgb = (h: string) => {
    const n = parseInt(h.slice(1), 16);
    return [16, 8, 0].map((s) => (n >> s) & 0xff);
  };
  if (!/^#[0-9a-f]{6}$/i.test(hex) || !/^#[0-9a-f]{6}$/i.test(other)) return hex;
  const a = rgb(hex);
  const b = rgb(other);
  return `#${a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}

export function shade(hex: string, factor = 0.55): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const ch = (shift: number) => Math.round(((n >> shift) & 0xff) * factor);
  return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Stepped-corner pixel frame with a hard ledge underneath: the signature shape
 * of the pixel art direction (docs/adr/011-pixel-art-direction.md). Corners are
 * "cut" by leaving the border pixels out of them, like retro game dialog boxes.
 * The total height never changes when pressed, so lists do not jump.
 */
export function PixelFrame({
  children,
  borderColor = colors.border,
  ledgeColor,
  backgroundColor,
  pressed = false,
  flat = false,
  step = PIXEL,
  style,
  contentStyle,
  testID,
}: PixelFrameProps) {
  const s = step;
  const ledge = flat ? 0 : s;
  const drop = pressed ? ledge : 0;
  const bottomGap = ledge - drop;
  return (
    <View
      testID={testID}
      style={[{ paddingHorizontal: s, paddingTop: s + drop, paddingBottom: s + bottomGap }, style]}
    >
      <View style={[styles.abs, { top: drop, left: s, right: s, height: s, backgroundColor: borderColor }]} />
      <View style={[styles.abs, { top: s + drop, bottom: s + bottomGap, left: 0, width: s, backgroundColor: borderColor }]} />
      <View style={[styles.abs, { top: s + drop, bottom: s + bottomGap, right: 0, width: s, backgroundColor: borderColor }]} />
      <View style={[styles.abs, { bottom: bottomGap, left: s, right: s, height: s, backgroundColor: borderColor }]} />
      {bottomGap > 0 && (
        <View style={[styles.abs, { bottom: 0, left: s, right: s, height: bottomGap, backgroundColor: ledgeColor ?? shade(borderColor) }]} />
      )}
      <View style={[backgroundColor ? { backgroundColor } : null, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
});
