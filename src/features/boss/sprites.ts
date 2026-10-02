/**
 * Weekly bosses (I9): bad habits in monster form, 16×16, drawn as left
 * halves mirrored (front view, like the dragon). `.` is transparent, `k`
 * the outline; the other letters come from each boss palette.
 */
export const BOSS_GRID = 16;

export type BossKey = 'snooze_golem' | 'doomscroll_kraken' | 'couch_troll' | 'junk_goblin';

function mirror(half: string[]): string[] {
  return half.map((row) => row + row.split('').reverse().join(''));
}

const K = '#14142A';

export const BOSS_SPRITES: Record<BossKey, string[]> = {
  // A heavy stone golem, asleep (closed eyes, moss, a cracked alarm clock on its chest).
  snooze_golem: mirror([
    '........',
    '...kkkkk',
    '..kSssss',
    '..ksmmss',
    '..ksssss',
    '..kskkks',
    '..ksssss',
    'kkksSSss',
    'kSskssss',
    'kSsksskk',
    'kSsksky.'.replace('.', 'k'),
    'kkkksskw',
    '...kssss',
    '...kssks',
    '..kSSkkS',
    '..kkk..k',
  ]),
  // A purple kraken, glued to a glowing phone.
  doomscroll_kraken: mirror([
    '........',
    '....kkkk',
    '...kpppp',
    '..kppppp',
    '..kpwkpp',
    '..kpkkpp',
    '..kppppp',
    '..kpPppk',
    '...kpkkb',
    '..kpkkbl',
    '.kpkpkbl',
    'kpk.pkbl',
    'kpk.pkbb',
    '.kpk.kkk',
    '..kpk.kp',
    '...kk..k',
  ]),
  // A grumpy green troll sinking into a red sofa.
  couch_troll: mirror([
    '........',
    '........',
    '...kkkkk',
    '..kggggg',
    '.kggwkgg',
    '.kggkkgg',
    '.kgggggg',
    '..kgkkkk',
    'kkkkgggg',
    'krrkgggg',
    'krrrkggg',
    'krrrrrrr',
    'kRRRRRRR',
    'kRRRRRRR',
    'kk.k....',
    '........',
  ]),
  // A sneaky goblin holding a dripping burger.
  junk_goblin: mirror([
    '........',
    'k.......',
    'kk..kkkk',
    'kgk.kggg',
    '.kgkgggg',
    '..kggwkg',
    '..kggkkg',
    '..kggggg',
    '...kgkkk',
    '..kyyyyy',
    '.kbbbbbb',
    '.kllllll',
    '.kbbbbbb',
    '..kggggg',
    '..kgk..k',
    '..kk....',
  ]),
};

export const BOSS_PALETTES: Record<BossKey, Record<string, string>> = {
  snooze_golem: { k: K, s: '#8A8FA3', S: '#5C6178', m: '#6FBF73', y: '#FFD84A', w: '#FFFFFF' },
  doomscroll_kraken: { k: K, p: '#A060E8', P: '#6C3FB0', w: '#FFFFFF', b: '#2A2A40', l: '#6FE3FF' },
  couch_troll: { k: K, g: '#7FBF5A', w: '#FFFFFF', r: '#D9485A', R: '#9C2E3D' },
  junk_goblin: { k: K, g: '#A8D94A', w: '#FFFFFF', y: '#FFD84A', b: '#C9853A', l: '#5BBF4A' },
};
