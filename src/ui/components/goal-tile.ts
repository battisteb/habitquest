import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { colors, fontSizes, fonts, pixelSize, spacing } from '../theme/tokens';
import { useTheme } from '../theme/theme-context';

/** Shared look of the three goal tiles (missions, arc, boss), rebuilt on theme change. */
function createTileStyles() {
  return StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderRadius: 0,
    padding: spacing.xs + 2,
    gap: 3,
    justifyContent: 'space-between',
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 20 },
  label: { flex: 1, fontFamily: fonts.bold, fontSize: pixelSize(9), letterSpacing: 0.5 },
  value: { color: colors.text, fontFamily: fonts.bold, fontSize: pixelSize(fontSizes.sm) },
});
}

export function useTileStyles() {
  const { themeKey } = useTheme();
  return useMemo(createTileStyles, [themeKey]);
}
