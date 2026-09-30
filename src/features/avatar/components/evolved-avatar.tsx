import { View } from 'react-native';
import { PixelAvatar, type PixelAvatarProps } from '../renderer/pixel-avatar';

interface EvolvedAvatarProps extends PixelAvatarProps {
  /** Kept for callers; the rank now shows on the frame around the hero (HeroStage). */
  level: number;
}

/**
 * The hero in its square. The round aura (circle, glow, orbiting particles)
 * was removed at Battiste's request: it did not fit the pixel direction.
 */
export function EvolvedAvatar({ level: _level, size = 200, ...avatarProps }: EvolvedAvatarProps) {
  return (
    <View testID="evolved-avatar-root">
      <PixelAvatar size={size} {...avatarProps} />
    </View>
  );
}
