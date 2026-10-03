import { useMemo } from 'react';
import { View } from 'react-native';
import { strips } from '../../companion/components/companion';
import type { Season } from '../../../lib/constants/game-config';
import { RUNE_GRID, RUNE_PALETTES, runeRows } from '../sprites';

/** A seasonal rune in pixel art; faded while not earned, so the goal shows. */
export function Rune({ season, size = 48, earned = true }: { season: Season; size?: number; earned?: boolean }) {
  const parts = useMemo(() => strips(runeRows(season), RUNE_PALETTES[season]), [season]);
  const cell = size / RUNE_GRID;
  return (
    <View style={{ width: size, height: size, opacity: earned ? 1 : 0.3 }} testID={`rune-${season}${earned ? '' : '-locked'}`}>
      {parts.map(([x, y, w, color], i) => (
        <View
          key={i}
          style={{ position: 'absolute', left: x * cell, top: y * cell, width: w * cell + 0.5, height: cell + 0.5, backgroundColor: color }}
        />
      ))}
    </View>
  );
}
