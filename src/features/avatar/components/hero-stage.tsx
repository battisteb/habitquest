import { useState, type ReactNode } from 'react';
import { View, StyleSheet, type LayoutChangeEvent } from 'react-native';
import { PixelFrame } from '../../../ui/components/pixel-frame';
import { useTheme } from '../../../ui/theme/theme-context';
import type { ThemeKey } from '../../../ui/theme/themes';
import { PixelAvatar, BG_COLORS, type PixelAvatarProps } from '../renderer/pixel-avatar';
import { getAvatarStage } from '../utils/avatar-evolution';
import { heroScene, SCENE_ROWS } from '../utils/hero-scene';

interface HeroStageProps extends Omit<PixelAvatarProps, 'bare'> {
  level: number;
  /** Height of the hero; the stage is as tall, and as wide as its parent. */
  size?: number;
  /** Scene of this theme instead of the current one (shop previews). */
  theme?: ThemeKey;
  /** Drawn on the ground next to the hero (the Premium companion). */
  companion?: ReactNode;
}

/**
 * The hero standing in a pixel scene that fills the width: the scene follows
 * the theme (or the background bought in the shop), the frame takes the
 * rank color.
 */
export function HeroStage({ level, size = 180, background, theme, companion, ...avatarProps }: HeroStageProps) {
  const current = useTheme().themeKey;
  const themeKey = theme ?? current;
  const [width, setWidth] = useState(0);
  const height = size + 24;
  const cell = height / SCENE_ROWS;
  const cols = Math.ceil(width / cell);
  const sceneBg = background ? BG_COLORS[background] : undefined;

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <PixelFrame borderColor={getAvatarStage(level).aura} style={styles.frame} testID="hero-stage">
      <View style={[styles.scene, { height }]} onLayout={onLayout}>
        {width > 0 &&
          heroScene(themeKey, cols, sceneBg).map(([x, y, w, h, color], i) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: x * cell,
                top: y * cell,
                width: w * cell + 0.5,
                height: h * cell + 0.5,
                backgroundColor: color,
              }}
            />
          ))}
        <View style={styles.hero}>
          <PixelAvatar size={size} bare {...avatarProps} />
        </View>
        {companion && <View style={[styles.companion, { marginLeft: size * 0.42 }]}>{companion}</View>}
      </View>
    </PixelFrame>
  );
}

const styles = StyleSheet.create({
  frame: { alignSelf: 'stretch' },
  scene: { overflow: 'hidden', justifyContent: 'flex-end', alignItems: 'center' },
  hero: { marginBottom: 8 },
  companion: { position: 'absolute', bottom: 8, left: '50%' },
});
