import { Text, StyleSheet } from 'react-native';
import { PixelFrame, shade } from '../../../ui/components/pixel-frame';
import { colors } from '../../../ui/theme/tokens';
import { getAvatarStage } from '../utils/avatar-evolution';

interface AvatarDisplayProps {
  level: number;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = { sm: 48, md: 80, lg: 120 } as const;
const FONT_SIZES = { sm: 24, md: 40, lg: 64 } as const;

/** Rank emblem in a stepped pixel frame of the rank color (no round aura: pixel direction). */
export function AvatarDisplay({ level, size = 'md' }: AvatarDisplayProps) {
  const stage = getAvatarStage(level);
  const dim = SIZES[size];
  return (
    <PixelFrame
      borderColor={stage.aura}
      backgroundColor={shade(colors.background, 0.8)}
      contentStyle={[styles.face, { width: dim, height: dim }]}
      testID="rank-emblem"
    >
      <Text style={[styles.emoji, { fontSize: FONT_SIZES[size] }]}>{stage.emoji}</Text>
    </PixelFrame>
  );
}

const styles = StyleSheet.create({
  face: { alignItems: 'center', justifyContent: 'center' },
  emoji: { textAlign: 'center' },
});
