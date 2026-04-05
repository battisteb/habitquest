import { View, StyleSheet, Platform } from 'react-native';

// Pixel scale: each "pixel" is SCALE x SCALE real pixels
const SCALE = 4;
const GRID = 16; // 16x16 pixel grid
const SIZE = GRID * SCALE;

interface PixelAvatarProps {
  size?: number;
  skinColor?: string;
  hairColor?: string;
  eyeColor?: string;
  hat?: string;
  outfit?: string;
  accessory?: string;
  background?: string;
  idleFrame?: number;
}

// Format: [x, y, color_key]
type PixelData = [number, number, string][];

// ──────────────────────────────────────────
// Base body (16x16 grid)
// ──────────────────────────────────────────
const BODY_PIXELS: PixelData = [
  // Head (rows 2-7)
  [6, 2, 'skin'], [7, 2, 'skin'], [8, 2, 'skin'], [9, 2, 'skin'],
  [5, 3, 'skin'], [6, 3, 'skin'], [7, 3, 'skin'], [8, 3, 'skin'], [9, 3, 'skin'], [10, 3, 'skin'],
  [5, 4, 'skin'], [6, 4, 'eye'], [7, 4, 'skin'], [8, 4, 'skin'], [9, 4, 'eye'], [10, 4, 'skin'],
  [5, 5, 'skin'], [6, 5, 'skin'], [7, 5, 'skin'], [8, 5, 'skin'], [9, 5, 'skin'], [10, 5, 'skin'],
  [6, 6, 'skin'], [7, 6, 'mouth'], [8, 6, 'mouth'], [9, 6, 'skin'],
  [7, 7, 'skin'], [8, 7, 'skin'],
  // Body (rows 8-11)
  [6, 8, 'outfit'], [7, 8, 'outfit'], [8, 8, 'outfit'], [9, 8, 'outfit'],
  [5, 9, 'outfit'], [6, 9, 'outfit'], [7, 9, 'outfit'], [8, 9, 'outfit'], [9, 9, 'outfit'], [10, 9, 'outfit'],
  [5, 10, 'outfit'], [6, 10, 'outfit'], [7, 10, 'outfit'], [8, 10, 'outfit'], [9, 10, 'outfit'], [10, 10, 'outfit'],
  [5, 11, 'skin'], [6, 11, 'outfit'], [7, 11, 'outfit'], [8, 11, 'outfit'], [9, 11, 'outfit'], [10, 11, 'skin'],
  // Legs (rows 12-14)
  [6, 12, 'pants'], [7, 12, 'pants'], [8, 12, 'pants'], [9, 12, 'pants'],
  [6, 13, 'pants'], [7, 13, 'pants'], [8, 13, 'pants'], [9, 13, 'pants'],
  [5, 14, 'shoes'], [6, 14, 'shoes'], [9, 14, 'shoes'], [10, 14, 'shoes'],
];

// ──────────────────────────────────────────
// Hair (shown when no hat equipped)
// ──────────────────────────────────────────
const HAIR_PIXELS: Record<string, PixelData> = {
  default: [
    [6, 1, 'hair'], [7, 1, 'hair'], [8, 1, 'hair'], [9, 1, 'hair'],
    [5, 2, 'hair'], [10, 2, 'hair'],
    [4, 3, 'hair'], [4, 4, 'hair'],
  ],
};

