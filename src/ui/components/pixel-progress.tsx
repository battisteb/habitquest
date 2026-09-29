import { View, StyleSheet } from 'react-native';
import { colors } from '../theme/tokens';
import { PixelFrame, shade } from './pixel-frame';

interface PixelProgressProps {
  /** 0..1 */
  progress: number;
  color?: string;
  segments?: number;
  height?: number;
  testID?: string;
}

/** Number of lit segments; any progress lights at least one, only 1 lights all. */
export function litSegments(progress: number, segments: number): number {
  const p = Math.min(Math.max(progress, 0), 1);
  if (p === 0) return 0;
  if (p >= 1) return segments;
  return Math.min(segments - 1, Math.max(1, Math.round(p * segments)));
}

/** Segmented progress bar (XP, ranks): reads as a game gauge, not a web slider. */
export function PixelProgress({
  progress,
  color = colors.xp,
  segments = 20,
  height = 10,
  testID,
}: PixelProgressProps) {
  const lit = litSegments(progress, segments);
  return (
    <PixelFrame
      testID={testID}
      backgroundColor={shade(colors.background, 0.6)}
      contentStyle={styles.track}
    >
      {Array.from({ length: segments }, (_, i) => (
        <View
          key={i}
          style={[styles.segment, { height, backgroundColor: i < lit ? color : colors.surface }]}
        />
      ))}
    </PixelFrame>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', gap: 2, padding: 2 },
  segment: { flex: 1 },
});
