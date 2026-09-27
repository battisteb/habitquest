import type { ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { colors } from '../theme/tokens';

/** Widest the app gets on web before it is centered as a phone-like column. */
export const MAX_APP_WIDTH = 520;

/**
 * The UI is designed for phones. On web (desktop, tablets) it is centered in a
 * column instead of stretching across the whole window. Native is untouched.
 */
export function ResponsiveFrame({ children }: { children: ReactNode }) {
  if (Platform.OS !== 'web') return <>{children}</>;

  return (
    <View style={[styles.outer, { backgroundColor: colors.background }]}>
      <View style={styles.column}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    alignItems: 'center',
  },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_APP_WIDTH,
    overflow: 'hidden',
  },
});