// ──────────────────────────────────────────
// Hats
// ──────────────────────────────────────────
const HAT_SPRITES: Record<string, PixelData> = {
  hat_adventurer: [
    [5, 0, 'hat'], [6, 0, 'hat'], [7, 0, 'hat'], [8, 0, 'hat'], [9, 0, 'hat'], [10, 0, 'hat'],
    [6, 1, 'hat'], [7, 1, 'hat'], [8, 1, 'hat'], [9, 1, 'hat'],
  ],
  hat_knight: [
    [4, -1, 'hat'], [5, -1, 'hat'], [6, -1, 'hat'], [7, -1, 'hat'], [8, -1, 'hat'], [9, -1, 'hat'], [10, -1, 'hat'], [11, -1, 'hat'],
    [5, 0, 'hat'], [6, 0, 'hat_accent'], [7, 0, 'hat_accent'], [8, 0, 'hat_accent'], [9, 0, 'hat_accent'], [10, 0, 'hat'],
    [6, 1, 'hat'], [7, 1, 'hat'], [8, 1, 'hat'], [9, 1, 'hat'],
  ],
  hat_wizard: [
    [7, -3, 'hat_accent'], [8, -3, 'hat_accent'],
    [6, -2, 'hat'], [7, -2, 'hat'], [8, -2, 'hat'], [9, -2, 'hat'],
    [5, -1, 'hat'], [6, -1, 'hat'], [7, -1, 'hat'], [8, -1, 'hat'], [9, -1, 'hat'], [10, -1, 'hat'],
    [5, 0, 'hat'], [6, 0, 'hat'], [7, 0, 'hat'], [8, 0, 'hat'], [9, 0, 'hat'], [10, 0, 'hat'],
    [4, 1, 'hat'], [5, 1, 'hat'], [6, 1, 'hat'], [7, 1, 'hat'], [8, 1, 'hat'], [9, 1, 'hat'], [10, 1, 'hat'], [11, 1, 'hat'],
  ],
  hat_crown: [
    [5, -1, 'hat_accent'], [7, -1, 'hat_accent'], [9, -1, 'hat_accent'],
    [5, 0, 'hat'], [6, 0, 'hat'], [7, 0, 'hat'], [8, 0, 'hat'], [9, 0, 'hat'], [10, 0, 'hat'],
    [6, 1, 'hat'], [7, 1, 'hat'], [8, 1, 'hat'], [9, 1, 'hat'],
  ],
  hat_dragon: [
    [3, -1, 'hat_accent'], [4, 0, 'hat_accent'], [11, 0, 'hat_accent'], [12, -1, 'hat_accent'],
    [5, 0, 'hat'], [6, 0, 'hat'], [7, 0, 'hat'], [8, 0, 'hat'], [9, 0, 'hat'], [10, 0, 'hat'],
    [6, 1, 'hat'], [7, 1, 'hat'], [8, 1, 'hat'], [9, 1, 'hat'],
  ],
  hat_pirate: [
    [5, -1, 'hat'], [6, -1, 'hat'], [7, -1, 'hat'], [8, -1, 'hat'], [9, -1, 'hat'], [10, -1, 'hat'],
    [4, 0, 'hat'], [5, 0, 'hat'], [6, 0, 'hat'], [7, 0, 'hat'], [8, 0, 'hat'], [9, 0, 'hat'], [10, 0, 'hat'], [11, 0, 'hat'],
    [6, 1, 'hat'], [7, 1, 'hat_accent'], [8, 1, 'hat_accent'], [9, 1, 'hat'],
  ],
  hat_samurai: [
    [4, -2, 'hat_accent'], [11, -2, 'hat_accent'],
    [4, -1, 'hat'], [5, -1, 'hat'], [6, -1, 'hat'], [7, -1, 'hat'], [8, -1, 'hat'], [9, -1, 'hat'], [10, -1, 'hat'], [11, -1, 'hat'],
    [5, 0, 'hat'], [6, 0, 'hat_accent'], [7, 0, 'hat'], [8, 0, 'hat'], [9, 0, 'hat_accent'], [10, 0, 'hat'],
    [6, 1, 'hat'], [7, 1, 'hat'], [8, 1, 'hat'], [9, 1, 'hat'],
  ],
  hat_halo: [
    [5, -2, 'hat_accent'], [6, -2, 'hat_accent'], [7, -2, 'hat_accent'], [8, -2, 'hat_accent'], [9, -2, 'hat_accent'], [10, -2, 'hat_accent'],
    [4, -1, 'hat_accent'], [11, -1, 'hat_accent'],
    [5, -1, 'hat'], [10, -1, 'hat'],
  ],
  hat_viking: [
    [3, -1, 'hat_accent'], [12, -1, 'hat_accent'],
    [3, 0, 'hat_accent'], [12, 0, 'hat_accent'],
    [4, 0, 'hat'], [5, 0, 'hat'], [6, 0, 'hat'], [7, 0, 'hat'], [8, 0, 'hat'], [9, 0, 'hat'], [10, 0, 'hat'], [11, 0, 'hat'],
    [5, 1, 'hat'], [6, 1, 'hat'], [7, 1, 'hat'], [8, 1, 'hat'], [9, 1, 'hat'], [10, 1, 'hat'],
  ],
};

