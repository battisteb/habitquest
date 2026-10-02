/**
 * The Premium companion: a small pixel dragon, 16×16, drawn as left halves
 * mirrored (front view, like the hero). `.` is transparent, `o` the outline;
 * the other letters come from the stage palette.
 */
export const COMPANION_GRID = 16;

function mirror(half: string[]): string[] {
  return half.map((row) => row + row.split('').reverse().join(''));
}

export type CompanionStage = 'egg' | 'hatchling' | 'young' | 'adult' | 'legend';

const ADULT = mirror([
  '.o......',
  'oho.....',
  'ohoooooo',
  '.ogggggg',
  'oggggggg',
  'oggweggg',
  'oggeeggg',
  'vogggggl',
  'vvoggglr',
  'vvvogggl',
  'vvvogGll',
  'vvvoggll',
  '.vvogGll',
  '..oGgggl',
  '..oGGggl',
  '..ooo.oo',
]);

export const COMPANION_SPRITES: Record<CompanionStage, string[]> = {
  egg: mirror([
    '........',
    '........',
    '......oo',
    '.....occ',
    '....occs',
    '....occc',
    '...occcc',
    '...ocscc',
    '...occcs',
    '...occcc',
    '...occcc',
    '....occc',
    '....oCcc',
    '.....oCC',
    '......oo',
    '........',
  ]),
  hatchling: mirror([
    '........',
    '........',
    '........',
    '......oo',
    '.....ogg',
    '....oggg',
    '....oweg',
    '....oeeg',
    '....oggl',
    '...ooclr',
    '...ococc',
    '...occcc',
    '...occsc',
    '....oCcc',
    '.....oCC',
    '......oo',
  ]),
  young: mirror([
    '........',
    '...o....',
    '..oho...',
    '..ohoooo',
    '...ogggg',
    '..oggggg',
    '..ogwegg',
    '..ogeegg',
    '..oggggl',
    '...ogglr',
    '..voggll',
    '.vvogGll',
    '.vvoggll',
    '..oGggll',
    '...oGGgl',
    '...oo.oo',
  ]),
  adult: ADULT,
  legend: ADULT,
};

const OUTLINE = '#1b1428';
const EGG = { c: '#f4ead2', C: '#c9b88c', s: '#6fbf73' };
const FACE = { r: '#e85d4a', w: '#ffffff', e: OUTLINE };

export const COMPANION_PALETTES: Record<CompanionStage, Record<string, string>> = {
  egg: { o: OUTLINE, ...EGG },
  hatchling: { o: OUTLINE, ...EGG, ...FACE, g: '#5cc46a', l: '#d9f29b' },
  young: { o: OUTLINE, ...FACE, g: '#5cc46a', G: '#2f8a45', l: '#d9f29b', h: '#f2c14e', v: '#7fd6a0' },
  adult: { o: OUTLINE, ...FACE, g: '#4fb35f', G: '#2a7a3e', l: '#d9f29b', h: '#f2c14e', v: '#3fa7a0' },
  legend: { o: OUTLINE, ...FACE, g: '#ffd34d', G: '#c9962a', l: '#fff3b0', h: '#ffffff', v: '#ffb347' },
};
