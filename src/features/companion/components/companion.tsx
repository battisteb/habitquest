import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { COMPANION_GRID, COMPANION_PALETTES, COMPANION_SPRITES, type CompanionStage } from '../sprites';

interface CompanionProps {
  stage: CompanionStage;
  size?: number;
  /** Free players see a locked egg that opens the Premium screen. */
  locked?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
}

/** Rows of `.`/letters → horizontal strips of one color, like the hero renderer. */
function strips(rows: string[], palette: Record<string, string>): [number, number, number, string][] {
  const out: [number, number, number, string][] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (ch === '.') {
        x++;
        continue;
      }
      let end = x + 1;
      while (end < row.length && row[end] === ch) end++;
      out.push([x, y, end - x, palette[ch] ?? '#ff00ff']);
      x = end;
    }
  });
  return out;
}

/** The pixel dragon that grows with the streak (Premium), with an idle bounce. */
export function Companion({ stage, size = 64, locked = false, onPress, accessibilityLabel }: CompanionProps) {
  const shown: CompanionStage = locked ? 'egg' : stage;
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setFrame((f) => (f + 1) % 4), 450);
    return () => clearInterval(id);
  }, []);

  const parts = useMemo(() => strips(COMPANION_SPRITES[shown], COMPANION_PALETTES[shown]), [shown]);
  const cell = size / COMPANION_GRID;
  const bounce = locked ? 0 : frame % 2 === 0 ? 0 : -cell;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[styles.box, { width: size, height: size }]}
      accessibilityRole={onPress ? 'button' : 'image'}
      accessibilityLabel={accessibilityLabel}
      testID="companion"
    >
      <View style={[StyleSheet.absoluteFill, locked && styles.locked]}>
        {parts.map(([x, y, w, color], i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: x * cell,
              top: y * cell + bounce,
              width: w * cell + 0.5,
              height: cell + 0.5,
              backgroundColor: color,
            }}
          />
        ))}
        {/* The legendary dragon twinkles. */}
        {shown === 'legend' && !locked && (
          <>
            <View style={[styles.spark, { left: cell, top: cell * (frame < 2 ? 2 : 4), width: cell, height: cell }]} />
            <View style={[styles.spark, { right: cell, top: cell * (frame < 2 ? 5 : 1), width: cell, height: cell }]} />
          </>
        )}
      </View>
      {locked && <Text style={[styles.lock, { fontSize: size * 0.28 }]}>🔒</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: { overflow: 'visible' },
  locked: { opacity: 0.55 },
  spark: { position: 'absolute', backgroundColor: '#ffffff' },
  lock: { position: 'absolute', right: -2, bottom: -2 },
});