// Data-driven hat colors (replaces chained ternaries)
const HAT_COLORS: Record<string, { hat: string; hat_accent: string }> = {
  hat_adventurer: { hat: '#8B7355', hat_accent: '#A08B6B' },
  hat_knight:     { hat: '#708090', hat_accent: '#C0C0C0' },
  hat_wizard:     { hat: '#4B0082', hat_accent: '#E040FB' },
  hat_crown:      { hat: '#DAA520', hat_accent: '#FFD700' },
  hat_dragon:     { hat: '#8B0000', hat_accent: '#FF4500' },
  hat_pirate:     { hat: '#1a1a1a', hat_accent: '#F0E68C' },
  hat_samurai:    { hat: '#8B0000', hat_accent: '#C0C0C0' },
  hat_halo:       { hat: '#FFFACD', hat_accent: '#FFD700' },
  hat_viking:     { hat: '#8B7355', hat_accent: '#E0E0E0' },
};

// ──────────────────────────────────────────
// Accessories (rendered on top of body)
// ──────────────────────────────────────────
const ACCESSORY_SPRITES: Record<string, PixelData> = {
  acc_shield: [
    [2, 9, 'acc'], [2, 10, 'acc'], [2, 11, 'acc'],
    [3, 8, 'acc'], [3, 9, 'acc_accent'], [3, 10, 'acc_accent'], [3, 11, 'acc'], [3, 12, 'acc'],
    [4, 9, 'acc'], [4, 10, 'acc'], [4, 11, 'acc'],
  ],
  acc_sword: [
    [12, 6, 'acc_accent'], [12, 7, 'acc'],
    [11, 8, 'acc'], [12, 8, 'acc'],
    [11, 9, 'acc'], [11, 10, 'acc'], [11, 11, 'acc'],
    [11, 12, 'acc_accent'], [11, 13, 'acc_accent'],
  ],
  acc_cape: [
    [4, 8, 'acc'], [11, 8, 'acc'],
    [3, 9, 'acc'], [4, 9, 'acc'], [11, 9, 'acc'], [12, 9, 'acc'],
    [3, 10, 'acc'], [4, 10, 'acc_accent'], [11, 10, 'acc_accent'], [12, 10, 'acc'],
    [3, 11, 'acc'], [4, 11, 'acc'], [11, 11, 'acc'], [12, 11, 'acc'],
    [4, 12, 'acc'], [11, 12, 'acc'],
  ],
  acc_wings: [
    [2, 8, 'acc_accent'], [13, 8, 'acc_accent'],
    [1, 9, 'acc'], [2, 9, 'acc'], [3, 9, 'acc'], [12, 9, 'acc'], [13, 9, 'acc'], [14, 9, 'acc'],
    [1, 10, 'acc_accent'], [2, 10, 'acc'], [13, 10, 'acc'], [14, 10, 'acc_accent'],
    [2, 11, 'acc'], [13, 11, 'acc'],
  ],
  acc_scarf: [
    [5, 7, 'acc'], [6, 7, 'acc'], [7, 7, 'acc'], [8, 7, 'acc'], [9, 7, 'acc'], [10, 7, 'acc'],
    [10, 8, 'acc'], [11, 8, 'acc'],
    [11, 9, 'acc_accent'],
  ],
  acc_aura: [
    [4, 2, 'acc_accent'], [11, 2, 'acc_accent'],
    [3, 5, 'acc_accent'], [12, 5, 'acc_accent'],
    [3, 8, 'acc_accent'], [12, 8, 'acc_accent'],
    [4, 11, 'acc_accent'], [11, 11, 'acc_accent'],
    [5, 13, 'acc_accent'], [10, 13, 'acc_accent'],
  ],
};

const ACCESSORY_COLORS: Record<string, { acc: string; acc_accent: string }> = {
  acc_shield:  { acc: '#708090', acc_accent: '#B22222' },
  acc_sword:   { acc: '#C0C0C0', acc_accent: '#8B7355' },
  acc_cape:    { acc: '#8B0000', acc_accent: '#DAA520' },
  acc_wings:   { acc: '#E8E8E8', acc_accent: '#FFD700' },
  acc_scarf:   { acc: '#e94560', acc_accent: '#c73e54' },
  acc_aura:    { acc: '#7B68EE', acc_accent: '#E040FB55' },
};

// ──────────────────────────────────────────
// Outfits (color overrides for body)
// ──────────────────────────────────────────
const OUTFIT_COLORS: Record<string, { primary: string; secondary: string }> = {
  outfit_peasant:  { primary: '#8B7355', secondary: '#6B5B45' },
  outfit_leather:  { primary: '#8B4513', secondary: '#654321' },
  outfit_mage:     { primary: '#4B0082', secondary: '#6A0DAD' },
  outfit_golden:   { primary: '#DAA520', secondary: '#B8860B' },
  outfit_shadow:   { primary: '#1a1a2e', secondary: '#2d2d4e' },
  outfit_forest:   { primary: '#2d5a1e', secondary: '#1a3a10' },
  outfit_ice:      { primary: '#4FC3F7', secondary: '#0288D1' },
  outfit_crimson:  { primary: '#B71C1C', secondary: '#880E0E' },
  outfit_royal:    { primary: '#4A148C', secondary: '#7B1FA2' },
};

// ──────────────────────────────────────────
// Backgrounds
// ──────────────────────────────────────────
const BG_COLORS: Record<string, string[]> = {
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

// ──────────────────────────────────────────
// Default colors
// ──────────────────────────────────────────
const DEFAULT_COLORS = {
  skin: '#f4c98a',
  hair: '#4a3728',
  eye: '#1a1a2e',
  mouth: '#c47a5a',
  outfit: '#e94560',
  pants: '#2a4a6a',
  shoes: '#3a2a1a',
  hat: '#aaa',
  hat_accent: '#ddd',
  acc: '#888',
  acc_accent: '#bbb',
};

export function PixelAvatar({
  size = 200,
  skinColor = DEFAULT_COLORS.skin,
  hairColor = DEFAULT_COLORS.hair,
  eyeColor = DEFAULT_COLORS.eye,
  hat,
  outfit,
  accessory,
  background,
  idleFrame = 0,
}: PixelAvatarProps) {
  const scale = size / SIZE;
  const pixelSize = SCALE * scale;

  const hatColors = hat && HAT_COLORS[hat] ? HAT_COLORS[hat] : { hat: DEFAULT_COLORS.hat, hat_accent: DEFAULT_COLORS.hat_accent };
  const accColors = accessory && ACCESSORY_COLORS[accessory] ? ACCESSORY_COLORS[accessory] : { acc: DEFAULT_COLORS.acc, acc_accent: DEFAULT_COLORS.acc_accent };

  const colorMap: Record<string, string> = {
    skin: skinColor,
    hair: hairColor,
    eye: eyeColor,
    mouth: DEFAULT_COLORS.mouth,
    outfit: outfit && OUTFIT_COLORS[outfit] ? OUTFIT_COLORS[outfit].primary : DEFAULT_COLORS.outfit,
    pants: DEFAULT_COLORS.pants,
    shoes: DEFAULT_COLORS.shoes,
    hat: hatColors.hat,
    hat_accent: hatColors.hat_accent,
    acc: accColors.acc,
    acc_accent: accColors.acc_accent,
  };

  const bgColors = background && BG_COLORS[background] ? BG_COLORS[background] : BG_COLORS.default;

  // Idle bounce offset (in px)
  const bounceY = idleFrame % 2 === 0 ? 0 : -1 * scale;
  // Vertical offset to push body group down (equivalent to translateY: 2 * pixelSize)
  const groupOffsetY = 2 * pixelSize;

  function renderPixels(pixels: PixelData) {
    return pixels.map(([x, y, colorKey], i) => (
      <View
        key={i}
        style={{
          position: 'absolute',
          left: x * pixelSize,
          top: y * pixelSize + bounceY + groupOffsetY,
          width: pixelSize,
          height: pixelSize,
          backgroundColor: colorMap[colorKey] ?? colorKey,
        }}
      />
    ));
  }

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Background */}
      <View style={{ position: 'absolute', top: 0, left: 0, width: size, height: size, backgroundColor: bgColors[0] }} />
      <View style={{ position: 'absolute', top: size * 0.6, left: 0, width: size, height: size * 0.4, backgroundColor: bgColors[1] }} />

      {/* Accessory behind body (cape, wings, aura) */}
      {accessory && ACCESSORY_SPRITES[accessory] && renderPixels(ACCESSORY_SPRITES[accessory])}

      {/* Hair (behind head, hidden if hat) */}
      {!hat && renderPixels(HAIR_PIXELS.default)}

      {/* Body */}
      {renderPixels(BODY_PIXELS)}

      {/* Hat (on top of head) */}
      {hat && HAT_SPRITES[hat] && renderPixels(HAT_SPRITES[hat])}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#2a2a4a',
  },
});
